"""Actual HTTP workflow with three mandatory live AI tasks; never fakes completion."""

import argparse
import json
import time
from pathlib import Path
from uuid import uuid4

import httpx

from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cedar", default="http://127.0.0.1:8101")
    parser.add_argument("--veriq", default="http://127.0.0.1:8100")
    parser.add_argument(
        "--output", type=Path, default=ROOT / "docs/implementation/ticket002/http-transcript.json"
    )
    args = parser.parse_args()
    runtime = json.loads((ROOT / "var/runtime.json").read_text())
    tokens = runtime["tokens"]
    examples = ROOT / "contracts/examples-v0.2.0"
    examples.mkdir(exist_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    transcript = {
        "synthetic": True,
        "transport": "actual_http",
        "started_at": now(),
        "completed": False,
        "requests": [],
    }
    client = httpx.Client(timeout=300, trust_env=False)

    def save():
        args.output.write_text(json.dumps(transcript, indent=2) + "\n")

    def request(app, method, path, token, payload=None, allowed=(200, 201)):
        started = time.monotonic()
        response = client.request(
            method,
            getattr(args, app) + path,
            headers={"Authorization": "Bearer " + tokens[token]},
            json=payload,
        )
        data = response.json()
        transcript["requests"].append(
            {
                "application": app,
                "method": method,
                "path": path,
                "status": response.status_code,
                "elapsed_seconds": round(time.monotonic() - started, 3),
                "response": data,
            }
        )
        save()
        print(app, method, path, response.status_code, flush=True)
        if response.status_code not in allowed:
            raise RuntimeError(f"{app} {path} returned {response.status_code}")
        return data

    def fixture(name, value):
        (examples / f"{name}.synthetic.json").write_text(json.dumps(value, indent=2) + "\n")

    def pull(source):
        while request("veriq", "POST", f"/v1/connectors/{source}/pull", "veriq_admin")["received"]:
            pass

    def require_live(run):
        if (
            run["data"]["state"] != "validated_candidate"
            or run["data"].get("inference_metadata", {}).get("transport") != "http"
        ):
            raise RuntimeError(
                "A real validated HTTP model result is required: " + run["data"]["state"]
            )
        return run

    try:
        for app, token in (("cedar", "cedar_operator"), ("veriq", "veriq_admin")):
            health = request(app, "GET", "/ready", token)
            assert health["version"] == "0.2.0", (
                "Run updated backends before Ticket 002 verification"
            )
        request("cedar", "POST", "/v1/simulator/seed", "cedar_simulator")
        for source in runtime["sources"]:
            request("veriq", "POST", "/v1/sources", "veriq_admin", source, allowed=(201, 409))
        stamp = now()
        document = request(
            "cedar",
            "POST",
            "/v1/institutional/documents",
            "cedar_operator",
            {
                "text": f"Synthetic authorized inventory effective {stamp}: Route AIR1 named AI test route uses gateway AIG1 named AI test gateway."
            },
        )
        request(
            "cedar",
            "POST",
            "/v1/simulator/conditions",
            "cedar_simulator",
            {"gateway_id": "G1", "timeout": True},
        )
        transactions = []
        for _ in range(10):
            transactions.append(
                request(
                    "cedar",
                    "POST",
                    "/v1/transfers",
                    "customer1",
                    {
                        "account_id": "A1",
                        "amount_minor": 1000,
                        "route_id": "R1",
                        "idempotency_key": str(uuid4()),
                    },
                )
            )
        txids = [t["data"]["transaction_id"] for t in transactions]
        native_ids = ["N-" + uuid4().hex for _ in range(4)]
        channel_inputs = [
            (
                "/v1/channels/in-app/messages",
                {
                    "message_id": native_ids[0],
                    "customer_id": "C1",
                    "message": "My transfer failed; the recipient has not received it",
                    "transaction_id": txids[0],
                    "sent_at": now(),
                },
            ),
            (
                "/v1/channels/email/messages",
                {
                    "message_id": native_ids[1],
                    "customer_id": "C1",
                    "subject": "Transfer delayed",
                    "body": "My transfer is pending",
                    "transaction_reference": txids[1],
                    "sent_at": now(),
                },
            ),
            (
                "/v1/channels/contact-centre/transcripts",
                {
                    "call_id": native_ids[2],
                    "customer_id": "C1",
                    "transcript": "Customer reports delayed transfer",
                    "transaction_reference": txids[2],
                    "started_at": now(),
                },
            ),
            (
                "/v1/channels/branch/visits",
                {
                    "visit_id": native_ids[3],
                    "customer_id": "C1",
                    "notes": "Customer reports a pending transfer",
                    "transaction_reference": txids[3],
                    "recorded_at": now(),
                },
            ),
        ]
        for index, (path, payload) in enumerate(channel_inputs):
            request("cedar", "POST", path, "customer1" if index == 0 else "cedar_operator", payload)
        for source in runtime["sources"]:
            pull(source["source_id"])
        evidence = request("veriq", "GET", "/v1/evidence?limit=500", "veriq_admin")
        doc_evidence = next(
            e
            for e in evidence
            if e["data"]["source_id"] == "cedar-documents"
            and e["data"]["native_record_id"] == document["id"]
        )
        extraction = require_live(
            request("veriq", "POST", f"/v1/inference/evidence/{doc_evidence['id']}", "veriq_admin")
        )
        expected = [("AIR1", "uses_gateway", "AIG1")]
        assert [
            (e["subject"], e["predicate"], e["object"])
            for e in extraction["data"]["result"]["relationships"]
        ] == expected
        assertion_id = extraction["data"]["assertion_id"]
        before_context = request("veriq", "GET", "/v1/knowledge/context", "veriq_admin")
        assert all(
            assertion_id not in edge["assertion_ids"] for edge in before_context["relationships"]
        )
        # Only this new assertion is being accepted; existing earlier fixture claims may already exist.
        reviews = request("veriq", "GET", "/v1/knowledge/reviews?limit=500", "veriq_admin")
        assert (
            next(r for r in reviews if r["data"]["assertion_id"] == assertion_id)["data"][
                "decision"
            ]
            == "candidate"
        )
        request(
            "veriq",
            "POST",
            f"/v1/knowledge/assertions/{assertion_id}/review",
            "veriq_admin",
            {
                "decision": "accepted",
                "rationale": "Authorized synthetic fixture reviewer checked exact AIR1->AIG1 source claim",
            },
        )
        after_context = request("veriq", "GET", "/v1/knowledge/context", "veriq_admin")
        assert any(
            e["subject"] == "AIR1" and e["object"] == "AIG1" for e in after_context["relationships"]
        )
        interactions = request("veriq", "GET", "/v1/interactions?limit=500", "veriq_admin")
        interaction = next(
            i for i in interactions if i["data"]["source_native_record_id"] == native_ids[0]
        )
        interpretation = require_live(
            request(
                "veriq",
                "POST",
                f"/v1/inference/evidence/{interaction['data']['evidence_id']}",
                "veriq_admin",
            )
        )
        transcript["interpretation_quality"] = {
            "expected_category": "reported_failure",
            "actual_category": interpretation["data"]["result"]["category"],
            "category_correct": interpretation["data"]["result"]["category"] == "reported_failure",
            "original_deterministic_category": interaction["data"]["category"],
            "interpretation_is_candidate": True,
        }
        # The workflow verifies lineage/authority even when the model is wrong;
        # quality remains a separate, explicitly reported gate.
        save()
        queue = request("veriq", "GET", "/v1/investigations?limit=500", "veriq_admin")
        investigation = next(i for i in queue if i["data"]["trigger_id"] == interaction["id"])
        workspace_path = f"/v1/investigations/{investigation['id']}/workspace"
        before = request("veriq", "GET", workspace_path, "veriq_admin")
        assert before["revisions"][-1]["data"]["correlations"]
        bank_before = request("cedar", "GET", "/v1/transactions", "cedar_operator")
        analysis = require_live(
            request(
                "veriq", "POST", f"/v1/investigations/{investigation['id']}/analyze", "veriq_admin"
            )
        )
        assert request("cedar", "GET", "/v1/transactions", "cedar_operator") == bank_before
        assert analysis["data"]["revision_id"] == before["revisions"][-1]["id"]
        request(
            "veriq",
            "POST",
            f"/v1/investigations/{investigation['id']}/review",
            "veriq_admin",
            {
                "rationale": "Synthetic authorized review of evidence and model candidate; no financial action authorized"
            },
        )
        request(
            "cedar",
            "POST",
            f"/v1/transactions/{txids[0]}/reconcile",
            "cedar_operator",
            {
                "outcome": "completed",
                "beneficiary_verified": False,
                "rationale": "Authorized Cedar synthetic status verification; independent of AI",
            },
        )
        pull("cedar-status")
        after = request("veriq", "GET", workspace_path, "veriq_admin")
        assert after["revisions"][0] == before["revisions"][0]
        assert after["investigation"]["data"]["review_required"] is True
        assert any(f["kind"] == "contradiction" for f in after["revisions"][-1]["data"]["findings"])
        request("cedar", "GET", "/v1/accounts", "veriq_admin", allowed=(401,))
        channel_status = request("cedar", "GET", "/v1/channels", "cedar_operator")
        connector_status = request("veriq", "GET", "/v1/connectors", "veriq_admin")
        assert (
            len(
                {
                    i["data"]["source_id"]
                    for i in interactions
                    if i["data"].get("source_native_record_id") in native_ids
                }
            )
            == 4
        )
        for name, value in (
            ("extraction-run", extraction),
            ("interpretation-run", interpretation),
            ("analysis-run", analysis),
            ("workspace", after),
            ("channel-status", channel_status),
            ("connectors", connector_status),
            ("knowledge-context", after_context),
        ):
            fixture(name, value)
        for name, endpoint in (
            ("interactions", "/v1/interactions?limit=500"),
            ("incidents", "/v1/incidents"),
            ("issues", "/v1/issues"),
            ("inference-status", "/v1/inference/status"),
        ):
            fixture(name, request("veriq", "GET", endpoint, "veriq_admin"))
        transcript.update(
            completed=True,
            finished_at=now(),
            model=analysis["data"]["model"],
            live_task_runs={
                "extraction": extraction["id"],
                "interpretation": interpretation["id"],
                "analysis": analysis["id"],
            },
            channel_provenance_verified=True,
            candidate_review_verified=True,
            financial_authority_isolation_verified=True,
            historical_revision_preserved=True,
            application_credentials_isolated=True,
        )
        save()
        print(json.dumps({k: v for k, v in transcript.items() if k != "requests"}, indent=2))
    except Exception as exc:
        transcript.update(error=str(exc), error_type=type(exc).__name__)
        save()
        raise
    finally:
        client.close()


if __name__ == "__main__":
    main()
