"""Real HTTP demonstration: mutate only Cedar, then acquire its source records in Veriq."""

import argparse
import json
from pathlib import Path
from uuid import uuid4

import httpx

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cedar", default="http://127.0.0.1:8101")
    parser.add_argument("--veriq", default="http://127.0.0.1:8100")
    parser.add_argument("--export-examples", action="store_true")
    args = parser.parse_args()
    config = json.loads((ROOT / "var/runtime.json").read_text())
    tokens = config["tokens"]
    client = httpx.Client(timeout=60, trust_env=False)

    def request(app, method, path, token, payload=None, allowed=(200, 201)):
        response = client.request(
            method,
            getattr(args, app) + path,
            headers={"Authorization": "Bearer " + tokens[token]},
            json=payload,
        )
        if response.status_code not in allowed:
            raise RuntimeError(f"{method} {path}: {response.status_code} {response.text}")
        return response.json()

    def pull_all():
        return [
            request("veriq", "POST", f"/v1/connectors/{source['source_id']}/pull", "veriq_admin")
            for source in config["sources"]
        ]

    for app in ("cedar", "veriq"):
        client.get(getattr(args, app) + "/ready").raise_for_status()
    request("cedar", "POST", "/v1/simulator/seed", "cedar_simulator")
    for source in config["sources"]:
        request("veriq", "POST", "/v1/sources", "veriq_admin", source, allowed=(201, 409))
    request(
        "cedar",
        "POST",
        "/v1/simulator/conditions",
        "cedar_simulator",
        {"gateway_id": "G1", "timeout": True},
    )
    txids = []
    for i in range(12):
        tx = request(
            "cedar",
            "POST",
            "/v1/transfers",
            "customer1",
            {
                "account_id": "A1",
                "amount_minor": 10000,
                "route_id": "R1",
                "idempotency_key": str(uuid4()),
            },
        )
        txids.append(tx["data"]["transaction_id"])
    for txid, channel in zip(txids, ["in_app", "email", "contact_centre", "branch"]):
        request(
            "cedar",
            "POST",
            "/v1/interactions",
            "customer1",
            {
                "customer_id": "C1",
                "channel": channel,
                "transaction_id": txid,
                "text": "My transfer failed; recipient has not received it",
            },
        )
    pull_results = pull_all()
    investigations = request("veriq", "GET", "/v1/investigations", "veriq_admin")
    interactions = request("veriq", "GET", "/v1/interactions", "veriq_admin")
    interaction_ids = {i["id"] for i in interactions if i["data"]["transaction_id"] == txids[0]}
    investigation = next(i for i in investigations if i["data"]["trigger_id"] in interaction_ids)
    path = f"/v1/investigations/{investigation['id']}/workspace"
    before = request("veriq", "GET", path, "veriq_admin")
    assert before["revisions"][-1]["data"]["correlations"], (
        "Expected matching route/time/source evidence"
    )
    assert any("pending" in u for u in before["revisions"][-1]["data"]["unknowns"])
    ai_result = request(
        "veriq", "POST", f"/v1/investigations/{investigation['id']}/analyze", "veriq_admin"
    )
    request(
        "cedar",
        "POST",
        f"/v1/transactions/{txids[0]}/reconcile",
        "cedar_operator",
        {
            "outcome": "completed",
            "beneficiary_verified": False,
            "rationale": "Synthetic Cedar status verification completed",
        },
    )
    pull_all()
    after = request("veriq", "GET", path, "veriq_admin")
    assert after["revisions"][0] == before["revisions"][0]
    assert any(f["kind"] == "contradiction" for f in after["revisions"][-1]["data"]["findings"])
    # A Veriq token has no banking authority at the independent Cedar boundary.
    assert (
        client.get(
            args.cedar + "/v1/accounts",
            headers={"Authorization": "Bearer " + tokens["veriq_admin"]},
        ).status_code
        == 401
    )
    summary = {
        "synthetic": True,
        "transport": "real HTTP between independent processes",
        "generated_transfers": len(txids),
        "generated_interactions": 4,
        "initial_pull": pull_results,
        "investigation_id": investigation["id"],
        "revision_before": before["investigation"]["data"]["revision"],
        "revision_after": after["investigation"]["data"]["revision"],
        "ai_run_state": ai_result["data"]["state"],
        "status_reconciliation_verified": True,
        "application_credential_isolation_verified": True,
    }
    (ROOT / "var/demo-result.json").write_text(json.dumps(summary, indent=2) + "\n")
    if args.export_examples:
        paths = {
            "sources": "/v1/sources",
            "context": "/v1/knowledge/context",
            "interactions": "/v1/interactions",
            "issues": "/v1/issues",
            "observations": "/v1/observations",
            "incidents": "/v1/incidents",
            "inference-status": "/v1/inference/status",
        }
        for name, endpoint in paths.items():
            data = request("veriq", "GET", endpoint, "veriq_admin")
            (ROOT / "contracts/examples" / f"{name}.synthetic.json").write_text(
                json.dumps(data, indent=2) + "\n"
            )
        for name, data in (
            ("workspace", after),
            ("demo-result", summary),
            ("inference-run", ai_result),
        ):
            (ROOT / "contracts/examples" / f"{name}.synthetic.json").write_text(
                json.dumps(data, indent=2) + "\n"
            )
        for name, endpoint in (
            ("cedar-transactions", "/v1/transactions"),
            ("cedar-interactions", "/v1/interactions"),
            ("cedar-accounts", "/v1/accounts"),
        ):
            data = request("cedar", "GET", endpoint, "cedar_operator")
            (ROOT / "contracts/examples" / f"{name}.synthetic.json").write_text(
                json.dumps(data, indent=2) + "\n"
            )
    print(json.dumps(summary, indent=2))
    client.close()


if __name__ == "__main__":
    main()
