"""Append-only source assertions and bitemporal, source-backed context projections."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from apps.veriq.backend import identity
from shared.contracts import Knowledge, now, uid
from shared.db import audit, get, put, rows

COMPATIBILITY = {
    "uses_gateway": ({"route"}, {"gateway"}),
    "depends_on": ({"service", "gateway"}, {"service", "gateway"}),
    "belongs_to": ({"service", "gateway", "route"}, {"system"}),
    "governed_by": ({"process", "service"}, {"procedure"}),
}


def canonical_id(scope: str, native_id: str, namespace=None) -> str:
    return (
        identity.native_id(scope, namespace, native_id)
        if namespace
        else identity.legacy_id(scope, native_id)
    )


def assert_knowledge(
    s: Session, scope: str, evidence, payload: Knowledge, accepted: bool, inference_run_id=None
):
    identity.migrate_legacy(s, scope)
    namespace = identity.namespace_for(s, scope, evidence.data["source_id"])
    kinds = {e.native_id: e.kind for e in payload.entities}
    for edge in payload.relationships:
        allowed_subjects, allowed_objects = COMPATIBILITY[edge.predicate]
        if (
            kinds.get(edge.subject) not in allowed_subjects
            or kinds.get(edge.object) not in allowed_objects
        ):
            raise HTTPException(422, "Relationship refers to absent or incompatible entities")
    for entity in payload.entities:
        previous = get(s, scope, "identity_binding", identity.key(namespace, entity.native_id))
        if previous and previous.data["entity_kind"] != entity.kind:
            raise HTTPException(409, "Identity already assigned a different type in this namespace")
        if accepted:
            identity.bind(
                s,
                scope,
                namespace,
                entity.native_id,
                entity.kind,
                evidence.id,
                evidence.classification,
            )
    snapshot = put(
        s,
        scope,
        "assertion",
        uid(),
        {
            "source_id": evidence.data["source_id"],
            "identity_namespace": namespace,
            "evidence_id": evidence.id,
            "knowledge": payload.model_dump(),
            "method": "structured" if accepted else "ai_extraction",
            **({"inference_run_id": inference_run_id} if inference_run_id else {}),
        },
        evidence.classification,
    )
    put(
        s,
        scope,
        "knowledge_review",
        uid(),
        {
            "assertion_id": snapshot.id,
            "decision": "accepted" if accepted else "candidate",
            "rationale": "Authenticated structured source with structure authority"
            if accepted
            else "AI extraction requires authorized review",
            "actor": "ingestion_policy",
            "decided_at": now(),
        },
        evidence.classification,
    )
    return snapshot


def decision_at(s: Session, scope: str, assertion_id: str, known_at: str):
    applicable = [
        r
        for r in rows(s, scope, "knowledge_review")
        if r.data["assertion_id"] == assertion_id and r.created_at <= known_at
    ]
    return applicable[-1].data["decision"] if applicable else "candidate"


def context(s: Session, scope: str, at: str, known_at: str, clearance: str) -> dict:
    identity.migrate_legacy(s, scope)
    snapshots = []
    for row in rows(s, scope, "assertion"):
        if row.created_at > known_at or (
            row.classification == "restricted" and clearance != "restricted"
        ):
            continue
        k = row.data["knowledge"]
        if k["valid_from"] <= at and decision_at(s, scope, row.id, known_at) == "accepted":
            snapshots.append(row)
    # Each structured knowledge event is a full snapshot for its source. A later snapshot
    # supersedes the earlier one only in effective time and only once it is known/accepted.
    latest = {}
    for row in snapshots:
        key = row.data["source_id"] if row.data["method"] == "structured" else row.id
        rank = row.data["knowledge"]["valid_from"]
        if key not in latest or rank > latest[key][0]:
            latest[key] = (rank, [row])
        elif rank == latest[key][0]:
            latest[key][1].append(row)
    entities, edges = {}, {}
    selected = [row for _, group in latest.values() for row in group]
    for row in selected:
        k = row.data["knowledge"]
        if k["valid_to"] and at >= k["valid_to"]:
            continue
        namespace = row.data["identity_namespace"]
        for entity in k["entities"]:
            cid = identity.resolve(
                s, scope, namespace, entity["native_id"], at, known_at, clearance
            )
            e = entities.setdefault(
                cid,
                {
                    "canonical_id": cid,
                    "native_id": entity["native_id"],
                    "kind": entity["kind"],
                    "namespace": namespace,
                    "source_identities": [],
                    "names": [],
                    "evidence_ids": [],
                },
            )
            e["source_identities"].append(
                {
                    "namespace": namespace,
                    "native_id": entity["native_id"],
                    "source_id": row.data["source_id"],
                    "evidence_id": row.data["evidence_id"],
                }
            )
            e["names"] = sorted(set(e["names"] + [entity["name"]] + entity["aliases"]))
            e["evidence_ids"] = sorted(
                set(
                    e["evidence_ids"]
                    + [row.data["evidence_id"]]
                    + identity.mapping_evidence(
                        s, scope, namespace, entity["native_id"], at, known_at, clearance
                    )
                )
            )
        for edge in k["relationships"]:
            subject_id = identity.resolve(
                s, scope, namespace, edge["subject"], at, known_at, clearance
            )
            object_id = identity.resolve(
                s, scope, namespace, edge["object"], at, known_at, clearance
            )
            key = (subject_id, edge["predicate"], object_id)
            e = edges.setdefault(
                key,
                {
                    **edge,
                    "subject_id": subject_id,
                    "identity_namespace": namespace,
                    "source_identities": [],
                    "object_id": object_id,
                    "evidence_ids": [],
                    "assertion_ids": [],
                    "state": "accepted",
                    "semantics": "structural",
                },
            )
            e["source_identities"].append(
                {
                    "namespace": namespace,
                    "source_id": row.data["source_id"],
                    "subject": edge["subject"],
                    "object": edge["object"],
                }
            )
            e["evidence_ids"] = sorted(
                set(
                    e["evidence_ids"]
                    + [row.data["evidence_id"]]
                    + identity.mapping_evidence(
                        s, scope, namespace, edge["subject"], at, known_at, clearance
                    )
                    + identity.mapping_evidence(
                        s, scope, namespace, edge["object"], at, known_at, clearance
                    )
                )
            )
            e["assertion_ids"].append(row.id)
    # uses_gateway is functional per route at a time; disagreement stays visible.
    for edge in edges.values():
        if (
            edge["predicate"] == "uses_gateway"
            and len({k[2] for k in edges if k[:2] == (edge["subject_id"], edge["predicate"])}) > 1
        ):
            edge["state"] = "contested"
    unresolved = {
        r.data["canonical_id"]
        for r in rows(s, scope, "identity_reconciliation")
        if r.created_at <= known_at and r.data["state"] == "manual_review_required"
    }
    for entity in entities.values():
        entity["identity_state"] = (
            "legacy_review_required"
            if entity["canonical_id"] in unresolved
            else "source_bound_or_authorized_mapping"
        )
    for edge in edges.values():
        if edge["subject_id"] in unresolved or edge["object_id"] in unresolved:
            edge["state"] = "identity_review_required"
    return {
        "at": at,
        "known_at": known_at,
        "entities": list(entities.values()),
        "relationships": list(edges.values()),
    }


def review_assertion(s, scope, assertion_id, review, principal):
    row = next((r for r in rows(s, scope, "assertion") if r.id == assertion_id), None)
    if not row or not principal.can_read(row.classification):
        raise HTTPException(404, "Assertion not found")
    identity.migrate_legacy(s, scope)
    source = get(s, scope, "source", row.data["source_id"])
    if review.decision == "accepted" and source.data.get("authorization_state") == "revoked":
        raise HTTPException(409, "Source authorization revoked")
    if review.decision == "accepted" and row.data["method"] == "ai_extraction":
        from apps.veriq.backend.evidence_support import UnsupportedEvidence, verify

        evidence = next(e for e in rows(s, scope, "evidence") if e.id == row.data["evidence_id"])
        source = get(s, scope, "source", evidence.data["source_id"])
        if "document" not in source.data["authority"]:
            raise HTTPException(409, "Source lacks document authority")
        try:
            verify(
                "extract_knowledge",
                {
                    "document": evidence.data["payload"],
                    "source_occurred_at": evidence.data["occurred_at"],
                },
                row.data["knowledge"],
            )
        except UnsupportedEvidence as exc:
            raise HTTPException(409, "Candidate lacks evidence support: " + str(exc)) from exc
    if review.decision == "accepted":
        for entity in row.data["knowledge"]["entities"]:
            identity.bind(
                s,
                scope,
                row.data["identity_namespace"],
                entity["native_id"],
                entity["kind"],
                row.data["evidence_id"],
                row.classification,
            )
    result = put(
        s,
        scope,
        "knowledge_review",
        uid(),
        {
            "assertion_id": assertion_id,
            **review.model_dump(),
            "actor": principal.subject,
            "decided_at": now(),
        },
        row.classification,
    )
    audit(
        s,
        scope,
        principal.subject,
        "knowledge.review",
        assertion_id,
        row.classification,
        review.model_dump(),
    )
    return result


def path_context(projection: dict, route_id: str, gateway_id: str, canonical=False) -> dict:
    """Bounded structural neighborhood; include contested alternatives and their provenance."""
    selected = (
        {route_id, gateway_id}
        if canonical
        else {
            e["canonical_id"]
            for e in projection["entities"]
            if e["native_id"] in {route_id, gateway_id}
        }
    )
    related = []
    frontier = set(selected)
    for _ in range(3):
        outgoing = [
            edge
            for edge in projection["relationships"]
            if edge["subject_id"] in frontier and edge not in related
        ]
        related.extend(outgoing)
        frontier = {edge["object_id"] for edge in outgoing} - selected
        selected.update(frontier)
        if not frontier:
            break
    return {
        **projection,
        "entities": [e for e in projection["entities"] if e["canonical_id"] in selected],
        "relationships": related,
    }
