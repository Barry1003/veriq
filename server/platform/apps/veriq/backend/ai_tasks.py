"""Bounded inference snapshots and atomic publication; never hold a DB lock over HTTP."""

import json

from fastapi import HTTPException

from apps.veriq.backend.evidence_support import UnsupportedEvidence, prepare, verify
from apps.veriq.backend.inference import InferenceUnavailable, InvalidInference
from apps.veriq.backend.knowledge import assert_knowledge
from shared.contracts import Knowledge
from shared.db import audit, get, put, rows, view


def model_result(inference, task, inputs):
    result = None
    attempted = False
    try:
        bounded = prepare(task, inputs)
        attempted = True
        result = inference.run(task, bounded)
        support = verify(task, inputs, result)
        metadata = (
            inference.execution_metadata()
            if attempted and hasattr(inference, "execution_metadata")
            else {}
        )
        return {
            "state": "validated_candidate",
            "result": result,
            "support_verification": support,
            "model": getattr(inference, "model", None),
            "inference_metadata": metadata,
        }
    except (InferenceUnavailable, InvalidInference, UnsupportedEvidence) as exc:
        return {
            "state": "unavailable" if isinstance(exc, InferenceUnavailable) else "quarantined",
            "error": str(exc),
            "untrusted_model_output": result
            if result is not None
            else getattr(exc, "raw_output", None),
            "validation_error": getattr(exc, "validation_error", None),
            "verification_stage": "evidence_support"
            if isinstance(exc, UnsupportedEvidence)
            else "runtime_or_schema",
            "inference_metadata": inference.execution_metadata()
            if attempted and hasattr(inference, "execution_metadata")
            else {},
        }


def snapshot(db, scope, identifier, principal, investigation=False):
    with db.session() as s:
        return snapshot_in_session(s, scope, identifier, principal, investigation)


def snapshot_in_session(s, scope, identifier, principal, investigation=False, revision_id=None):
    kind = "investigation" if investigation else "evidence"
    row = next((r for r in rows(s, scope, kind) if r.id == identifier), None)
    if not row or not principal.can_read(row.classification):
        raise HTTPException(404, "Record not found")
    if investigation:
        principal.require("investigation")
        revision = next(
            r
            for r in rows(s, scope, "investigation_revision")
            if r.id == (revision_id or row.data["latest_revision_id"])
        )
        evidence = [r for r in rows(s, scope, "evidence") if r.id in revision.data["evidence_ids"]]
        if any(not principal.can_read(e.classification) for e in [revision, *evidence]):
            raise HTTPException(403, "Evidence clearance insufficient")
        inputs = {
            "as_of": revision.created_at,
            "context": {
                "revision_id": revision.id,
                "method": "Deterministic current evidence selection; full findings and correlations remain in the revision",
            },
            "evidence": [],
        }
        selected, omitted = bounded_evidence(evidence)
        for e in selected:
            source = get(s, scope, "source", e.data["source_id"])
            inputs["evidence"].append(
                {
                    "id": e.id,
                    "record_type": e.data["record_type"],
                    "payload": e.data["payload"],
                    "source_id": e.data["source_id"],
                    "identity_namespace": source.data.get(
                        "identity_namespace", "source:" + source.key
                    ),
                    "authority": source.data["authority"],
                }
            )
        spec = {
            "task": "analyze_investigation",
            "investigation_id": row.id,
            "revision_id": revision.id,
            "evidence_ids": revision.data["evidence_ids"],
            "classification": revision.classification,
            "inputs": inputs,
            "package_selection": {
                "policy": "current-status-conflicts-reports-measurement-v1",
                "selected_evidence_ids": [e.id for e in selected],
                "omitted_from_model_ids": omitted,
                "all_references_preserved_in_revision": True,
            },
        }
        return freeze_authority(s, scope, spec)
    record_type = row.data["record_type"]
    if record_type not in {"document", "interaction"}:
        raise HTTPException(422, "Task supports documents or interactions")
    principal.require("knowledge" if record_type == "document" else "customer")
    source = get(s, scope, "source", row.data["source_id"])
    required = "document" if record_type == "document" else "report"
    if required not in source.data["authority"]:
        raise HTTPException(403, "Source lacks task authority")
    spec = {
        "task": "extract_knowledge" if record_type == "document" else "interpret_interaction",
        "evidence_ids": [row.id],
        "evidence_key": row.key,
        "classification": row.classification,
        "inputs": {
            "evidence_id": row.id,
            "source_occurred_at": row.data["occurred_at"],
            record_type: row.data["payload"],
        },
    }
    return freeze_authority(s, scope, spec)


def bounded_evidence(evidence):
    """Keep all same-version contradictions; sample other current facts deterministically.

    Full immutable references remain in the revision and are reauthorized. If all
    contradictions cannot fit, the task is explicitly blocked, never hidden.
    """
    from apps.veriq.backend.evidence_support import MAX_EVIDENCE

    groups, selected = {}, []
    reports = [e for e in evidence if e.data["record_type"] == "interaction"]
    reported = {
        (e.data.get("identity_namespace"), e.data["payload"].get("transaction_id")) for e in reports
    }
    for e in evidence:
        if e.data["record_type"] == "transaction":
            groups.setdefault(
                (e.data.get("identity_namespace"), e.data["payload"]["transaction_id"]), []
            ).append(e)
    current_groups = []
    for key, group in groups.items():
        version = max(e.data["payload"]["version"] for e in group)
        current = [e for e in group if e.data["payload"]["version"] == version]
        conflict = len({json.dumps(e.data["payload"], sort_keys=True) for e in current}) > 1
        current_groups.append((not conflict, key not in reported, str(key), current))
    for no_conflict, _, _, group in sorted(current_groups, key=lambda item: item[:3]):
        if not no_conflict:
            selected.extend(group)
    if len(selected) > MAX_EVIDENCE:
        raise HTTPException(422, "Contradicting current evidence exceeds model budget; split task")
    metrics = [e for e in evidence if e.data["record_type"] == "observation"]
    ordinary_budget = max(6, len(selected))
    for e in reports + metrics[:1]:
        if len(selected) < ordinary_budget:
            selected.append(e)
    for no_conflict, _, _, group in sorted(current_groups, key=lambda item: item[:3]):
        if no_conflict and len(selected) + len(group) <= ordinary_budget:
            selected.extend(group)
    return selected, sorted(e.id for e in evidence if e not in selected)


def freeze_authority(s, scope, spec):
    from apps.veriq.backend.lifecycle import validate_source

    evidence = {e.id: e for e in rows(s, scope, "evidence")}
    spec["source_grants"] = {}
    spec["evidence_digests"] = {}
    for eid in spec["evidence_ids"]:
        e = evidence[eid]
        source = validate_source(s, scope, e)
        spec["source_grants"][source.key] = source.data.get("grant_version", 1)
        spec["evidence_digests"][eid] = e.data["digest"]
    return spec


def validate_snapshot(s, scope, spec, principal):
    if "source_grants" not in spec or "evidence_digests" not in spec:
        raise HTTPException(
            409, "Legacy queued task requires authorized reprocessing with current grants"
        )
    from apps.veriq.backend.lifecycle import validate_source

    principal.require(
        {
            "extract_knowledge": "knowledge",
            "interpret_interaction": "customer",
            "analyze_investigation": "investigation",
            "adaptive_investigation": "investigation",
        }[spec["task"]]
    )
    evidence = {e.id: e for e in rows(s, scope, "evidence")}
    for eid in spec["evidence_ids"]:
        e = evidence.get(eid)
        if (
            not e
            or not principal.can_read(e.classification)
            or e.data["digest"] != spec.get("evidence_digests", {}).get(eid, e.data["digest"])
        ):
            raise HTTPException(403, "Input evidence no longer valid/authorized")
        source = validate_source(s, scope, e)
        if source.data.get("grant_version", 1) != spec.get("source_grants", {}).get(
            source.key, source.data.get("grant_version", 1)
        ):
            raise HTTPException(403, "Source grant changed after scheduling")
    if spec["task"] in {"analyze_investigation", "adaptive_investigation"}:
        investigation = next(
            (r for r in rows(s, scope, "investigation") if r.id == spec["investigation_id"]), None
        )
        if not investigation or investigation.data["latest_revision_id"] != spec["revision_id"]:
            raise HTTPException(
                409, "Stale investigation revision; no current analysis publication"
            )
    return True


def publish(s, scope, spec, data, principal, run_id):
    """Called under the same transaction/lock that completes a durable task lease."""
    data = {
        k: v for k, v in spec.items() if k not in {"inputs", "classification", "evidence_key"}
    } | data
    if data["state"] == "validated_candidate":
        try:
            with s.begin_nested():
                if spec["task"] == "extract_knowledge":
                    evidence = get(s, scope, "evidence", spec["evidence_key"])
                    assertion = assert_knowledge(
                        s,
                        scope,
                        evidence,
                        Knowledge.model_validate(data["result"]),
                        accepted=False,
                        inference_run_id=run_id,
                    )
                    assertion.data = {
                        **assertion.data,
                        "support_verification": data["support_verification"],
                    }
                    data["assertion_id"] = assertion.id
                elif spec["task"] == "interpret_interaction":
                    interaction = get(s, scope, "interaction", spec["evidence_ids"][0])
                    interaction.data = {
                        **interaction.data,
                        "ai_interpretation": data["result"],
                        "ai_method": "local_model_supported_candidate",
                        "ai_inference_run_id": run_id,
                    }
        except HTTPException as exc:
            data = {**data, "state": "quarantined", "error": str(exc.detail)}
    row = put(s, scope, "inference_run", run_id, data, spec["classification"], record_id=run_id)
    audit(s, scope, principal.subject, "inference.task", row.id, row.classification)
    return view(row)
