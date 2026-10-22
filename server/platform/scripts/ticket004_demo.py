"""Actual Cedar -> approved polling -> PostgreSQL -> automatic worker demonstration.

No direct Veriq evidence/results writes and no manual AI requests. Use a fresh,
isolated veriq-ticket004* Compose project. Model failures remain actual outcomes.
"""

import argparse
import json
import subprocess
import time
from pathlib import Path
from uuid import uuid4

import httpx

from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def execute(
    cedar="http://127.0.0.1:8401",
    veriq="http://127.0.0.1:8400",
    project="veriq-ticket004",
    output=None,
):
    if not project.startswith("veriq-ticket004"):
        raise ValueError("Demonstration controls only an explicitly isolated Ticket 004 project")
    output = output or ROOT / "var/reports/ticket004/http-transcript.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    runtime = json.loads((ROOT / "var/runtime.json").read_text())
    tokens = runtime["tokens"]
    client = httpx.Client(timeout=20, trust_env=False)
    result = {
        "synthetic": True,
        "transport": "actual_http",
        "project": project,
        "started_at": now(),
        "completed": False,
        "requests": [],
        "checks": {},
        "runtime_actions": [],
    }

    def save():
        output.write_text(json.dumps(result, indent=2) + "\n")

    def request(app, method, path, token=None, payload=None, allowed=(200, 201)):
        started = time.monotonic()
        response = client.request(
            method,
            (cedar if app == "cedar" else veriq) + path,
            headers={
                "Authorization": "Bearer "
                + tokens[token or ("cedar_operator" if app == "cedar" else "veriq_admin")]
            },
            json=payload,
        )
        data = response.json()
        result["requests"].append(
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
        if response.status_code not in allowed:
            raise RuntimeError(f"{app} {path}: HTTP {response.status_code}, {str(data)[:200]}")
        return data

    def wait(label, function, seconds=180):
        deadline = time.monotonic() + seconds
        while True:
            try:
                value = function()
            except httpx.TransportError:
                value = None
            if value:
                print(label, "verified", flush=True)
                return value
            if time.monotonic() >= deadline:
                raise RuntimeError("Timed out: " + label)
            time.sleep(1)

    def control(action, service):
        name = project + "_" + service + "_1"
        subprocess.run(
            ["podman", action, name],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=40,
        )
        result["runtime_actions"].append({"action": action, "service": service, "at": now()})
        save()

    def financial():
        return {
            name: request("cedar", "GET", "/v1/" + name) for name in ("accounts", "transactions")
        }

    def completed_processing():
        tasks = request("veriq", "GET", "/v1/inference/tasks?limit=500")
        intents = request("veriq", "GET", "/v1/processing/intents?limit=500")
        return (
            tasks
            if tasks
            and not any(t["data"]["state"] in {"queued", "running", "retryable"} for t in tasks)
            and not any(i["data"]["state"] in {"pending", "deferred"} for i in intents)
            else None
        )

    try:
        for app in ("cedar", "veriq"):
            assert request(app, "GET", "/ready")["version"] == "0.4.0"
        if request("veriq", "GET", "/v1/evidence"):
            raise RuntimeError(
                "Use a fresh isolated project/volumes; this demo will not erase existing data"
            )
        source_ids = [s["source_id"] for s in runtime["sources"]]
        request(
            "veriq",
            "POST",
            "/v1/identity/namespaces",
            payload={
                "namespace": "cedar-master-identifiers",
                "authority_ref": "authorized-cedar-core-registry-v1",
                "source_ids": source_ids,
            },
        )
        for source in runtime["sources"]:
            request(
                "veriq",
                "POST",
                "/v1/sources",
                payload={
                    **source,
                    "identity_namespace": "cedar-master-identifiers",
                    "identity_authority_ref": "authorized-cedar-core-registry-v1",
                    "ai_enabled": True,
                },
            )
        request("cedar", "POST", "/v1/simulator/seed", token="cedar_simulator")
        context = wait(
            "accepted Cedar institutional context",
            lambda: (
                c
                if (c := request("veriq", "GET", "/v1/knowledge/context"))["relationships"]
                else None
            ),
        )
        result["checks"]["structured_knowledge_accepted_without_extraction"] = bool(
            context["relationships"]
        ) and not request("veriq", "GET", "/v1/inference/tasks")
        doc = request(
            "cedar",
            "POST",
            "/v1/institutional/documents",
            payload={
                "text": "Effective 2026-10-20T00:00:00Z. Route QX12 named Payments uses gateway HG81 named Router."
            },
        )
        result["document_native_id"] = doc["id"]
        request(
            "cedar",
            "POST",
            "/v1/simulator/conditions",
            token="cedar_simulator",
            payload={"gateway_id": "G1", "timeout": True},
        )
        transfers = [
            request(
                "cedar",
                "POST",
                "/v1/transfers",
                token="customer1",
                payload={
                    "account_id": "A1",
                    "amount_minor": 1000,
                    "route_id": "R1",
                    "idempotency_key": str(uuid4()),
                },
            )
            for _ in range(10)
        ]
        affected = transfers[0]["data"]["transaction_id"]
        unrelated = request(
            "cedar",
            "POST",
            "/v1/transfers",
            token="customer2",
            payload={
                "account_id": "A2",
                "amount_minor": 500,
                "route_id": "R2",
                "idempotency_key": str(uuid4()),
            },
        )["data"]["transaction_id"]
        incidents = wait("proactive incident", lambda: request("veriq", "GET", "/v1/incidents"))
        assert not request("veriq", "GET", "/v1/interactions")
        incident = next(i for i in incidents if i["data"]["route_id"] == "R1")
        inv = wait(
            "proactive investigation",
            lambda: next(
                (
                    i
                    for i in request("veriq", "GET", "/v1/investigations")
                    if i["data"]["trigger_id"] == incident["id"]
                ),
                None,
            ),
        )
        result["checks"]["incident_without_customer_complaint"] = True
        in_app_id, email_id, branch_id = ["T004-" + str(uuid4()) for _ in range(3)]
        request(
            "cedar",
            "POST",
            "/v1/channels/in-app/messages",
            token="customer1",
            payload={
                "message_id": in_app_id,
                "customer_id": "C1",
                "message": "My transfer failed",
                "transaction_id": affected,
            },
        )
        request(
            "cedar",
            "POST",
            "/v1/channels/email/messages",
            payload={
                "message_id": email_id,
                "customer_id": "C1",
                "subject": "Pending transfer",
                "body": "My transfer is delayed and pending",
                "transaction_reference": affected,
            },
        )
        request(
            "cedar",
            "POST",
            "/v1/channels/branch/visits",
            payload={
                "visit_id": branch_id,
                "customer_id": "C2",
                "notes": "My transfer is delayed",
                "transaction_reference": unrelated,
            },
        )
        interactions = wait(
            "three native channels ingested",
            lambda: (
                items if len(items := request("veriq", "GET", "/v1/interactions")) == 3 else None
            ),
        )
        by_native = {r["data"]["source_native_record_id"]: r for r in interactions}
        assert {in_app_id, email_id, branch_id} == by_native.keys()
        assert (
            by_native[in_app_id]["data"]["transaction_id"]
            == by_native[email_id]["data"]["transaction_id"]
            == affected
        )
        assert by_native[branch_id]["data"]["transaction_id"] == unrelated
        result["checks"]["native_identity_and_customer_references_preserved"] = True

        def correlated():
            w = request("veriq", "GET", f"/v1/investigations/{inv['id']}/workspace")
            return w if w["revisions"][-1]["data"]["correlations"] else None

        workspace = wait("cross-pillar correlation", correlated)
        current = workspace["revisions"][-1]
        assert affected in {c["transaction_id"] for c in current["data"]["correlations"]}
        assert unrelated not in {c["transaction_id"] for c in current["data"]["correlations"]}
        assert not any(
            e["data"]["record_type"] == "transaction"
            and e["data"]["payload"]["transaction_id"] == unrelated
            for e in workspace["evidence"]
        )
        result["checks"]["unrelated_transaction_not_linked_to_affected_route"] = True
        before = financial()
        tasks = wait("automatic worker processing", completed_processing, seconds=300)
        assert before == financial()
        assert all(t["data"]["initiation"] == "automatic" for t in tasks)
        runs = request("veriq", "GET", "/v1/inference/runs")
        assert {"extract_knowledge", "interpret_interaction", "analyze_investigation"} <= {
            r["data"]["task"]
            for r in runs
            if r["data"].get("inference_metadata", {}).get("transport") == "http"
            and r["data"].get("inference_metadata", {}).get("usage", {}).get("completion_tokens", 0)
            > 0
        }
        result["checks"]["three_tasks_automatic_actual_local_http"] = True
        result["checks"]["ai_did_not_change_cedar_financial_state"] = True
        status_before_restart = request("veriq", "GET", "/v1/inference/status")
        control("restart", "veriq")
        wait("API restart readiness", lambda: request("veriq", "GET", "/ready"), seconds=40)
        status_after_restart = request("veriq", "GET", "/v1/inference/status")
        assert (
            status_after_restart["latest_successful_inference"]["id"]
            == status_before_restart["latest_successful_inference"]["id"]
        )
        result["checks"]["worker_inference_status_survives_api_restart"] = True
        control("stop", "local-ai")
        disabled_at = now()
        attempts_before = request("veriq", "GET", "/v1/incidents")[0]["data"]["attempts"]
        request(
            "cedar",
            "POST",
            "/v1/institutional/documents",
            payload={
                "text": "Effective 2026-10-20T00:00:00Z. Route QX13 named Batch uses gateway HG82 named Backup."
            },
        )
        request(
            "cedar",
            "POST",
            "/v1/channels/contact-centre/transcripts",
            payload={
                "call_id": "T004-" + str(uuid4()),
                "customer_id": "C1",
                "transcript": "My transfer is pending and delayed",
                "transaction_reference": affected,
            },
        )
        request(
            "cedar",
            "POST",
            "/v1/transfers",
            token="customer1",
            payload={
                "account_id": "A1",
                "amount_minor": 500,
                "route_id": "R1",
                "idempotency_key": str(uuid4()),
            },
        )
        wait(
            "offline operational monitoring",
            lambda: any(
                i["data"]["attempts"] > attempts_before
                for i in request("veriq", "GET", "/v1/incidents")
            ),
        )

        def unavailable_tasks():
            ts = request("veriq", "GET", "/v1/inference/tasks?limit=500")
            return (
                ts
                if any(
                    t["created_at"] >= disabled_at
                    and t["data"]["state"] in {"retryable", "unavailable"}
                    for t in ts
                )
                else None
            )

        offline_tasks = wait("accurate unavailable/retryable task state", unavailable_tasks)

        assert request("veriq", "GET", "/v1/knowledge/context")["relationships"]
        assert request("veriq", "GET", f"/v1/investigations/{inv['id']}/workspace")["revisions"]
        offline_runs = request("veriq", "GET", "/v1/inference/runs")
        assert not any(
            r["created_at"] >= disabled_at and r["data"]["state"] == "validated_candidate"
            for r in offline_runs
        )
        result["offline_status"] = request("veriq", "GET", "/v1/inference/status")
        assert result["offline_status"]["endpoint_reachable"] is False
        result["checks"]["offline_ingestion_context_monitoring_investigations_no_fake_ai"] = True
        control("restart", "ai-worker")
        result["checks"]["queued_work_visible_across_worker_restart"] = all(
            request("veriq", "GET", f"/v1/inference/tasks/{t['id']}")["id"] == t["id"]
            for t in offline_tasks
        )
        control("start", "local-ai")
        wait(
            "local runtime reachable again",
            lambda: request("veriq", "GET", "/v1/inference/status")["endpoint_reachable"],
            seconds=60,
        )
        wait("worker retry recovery", completed_processing, seconds=300)
        old_workspace = request("veriq", "GET", f"/v1/investigations/{inv['id']}/workspace")
        old_revision = deepcopy_json(old_workspace["revisions"][-1])
        request(
            "cedar",
            "POST",
            f"/v1/transactions/{affected}/reconcile",
            payload={
                "outcome": "completed",
                "beneficiary_verified": False,
                "rationale": "Authorized synthetic reconciliation after source evidence review",
            },
        )
        expected_bank = financial()

        def reconciled():
            w = request("veriq", "GET", f"/v1/investigations/{inv['id']}/workspace")
            return (
                w if w["revisions"][-1]["data"]["number"] > old_revision["data"]["number"] else None
            )

        final_workspace = wait("later reconciliation revision", reconciled)
        assert (
            next(r for r in final_workspace["revisions"] if r["id"] == old_revision["id"])
            == old_revision
        )
        assert final_workspace["investigation"]["data"]["review_required"] is True
        assert any(
            f["kind"] == "contradiction"
            for f in final_workspace["revisions"][-1]["data"]["findings"]
        )
        wait("reconciliation-triggered automatic analysis", completed_processing, seconds=300)
        assert financial() == expected_bank
        result["checks"]["historical_revision_preserved_after_authorized_reconciliation"] = True
        result["final_workspace"] = final_workspace
        result["final_tasks"] = request("veriq", "GET", "/v1/inference/tasks?limit=500")
        count = len(result["final_tasks"])
        time.sleep(4)
        assert len(request("veriq", "GET", "/v1/inference/tasks?limit=500")) == count
        result["checks"]["no_recursive_model_scheduling"] = True
        assert not any(
            r["method"] == "POST" and ("/inference/" in r["path"] or r["path"].endswith("/analyze"))
            for r in result["requests"]
        )
        result["checks"]["no_manual_ai_requests"] = True
        result["final_intents"] = request("veriq", "GET", "/v1/processing/intents?limit=500")
        result["final_status"] = request("veriq", "GET", "/v1/inference/status")
        result["final_runs"] = request("veriq", "GET", "/v1/inference/runs")
        result["model_qualified"] = False
        result["completed"] = all(result["checks"].values())
        result["completed_at"] = now()
        print(
            json.dumps(
                {
                    "completed": result["completed"],
                    "checks": result["checks"],
                    "tasks": len(result["final_tasks"]),
                }
            ),
            flush=True,
        )
        return result
    except Exception as exc:
        result["error"] = str(exc)
        raise
    finally:
        save()
        client.close()


def deepcopy_json(value):
    return json.loads(json.dumps(value))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cedar", default="http://127.0.0.1:8401")
    parser.add_argument("--veriq", default="http://127.0.0.1:8400")
    parser.add_argument("--project", default="veriq-ticket004")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    execute(args.cedar, args.veriq, args.project, args.output)


if __name__ == "__main__":
    main()
