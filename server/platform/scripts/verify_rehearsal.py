"""Real HTTP verification of a running isolated rehearsal; never supplies AI output."""

import argparse
import json
import time

from scripts.bootstrap import write_private
from scripts.rehearsal import Session, load, prepare, scenario, wait_for


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True)
    parser.add_argument("--wait-seconds", type=int, default=480)
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Continue a recorded run after a verification wait timeout",
    )
    args = parser.parse_args()
    path, config = load(args.run)
    session = Session(path, config)
    r = session.request
    started = time.monotonic()
    report = {
        "transport": "real_http",
        "storage": config["storage"],
        "model_qualified": False,
        "checks": {},
        "durations_seconds": {},
    }

    def save():
        write_private(path / "verification.json", json.dumps(report, indent=2) + "\n")

    try:
        if args.resume:
            prior = json.loads((path / "verification.json").read_text())
            report = prior
            if report.get("failure"):
                report.setdefault("prior_failures", []).append(report.pop("failure"))
                report["ai_deadline_exceeded"] = True
            state = json.loads((path / "scenario.json").read_text())
        else:
            tick = time.monotonic()
            prepare(session)
            before = {
                "sources": r("veriq", "GET", "/v1/sources"),
                "documents": r("cedar", "GET", "/v1/institutional/documents"),
            }
            prepare(session)
            after = {
                "sources": r("veriq", "GET", "/v1/sources"),
                "documents": r("cedar", "GET", "/v1/institutional/documents"),
            }
            report["checks"]["repeat_prepare_no_duplicate_sources_or_documents"] = [
                s["id"] for s in before["sources"]
            ] == [s["id"] for s in after["sources"]] and before["documents"] == after["documents"]
            report["durations_seconds"]["prepare_twice"] = round(time.monotonic() - tick, 3)
            for app, route in (("cedar", "/v1/accounts"), ("veriq", "/v1/sources")):
                response = session.client.get(f"http://127.0.0.1:{config[app + '_port']}" + route)
                report["checks"][app + "_unauthenticated_rejected"] = response.status_code == 401
            # Revoke an empty channel feed; restore the real grant after testing rejection.
            source = "cedar-email"
            if source not in {s["source_id"] for s in session.runtime["sources"]}:
                source = next(
                    s["source_id"]
                    for s in session.runtime["sources"]
                    if s.get("channel") == "email"
                )
            r(
                "veriq",
                "POST",
                f"/v1/sources/{source}/authorization",
                {"state": "revoked", "rationale": "Controlled empty-source authorization test"},
            )
            denied = r("veriq", "POST", f"/v1/connectors/{source}/pull", expected=(403,))
            report["checks"]["revoked_empty_source_rejected"] = "detail" in denied
            r(
                "veriq",
                "POST",
                f"/v1/sources/{source}/authorization",
                {
                    "state": "active",
                    "rationale": "Restore approved synthetic source after rejection test",
                },
            )
            tick = time.monotonic()
            scenario(session, "anomaly")
            scenario(session, "anomaly")
            report["checks"]["anomaly_replay_only_ten_transfers"] = (
                len(r("cedar", "GET", "/v1/transactions")) == 10
            )
            report["durations_seconds"]["anomaly_twice"] = round(time.monotonic() - tick, 3)
            state = scenario(session, "customer")
            scenario(session, "customer")
            report["checks"]["customer_replay_only_one_transfer_and_report"] = (
                len(r("cedar", "GET", "/v1/transactions")) == 11
                and len(r("cedar", "GET", "/v1/interactions")) == 1
            )
            report["checks"]["incident_preceded_complaint"] = state["detected_before_complaint"]
            interactions = r("veriq", "GET", "/v1/interactions")
            report["checks"]["original_transaction_and_channel_reference"] = any(
                i["data"]["transaction_id"] == state["transaction_id"] and i["data"].get("origin")
                for i in interactions
            )
            report["customer_transaction_id"] = state["transaction_id"]
            report["investigation_id"] = state["investigation_id"]
        if args.resume:
            entries = [
                json.loads(line) for line in (path / "transcript.jsonl").read_text().splitlines()
            ]
            before_financial = next(
                e["response"]
                for e in entries
                if e["app"] == "cedar"
                and e["path"] == "/v1/transactions"
                and isinstance(e["response"], list)
                and len(e["response"]) == 11
            )
        else:
            before_financial = r("cedar", "GET", "/v1/transactions")
        report["cedar_financial_before_ai"] = before_financial
        before_revision = state["before_reconciliation"]["investigation"]["data"][
            "latest_revision_id"
        ]
        tick = time.monotonic()

        def completed():
            tasks = r("veriq", "GET", "/v1/inference/tasks?limit=500")
            matches = [
                t
                for t in tasks
                if t["data"].get("investigation_id") == state["investigation_id"]
                and t["data"].get("revision_id") == before_revision
                and t["data"]["task"] == "adaptive_investigation"
            ]
            if matches:
                report["observed_adaptive_task"] = matches[-1]
                save()
                if matches[-1]["data"]["state"] in {"completed", "failed", "unavailable"}:
                    return matches[-1]

        try:
            task = wait_for("actual automatic adaptive outcome", completed, args.wait_seconds)
        except RuntimeError as exc:
            report["ai_deadline_exceeded"] = True
            report["ai_wait_error"] = str(exc)
            task = report.get("observed_adaptive_task")
            if not task:
                raise
        report["checks"]["model_finished_within_deadline"] = not report.get(
            "ai_deadline_exceeded", False
        ) and task["data"]["state"] in {"completed", "failed"}
        report["durations_seconds"]["wait_adaptive"] = round(time.monotonic() - tick, 3)
        trace = r("veriq", "GET", f"/v1/inference/tasks/{task['id']}/steps")
        report["task"] = task
        report["trace"] = trace
        report["checks"]["automatically_scheduled"] = task["data"]["initiation"] == "automatic"
        receipts = [s["data"].get("inference_metadata", {}) for s in trace["steps"]]
        report["checks"]["actual_http_model_called"] = any(
            m.get("transport") == "http" and m.get("usage", {}).get("completion_tokens", 0) > 0
            for m in receipts
        )
        report["checks"]["ai_cannot_change_cedar_financial_state"] = before_financial == r(
            "cedar", "GET", "/v1/transactions"
        )
        report["source_evidence_before_reconciliation"] = state["before_reconciliation"]
        state = scenario(session, "reconcile")
        scenario(session, "reconcile")
        report["checks"]["historical_revisions_preserved"] = state["historical_revisions_preserved"]
        report["source_evidence_after_reconciliation"] = state["after_reconciliation"]
        report["runtime_status"] = r("veriq", "GET", "/v1/inference/status")
        report["readiness"] = r("veriq", "GET", "/v1/setup/readiness")
        report["knowledge_assertions"] = r("veriq", "GET", "/v1/knowledge/assertions")
        report["knowledge_reviews"] = r("veriq", "GET", "/v1/knowledge/reviews")
        report["core_workflow_checks_passed"] = all(
            value
            for key, value in report["checks"].items()
            if key != "model_finished_within_deadline"
        )
        report["functional_checks_passed"] = all(report["checks"].values())
        report["reasoning_acceptance"] = (
            "Not evaluated by this workflow; frozen 0/4 baseline remains unqualified"
        )
    except Exception as exc:
        report["failure"] = str(exc)
        raise
    finally:
        report["durations_seconds"]["resume_seconds" if args.resume else "total_verification"] = (
            round(time.monotonic() - started, 3)
        )
        save()
        session.close()
    print(
        json.dumps(
            {
                "checks": report["checks"],
                "outcome": report["task"]["data"].get("outcome"),
                "durations_seconds": report["durations_seconds"],
            },
            indent=2,
        )
    )

    if not report["functional_checks_passed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
