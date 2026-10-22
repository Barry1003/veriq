import hashlib
import hmac
import json

from fastapi import HTTPException
from sqlalchemy import select

from apps.veriq.backend import identity
from apps.veriq.backend.intelligence import (
    detect_observation,
    process_interaction,
)
from apps.veriq.backend.investigations import refresh_investigations
from apps.veriq.backend.knowledge import assert_knowledge
from shared.auth import secret_hash
from shared.contracts import Knowledge, now, uid
from shared.db import Row, audit, get, lock_scope, put

AUTHORITY = {
    "knowledge": "structure",
    "observation": "measurement",
    "interaction": "report",
    "transaction": "status",
    "document": "document",
}


def register(s, scope, request, actor):
    lock_scope(s, scope)
    identity.migrate_legacy(s, scope)
    namespace = identity.validate_namespace(s, scope, request)
    if get(s, scope, "source", request.source_id):
        raise HTTPException(409, "Source already registered")
    row = put(
        s,
        scope,
        "source",
        request.source_id,
        {
            **request.model_dump(exclude={"ingestion_secret"}),
            "secret_hash": secret_hash(request.ingestion_secret),
            "identity_namespace": namespace,
            "authorization_state": "active",
            "grant_version": 1,
            "state": "registered",
            "ingested": 0,
            "last_received_at": None,
            "last_error": None,
            "cursor": 0,
        },
        request.max_classification,
    )
    audit(s, scope, actor, "source.registered", row.id, row.classification)
    return row


def ingest(s, scope, envelope, source_secret, actor=None):
    lock_scope(s, scope)
    actor = actor or f"source:{envelope.source_id}"
    if f"{envelope.institution_id}:{envelope.environment}" != scope:
        raise HTTPException(403, "Envelope outside installation scope")
    source = s.scalar(
        select(Row)
        .where(Row.scope == scope, Row.kind == "source", Row.key == envelope.source_id)
        .with_for_update()
    )
    if not source or not hmac.compare_digest(
        source.data["secret_hash"], secret_hash(source_secret)
    ):
        raise HTTPException(401, "Invalid source credential")
    policy = source.data
    if policy.get("authorization_state") == "revoked":
        raise HTTPException(403, "Source authorization revoked")
    if (
        envelope.authorization_ref != policy["authorization_ref"]
        or envelope.record_type not in policy["record_types"]
    ):
        raise HTTPException(403, "Source does not authorize this record")
    if AUTHORITY[envelope.record_type] not in policy["authority"]:
        raise HTTPException(403, "Source lacks contextual authority")
    if envelope.classification == "restricted" and policy["max_classification"] != "restricted":
        raise HTTPException(403, "Source classification exceeds grant")
    if policy.get("channel"):
        if (
            envelope.payload.get("channel") != policy["channel"]
            or not envelope.origin
            or envelope.origin.adapter_id != policy["adapter_id"]
            or envelope.origin.native_record_id != envelope.native_record_id
        ):
            raise HTTPException(403, "Channel provenance does not match source grant")
    digest = hashlib.sha256(json.dumps(envelope.record(), sort_keys=True).encode()).hexdigest()
    key = f"{envelope.source_id}:{envelope.native_record_id}"
    existing = get(s, scope, "evidence", key)
    if existing:
        if existing.data["digest"] != digest:
            raise HTTPException(
                409, "Immutable source record identity reused with different content"
            )
        return {
            "evidence_id": existing.id,
            "duplicate": True,
            "processing_state": existing.data["processing_state"],
        }
    evidence = put(
        s,
        scope,
        "evidence",
        key,
        {
            **envelope.record(),
            "received_at": now(),
            "identity_namespace": identity.namespace_for(s, scope, envelope.source_id),
            "digest": digest,
            "processing_state": "candidate" if envelope.record_type == "document" else "processed",
        },
        envelope.classification,
    )
    if envelope.record_type == "knowledge":
        assert_knowledge(
            s, scope, evidence, Knowledge.model_validate(envelope.payload), accepted=True
        )
    elif envelope.record_type == "observation":
        detect_observation(s, scope, evidence)
    elif envelope.record_type == "interaction":
        process_interaction(s, scope, evidence)
    source.data = {
        **source.data,
        "state": "receiving",
        "ingested": source.data["ingested"] + 1,
        "last_received_at": now(),
        "last_error": None,
    }
    audit(
        s,
        scope,
        actor,
        "evidence.ingested",
        evidence.id,
        evidence.classification,
        {"source_id": envelope.source_id, "record_type": envelope.record_type},
    )
    refresh_investigations(s, scope)
    from apps.veriq.backend.lifecycle import stage_evidence

    stage_evidence(s, scope, evidence)
    return {
        "evidence_id": evidence.id,
        "duplicate": False,
        "processing_state": evidence.data["processing_state"],
    }


def record_error(s, scope, source_id, message):
    lock_scope(s, scope)
    source = get(s, scope, "source", source_id)
    if source:
        source.data = {**source.data, "last_error": message, "state": "error"}
        put(
            s,
            scope,
            "ingestion_error",
            uid(),
            {"source_id": source_id, "message": message},
            source.classification,
        )
