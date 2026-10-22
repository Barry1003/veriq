"""Transactional processing intents: source/revision persistence and required work commit together."""

import hashlib
import json
import os

from fastapi import HTTPException
from sqlalchemy import select

from apps.veriq.backend import ai_tasks
from shared.auth import Principal
from shared.contracts import now
from shared.db import Row, audit, get, lock_scope, put, rows

POLICY_VERSION = "automatic-v1"
TASK_SCHEMA_VERSION = "support-v1"


def enabled():
    return os.getenv("AUTO_AI_ENABLED", "true").lower() in {"1", "true", "yes"}


def service(scope):
    # Not a browser credential and deliberately cannot review/approve or access Cedar banking.
    return Principal("veriq:auto-worker", scope, ("ai_service",), "restricted")


def validate_source(s, scope, evidence):
    source = get(s, scope, "source", evidence.data["source_id"])
    from apps.veriq.backend.ingestion import AUTHORITY

    if (
        not source
        or source.data.get("authorization_state") == "revoked"
        or evidence.data["authorization_ref"] != source.data["authorization_ref"]
        or evidence.data["record_type"] not in source.data["record_types"]
        or AUTHORITY[evidence.data["record_type"]] not in source.data["authority"]
        or (
            evidence.classification == "restricted"
            and source.data["max_classification"] != "restricted"
        )
    ):
        raise HTTPException(403, "Source evidence grant is revoked or inapplicable")
    return source


def policy_version():
    return POLICY_VERSION + ":" + os.getenv("AI_PROCESSING_POLICY_VERSION", "1")


def scheduling_key(scope, task, target, revision, grant_versions):
    return hashlib.sha256(
        json.dumps(
            [
                scope,
                task,
                target,
                revision,
                policy_version(),
                TASK_SCHEMA_VERSION,
                os.getenv("AI_MODEL_CONFIG_VERSION", "1"),
                grant_versions,
            ],
            sort_keys=True,
        ).encode()
    ).hexdigest()


def stage(s, scope, task, target, revision, evidence_ids, classification):
    if not enabled():
        return None
    evidence = {e.id: e for e in rows(s, scope, "evidence") if e.id in evidence_ids}
    grants = {}
    for eid in evidence_ids:
        if eid not in evidence:
            return None
        try:
            source = validate_source(s, scope, evidence[eid])
        except HTTPException:
            return None
        if not source.data.get("ai_enabled", False):
            return None
        grants[source.key] = source.data.get("grant_version", 1)
    key = scheduling_key(scope, task, target, revision, grants)
    previous = get(s, scope, "processing_intent", key)
    if previous:
        return previous
    row = put(
        s,
        scope,
        "processing_intent",
        key,
        {
            "state": "pending",
            "initiation": "automatic",
            "task": task,
            "target_id": target,
            "input_revision": revision,
            "evidence_ids": evidence_ids,
            "source_grants": grants,
            "policy_version": policy_version(),
            "task_schema_version": TASK_SCHEMA_VERSION,
            "model_config_version": os.getenv("AI_MODEL_CONFIG_VERSION", "1"),
            "scheduling_identity": key,
            "created_reason": "Persisted source revision"
            if task not in {"analyze_investigation", "adaptive_investigation"}
            else "Material investigation revision",
        },
        classification,
    )
    audit(s, scope, "ingestion_policy", "processing.required", row.id, classification)
    return row


def stage_evidence(s, scope, evidence):
    task = {"document": "extract_knowledge", "interaction": "interpret_interaction"}.get(
        evidence.data["record_type"]
    )
    if task:
        return stage(
            s,
            scope,
            task,
            evidence.id,
            evidence.data["digest"],
            [evidence.id],
            evidence.classification,
        )


def stage_revision(s, scope, investigation, revision):
    return stage(
        s,
        scope,
        "adaptive_investigation"
        if os.getenv("AI_INVESTIGATION_MODE", "legacy") == "adaptive"
        else "analyze_investigation",
        investigation.id,
        revision.id,
        revision.data["evidence_ids"],
        revision.classification,
    )


def still_allowed(s, scope, intent):
    if (
        not enabled()
        or intent["policy_version"] != policy_version()
        or intent["model_config_version"] != os.getenv("AI_MODEL_CONFIG_VERSION", "1")
    ):
        raise HTTPException(403, "Automatic processing policy/configuration changed or disabled")
    for source_id, version in intent["source_grants"].items():
        source = get(s, scope, "source", source_id)
        if (
            not source
            or source.data.get("authorization_state") == "revoked"
            or not source.data.get("ai_enabled", False)
            or source.data.get("grant_version", 1) != version
        ):
            raise HTTPException(403, "Automatic source grant changed, revoked or disabled")


def dispatch(db, scope):
    from apps.veriq.backend.orchestration import write_task

    with db.session() as s:
        lock_scope(s, scope)
        profile = [policy_version(), os.getenv("AI_MODEL_CONFIG_VERSION", "1")]
        marker = get(s, scope, "processing_policy", "active-profile")
        if enabled() and (not marker or marker.data["profile"] != profile):
            restage(s, scope)
            if marker:
                marker.data = {"profile": profile, "checked_at": now()}
            else:
                put(
                    s,
                    scope,
                    "processing_policy",
                    "active-profile",
                    {"profile": profile, "checked_at": now()},
                )
        pending = list(
            s.scalars(
                select(Row)
                .where(
                    Row.scope == scope,
                    Row.kind == "processing_intent",
                    Row.data["state"].as_string().in_(["pending", "deferred"]),
                )
                .order_by(Row.created_at, Row.id)
                .limit(100)
            )
        )
        for intent in pending:
            try:
                still_allowed(s, scope, intent.data)
                spec = ai_tasks.snapshot_in_session(
                    s,
                    scope,
                    intent.data["target_id"],
                    service(scope),
                    investigation=intent.data["task"]
                    in {"analyze_investigation", "adaptive_investigation"},
                    revision_id=intent.data["input_revision"]
                    if intent.data["task"] in {"analyze_investigation", "adaptive_investigation"}
                    else None,
                )
                if intent.data["task"] == "adaptive_investigation":
                    from apps.veriq.backend.adaptive import prepare_spec

                    spec = prepare_spec(spec)
                ai_tasks.validate_snapshot(s, scope, spec, service(scope))
                task = write_task(
                    s,
                    scope,
                    spec,
                    service(scope),
                    initiation="automatic",
                    scheduling_identity=intent.key,
                    intent_id=intent.id,
                )
                intent.data = {
                    **intent.data,
                    "state": "scheduled",
                    "task_id": task.id,
                    "scheduled_at": now(),
                }
            except HTTPException as exc:
                intent.data = {
                    **intent.data,
                    "state": "deferred" if exc.status_code == 429 else "blocked",
                    "reason": str(exc.detail),
                    "checked_at": now(),
                }
                if exc.status_code == 429:
                    break


def restage(s, scope):
    for evidence in rows(s, scope, "evidence"):
        try:
            stage_evidence(s, scope, evidence)
        except HTTPException:
            pass
    revisions = {r.id: r for r in rows(s, scope, "investigation_revision")}
    for investigation in rows(s, scope, "investigation"):
        revision = revisions.get(investigation.data.get("latest_revision_id"))
        if revision:
            try:
                stage_revision(s, scope, investigation, revision)
            except HTTPException:
                pass
