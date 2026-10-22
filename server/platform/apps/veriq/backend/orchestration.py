"""Database-backed, leased task queue shared by sync and async entry points.

One scope is one bank deployment. All workers must use the same concurrency config.
No model, input payload or lease token is exposed through browser task responses.
"""

import json
import os
import time
from dataclasses import asdict

from fastapi import HTTPException
from sqlalchemy import func, or_, select

from apps.veriq.backend import ai_tasks, lifecycle
from shared.auth import Principal
from shared.contracts import now, uid
from shared.db import Row, audit, get, lock_scope, put, view


def settings():
    return {
        "concurrency": max(1, min(2, int(os.getenv("AI_TASK_CONCURRENCY", "1")))),
        "max_attempts": max(1, min(5, int(os.getenv("AI_TASK_MAX_ATTEMPTS", "3")))),
        "lease_seconds": max(
            float(os.getenv("LOCAL_AI_TIMEOUT_SECONDS", "180")) + 30,
            float(os.getenv("AI_TASK_LEASE_SECONDS", "240")),
        ),
        "queue_limit": max(1, min(1000, int(os.getenv("AI_TASK_QUEUE_LIMIT", "100")))),
        "backoff_seconds": max(1, float(os.getenv("AI_TASK_BACKOFF_SECONDS", "10"))),
    }


def public(row):
    return {
        **view(row),
        "data": {
            k: v for k, v in row.data.items() if k not in {"spec", "principal", "lease_token"}
        },
    }


def may_read(row, principal):
    if not principal.can_read(row.classification):
        return False
    if (
        row.data.get("initiation") == "automatic"
        or row.data["principal"]["subject"] == principal.subject
    ):
        # Recheck current role access, not just persisted ownership.
        try:
            principal.require(
                {
                    "extract_knowledge": "knowledge",
                    "interpret_interaction": "customer",
                    "analyze_investigation": "investigation",
                    "adaptive_investigation": "investigation",
                }[row.data["task"]]
            )
            return True
        except HTTPException:
            return False
    try:
        principal.require("investigation")
        return True
    except HTTPException:
        return False


def enqueue(db, scope, identifier, principal, investigation=False, adaptive=False):
    spec = ai_tasks.snapshot(db, scope, identifier, principal, investigation)
    if adaptive:
        from apps.veriq.backend.adaptive import prepare_spec

        spec = prepare_spec(spec)
    with db.session() as s:
        lock_scope(s, scope)
        ai_tasks.validate_snapshot(s, scope, spec, principal)
        return public(write_task(s, scope, spec, principal, initiation="manual"))


def write_task(s, scope, spec, principal, initiation, scheduling_identity=None, intent_id=None):
    from apps.veriq.backend.evidence_support import MAX_EVIDENCE, MAX_INPUT_BYTES

    if (
        len(json.dumps(spec["inputs"]).encode()) > MAX_INPUT_BYTES
        or len(spec["inputs"].get("evidence", [])) > MAX_EVIDENCE
    ):
        raise HTTPException(422, "Split evidence task: bounded input budget exceeded")
    task_target = spec.get("investigation_id", spec["evidence_ids"][0])
    revision = spec.get("revision_id", next(iter(spec["evidence_digests"].values())))
    scheduling_identity = scheduling_identity or lifecycle.scheduling_key(
        scope, spec["task"], task_target, revision, spec["source_grants"]
    )
    previous = list(
        s.scalars(
            select(Row)
            .where(
                Row.scope == scope,
                Row.kind == "ai_task",
                Row.data["scheduling_identity"].as_string() == scheduling_identity,
            )
            .order_by(Row.created_at.desc())
        )
    )
    if previous and (
        initiation == "automatic"
        or previous[0].data["state"] in {"queued", "running", "unavailable", "retryable"}
    ):
        return previous[0]
    active = s.scalar(
        select(func.count())
        .select_from(Row)
        .where(
            Row.scope == scope,
            Row.kind == "ai_task",
            Row.data["state"].as_string().in_(["queued", "running", "retryable", "unavailable"]),
        )
    )
    if active >= settings()["queue_limit"]:
        raise HTTPException(429, "AI task queue is full; ingestion remains available")
    task_id = uid()
    data = {
        "state": "queued",
        "task": spec["task"],
        "evidence_ids": spec["evidence_ids"],
        "revision_id": spec.get("revision_id"),
        "investigation_id": spec.get("investigation_id"),
        "spec": spec,
        "principal": asdict(principal),
        "attempts": 0,
        "initiation": initiation,
        "scheduling_identity": scheduling_identity,
        "intent_id": intent_id,
        "reprocessing_of": previous[0].id if previous else None,
        "policy_version": lifecycle.policy_version(),
        "model_config_version": os.getenv("AI_MODEL_CONFIG_VERSION", "1"),
        "history": [{"state": "queued", "at": now()}],
        "next_attempt_at": 0,
        "lease_until": 0,
    }
    task_key = (
        "scheduled:" + scheduling_identity
        if initiation == "automatic" or not previous
        else "reprocess:" + task_id
    )
    row = put(s, scope, "ai_task", task_key, data, spec["classification"], record_id=task_id)
    audit(s, scope, principal.subject, "inference.queued", row.id, row.classification)
    return row


def task_by_id(s, scope, identifier):
    return s.scalar(
        select(Row).where(Row.scope == scope, Row.kind == "ai_task", Row.id == identifier)
    )


def reauthorize(s, scope, data, principal, auth):
    if data.get("initiation") == "automatic":
        if principal != lifecycle.service(scope):
            raise HTTPException(403, "Unapproved automatic service principal")
        intent = s.scalar(
            select(Row).where(
                Row.scope == scope, Row.kind == "processing_intent", Row.id == data["intent_id"]
            )
        )
        if not intent:
            raise HTTPException(403, "Missing transactional processing intent")
        lifecycle.still_allowed(s, scope, intent.data)
    elif not any(p == principal for p in auth.credentials.values()):
        raise HTTPException(403, "Enqueuing principal is no longer authorized")
    ai_tasks.validate_snapshot(s, scope, data["spec"], principal)


def heartbeat(db, scope, worker_id, inference):
    with db.session() as s:
        lock_scope(s, scope)
        data = {
            "last_seen_at": now(),
            "last_seen_epoch": time.time(),
            "worker_id": worker_id,
            "state": "active",
            "configured_model": getattr(inference, "model", None),
            "investigation_mode": os.getenv("AI_INVESTIGATION_MODE", "legacy"),
            "model_config_version": os.getenv("AI_MODEL_CONFIG_VERSION", "1"),
            "max_output_tokens": getattr(inference, "max_tokens", None),
            "timeout_seconds": getattr(inference, "timeout", None),
            "declared_context_window": os.getenv("LOCAL_AI_CONTEXT_WINDOW"),
            "concurrency": settings()["concurrency"],
        }
        row = get(s, scope, "worker_heartbeat", worker_id)
        if row:
            row.data = data
        else:
            put(s, scope, "worker_heartbeat", worker_id, data)


def claim(db, scope, task_id=None):
    config, clock = settings(), time.time()
    with db.session() as s:
        lock_scope(s, scope)
        tasks = list(
            s.scalars(
                select(Row)
                .where(
                    Row.scope == scope,
                    Row.kind == "ai_task",
                    Row.data["state"].as_string().in_(["queued", "retryable", "running"]),
                )
                .order_by(Row.created_at, Row.id)
            )
        )
        for row in tasks:
            d = row.data
            if d["state"] == "running" and d["lease_until"] <= clock:
                state = "retryable" if d["attempts"] < config["max_attempts"] else "failed"
                row.data = {
                    **d,
                    "state": state,
                    "error": "Worker lease expired; prior output cannot publish",
                    "next_attempt_at": clock + config["backoff_seconds"],
                    "history": d["history"] + [{"state": state, "at": now()}],
                }
        if sum(r.data["state"] == "running" for r in tasks) >= config["concurrency"]:
            return None
        for row in tasks:
            d = row.data
            if task_id and row.id != task_id:
                continue
            if d["state"] not in {"queued", "retryable"} or d["next_attempt_at"] > clock:
                continue
            if d["attempts"] >= config["max_attempts"]:
                row.data = {**d, "state": "failed", "error": "Attempt budget exhausted"}
                continue
            row.data = {
                **d,
                "state": "running",
                "attempts": d["attempts"] + 1,
                "lease_until": clock + config["lease_seconds"],
                "lease_token": uid(),
                "history": d["history"] + [{"state": "running", "at": now()}],
            }
            return view(row)
    return None


def run_one(db, scope, inference, auth, task_id=None, worker_id="inline"):
    heartbeat(db, scope, worker_id, inference)
    lifecycle.dispatch(db, scope)
    claimed = claim(db, scope, task_id)
    if not claimed:
        return None
    d = claimed["data"]
    principal = Principal(**{**d["principal"], "roles": tuple(d["principal"]["roles"])})
    if d["spec"]["task"] == "adaptive_investigation":
        from apps.veriq.backend.adaptive import advance

        return advance(db, scope, claimed, principal, inference, auth)
    try:
        spec = d["spec"]
        with db.session() as s:
            reauthorize(s, scope, d, principal, auth)
        result = ai_tasks.model_result(inference, spec["task"], spec["inputs"])
        error = None
    except Exception as exc:
        result, error = None, f"Task failed ({type(exc).__name__})"
    with db.session() as s:
        lock_scope(s, scope)
        row = task_by_id(s, scope, claimed["id"])
        # A crashed/replaced worker can never publish stale candidates.
        if (
            row.data.get("lease_token") != d["lease_token"]
            or row.data["state"] != "running"
            or row.data["lease_until"] <= time.time()
        ):
            return None
        try:
            reauthorize(s, scope, d, principal, auth)
        except HTTPException as exc:
            result, error = None, str(exc.detail)
        state = "completed"
        update = {}
        if result is None:
            state, update = "failed", {"error": error}
        else:
            run = ai_tasks.publish(
                s,
                scope,
                spec,
                {**result, "initiation": d.get("initiation", "manual"), "task_id": claimed["id"]},
                principal,
                uid(),
            )
            update = {"run_id": run["id"], "outcome": run["data"]["state"]}
            if result["state"] == "unavailable":
                if not getattr(inference, "endpoint", None) or not getattr(
                    inference, "model", None
                ):
                    state = "unavailable"
                else:
                    state = "retryable" if d["attempts"] < settings()["max_attempts"] else "failed"
                update["error"] = result["error"]
        row.data = {
            **row.data,
            **update,
            "state": state,
            "lease_until": 0,
            "lease_token": None,
            "next_attempt_at": time.time()
            + settings()["backoff_seconds"] * 2 ** (d["attempts"] - 1),
            "history": row.data["history"] + [{"state": state, "at": now(), **update}],
        }
        audit(s, scope, "ai_worker", "inference." + state, row.id, row.classification)
        return public(row)


def retry(db, scope, task_id, principal):
    with db.session() as s:
        lock_scope(s, scope)
        row = task_by_id(s, scope, task_id)
        if (
            not row
            or not may_read(row, principal)
            or (
                row.data["principal"]["subject"] != principal.subject
                and row.data.get("initiation") != "automatic"
            )
        ):
            raise HTTPException(404, "Task not found")
        if (
            row.data.get("outcome") in {"cancelled", "invalidated"}
            or row.data["state"] not in {"unavailable", "retryable", "failed"}
            or row.data["attempts"] >= settings()["max_attempts"]
        ):
            raise HTTPException(409, "Task is not retryable or attempt budget exhausted")
        row.data = {
            **row.data,
            "state": "queued",
            "next_attempt_at": 0,
            "history": row.data["history"]
            + [{"state": "queued", "at": now(), "actor": principal.subject}],
        }
        audit(s, scope, principal.subject, "inference.retry", row.id, row.classification)
        return public(row)


def synchronous(db, scope, identifier, principal, inference, auth, investigation=False):
    task = enqueue(db, scope, identifier, principal, investigation)
    completed = run_one(db, scope, inference, auth, task["id"])
    if not completed or not completed["data"].get("run_id"):
        raise HTTPException(
            409,
            {
                "message": "Inference queued; poll task or use asynchronous API",
                "task_id": task["id"],
            },
        )
    with db.session() as s:
        return view(get(s, scope, "inference_run", completed["data"]["run_id"]))


def list_public(s, scope, principal, offset, limit):
    query = select(Row).where(Row.scope == scope, Row.kind == "ai_task")
    if principal.clearance != "restricted":
        query = query.where(Row.classification == "internal")
    try:
        principal.require("investigation")
    except HTTPException:
        allowed = []
        for task, permission in (
            ("extract_knowledge", "knowledge"),
            ("interpret_interaction", "customer"),
        ):
            try:
                principal.require(permission)
                allowed.append(task)
            except HTTPException:
                pass
        query = query.where(
            or_(
                Row.data["principal"]["subject"].as_string() == principal.subject,
                Row.data["initiation"].as_string() == "automatic",
            ),
            Row.data["task"].as_string().in_(allowed),
        )
    return [
        public(r)
        for r in s.scalars(query.order_by(Row.created_at, Row.id).offset(offset).limit(limit))
    ]
