"""Durable worker-produced state, separate from current endpoint reachability."""

import time
from collections import Counter

from shared.db import rows, view


def status(db, scope, inference, principal):
    from apps.veriq.backend.adaptive import public_run
    from apps.veriq.backend.orchestration import public

    endpoint = inference.status()
    with db.session() as s:
        tasks = [t for t in rows(s, scope, "ai_task") if principal.can_read(t.classification)]
        runs = [r for r in rows(s, scope, "inference_run") if principal.can_read(r.classification)]
        intents = [
            r for r in rows(s, scope, "processing_intent") if principal.can_read(r.classification)
        ]
        workers = [
            r.data
            for r in rows(s, scope, "worker_heartbeat")
            if r.data.get("state", "active") == "active"
            and r.data["worker_id"] != "inline"
            and time.time() - r.data["last_seen_epoch"] < 60
        ]
        # Model generations are durable even before an assessment can publish.
        # Export receipt metadata only; source content stays behind the step API.
        events = [(r.created_at, public_run(s, scope, r, principal), r.data) for r in runs]
        for step in rows(s, scope, "investigative_step"):
            if not principal.can_read(step.classification):
                continue
            data = {
                key: step.data.get(key)
                for key in (
                    "task_id",
                    "revision_id",
                    "number",
                    "phase",
                    "state",
                    "inference_metadata",
                )
            }
            data["task"] = (data["inference_metadata"] or {}).get("task", "adaptive_investigation")
            events.append((step.created_at, {**view(step), "data": data}, data))
        events.sort(key=lambda event: (event[0], event[1]["id"]))
        successful = [
            event
            for event in events
            if (event[2].get("inference_metadata") or {}).get("completed_at")
        ]
        inference_failures = [
            event
            for event in events
            if event[2].get("state")
            in {"unavailable", "quarantined", "invalid_model_output", "model_error"}
        ]
        failed = [
            t
            for t in tasks
            if t.data["state"] in {"failed", "retryable", "unavailable"}
            or t.data.get("outcome") in {"quarantined", "invalid_model_output", "model_error"}
        ]
        failed.sort(key=lambda t: t.data.get("history", [{"at": t.created_at}])[-1]["at"])
        counts = dict(Counter(t.data["state"] for t in tasks))
        available = endpoint["state"] == "reachable"
        return {
            **endpoint,
            "live_inference_verified": any(
                (event[2].get("inference_metadata") or {}).get("transport") == "http"
                for event in successful
            ),
            "verified_tasks": {
                event[2]["task"]: event[2]["inference_metadata"]["completed_at"]
                for event in successful
                if event[2]["inference_metadata"].get("transport") == "http"
            },
            "configured_model": getattr(inference, "model", None),
            "endpoint_reachable": available,
            "model_qualification": {
                "state": "unqualified",
                "production_reasoning_approved": False,
                "basis": "Recorded Ticket 003 quality failures remain unresolved",
            },
            "latest_successful_inference": successful[-1][1] if successful else None,
            "latest_failed_processing": public(failed[-1]) if failed else None,
            "latest_failed_inference": inference_failures[-1][1] if inference_failures else None,
            "task_counts": counts,
            "backlog": sum(counts.get(k, 0) for k in ("queued", "retryable", "unavailable")),
            "currently_running": counts.get("running", 0),
            "completed_quarantined": sum(
                t.data["state"] == "completed"
                and t.data.get("outcome") in {"quarantined", "invalid_model_output", "model_error"}
                for t in tasks
            ),
            "adaptive_outcome_counts": dict(
                Counter(
                    t.data.get("outcome", "pending")
                    for t in tasks
                    if t.data["task"] == "adaptive_investigation"
                )
            ),
            "intent_counts": dict(Counter(i.data["state"] for i in intents)),
            "active_workers": workers,
            "processing_readiness": "available_unqualified"
            if available and workers
            else "worker_unavailable"
            if available
            else "inference_unavailable",
            "display": "Inference available — model unqualified."
            if available
            else "Inference unavailable — deterministic processing remains operational.",
        }
