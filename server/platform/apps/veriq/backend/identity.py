"""Source-scoped identities with append-only, authorized equivalence mappings."""

import hashlib
import json
from uuid import NAMESPACE_URL, uuid5

from fastapi import HTTPException

from shared.contracts import now
from shared.db import audit, get, put, rows


def key(namespace, native_id):
    return hashlib.sha256(json.dumps([namespace, native_id]).encode()).hexdigest()


def legacy_id(scope, native_id):
    return str(uuid5(NAMESPACE_URL, f"veriq:{scope}:{native_id}"))


def native_id(scope, namespace, identifier):
    return str(
        uuid5(
            NAMESPACE_URL,
            "veriq:namespace:" + json.dumps([scope, namespace, identifier], separators=(",", ":")),
        )
    )


def namespace_for(s, scope, source_id):
    source = get(s, scope, "source", source_id)
    return (
        source.data.get("identity_namespace", "source:" + source_id)
        if source
        else "source:" + source_id
    )


def bind(
    s,
    scope,
    namespace,
    identifier,
    kind,
    evidence_id,
    classification,
    legacy=False,
    legacy_canonical_id=None,
):
    binding = get(s, scope, "identity_binding", key(namespace, identifier))
    if binding:
        if binding.data["entity_kind"] != kind:
            raise HTTPException(409, "Identity namespace already assigns another entity type")
        return binding.data
    data = {
        "namespace": namespace,
        "native_id": identifier,
        "entity_kind": kind,
        "canonical_id": (legacy_canonical_id or legacy_id(scope, identifier))
        if legacy
        else native_id(scope, namespace, identifier),
        "identity_evidence_ids": [evidence_id],
        "origin": "legacy_compatibility" if legacy else "source_authority",
    }
    put(s, scope, "identity_binding", key(namespace, identifier), data, classification)
    return data


def resolve(s, scope, namespace, identifier, at=None, known_at=None, clearance="restricted"):
    binding = get(s, scope, "identity_binding", key(namespace, identifier))
    cid = binding.data["canonical_id"] if binding else native_id(scope, namespace, identifier)
    at, known_at = at or now(), known_at or now()
    mappings = [
        r
        for r in rows(s, scope, "identity_mapping")
        if r.created_at <= known_at
        and r.data["decision"] == "accepted"
        and r.data["valid_from"] <= at
        and (r.classification == "internal" or clearance == "restricted")
    ]
    visited = set()
    while cid not in visited:
        visited.add(cid)
        matches = [m for m in mappings if m.data["from_canonical_id"] == cid]
        if not matches:
            return cid
        cid = matches[-1].data["to_canonical_id"]
    raise HTTPException(409, "Identity mapping cycle")


def mapping_evidence(s, scope, namespace, identifier, at, known_at, clearance):
    binding = get(s, scope, "identity_binding", key(namespace, identifier))
    cid = binding.data["canonical_id"] if binding else native_id(scope, namespace, identifier)
    refs, seen = set(), set()
    while cid not in seen:
        seen.add(cid)
        matches = [
            m
            for m in rows(s, scope, "identity_mapping")
            if m.data["decision"] == "accepted"
            and m.created_at <= known_at
            and m.data["valid_from"] <= at
            and m.data["from_canonical_id"] == cid
            and (m.classification == "internal" or clearance == "restricted")
        ]
        if not matches:
            break
        mapping = matches[-1]
        refs.update(mapping.data["evidence_ids"])
        cid = mapping.data["to_canonical_id"]
    return sorted(refs)


def source_ref(s, scope, source_id, identifier, at=None, known_at=None, identity_kind=None):
    namespace = namespace_for(s, scope, source_id)
    if identity_kind is not None:
        # A transaction/customer reference cannot inherit a mapping between
        # institutional routes/gateways that happen to use the same string.
        return str(
            uuid5(
                NAMESPACE_URL,
                "veriq:reference:"
                + json.dumps([scope, namespace, identity_kind, identifier], separators=(",", ":")),
            )
        )
    return resolve(s, scope, namespace, identifier, at, known_at)


def approve_namespace(s, scope, request, principal):
    principal.require("identity")
    row = get(s, scope, "identity_namespace", request.namespace)
    if row:
        if not principal.can_read(row.classification):
            raise HTTPException(404, "Identifier authority grant not found")
        if row.data["authority_ref"] != request.authority_ref:
            raise HTTPException(409, "Namespace authority is immutable")
        row.data = {
            **row.data,
            "source_ids": sorted(set(row.data["source_ids"] + request.source_ids)),
        }
    else:
        row = put(
            s,
            scope,
            "identity_namespace",
            request.namespace,
            request.model_dump(),
            "restricted" if principal.clearance == "restricted" else "internal",
        )
    audit(s, scope, principal.subject, "identity.namespace_authorized", row.id, row.classification)
    return row


def validate_namespace(s, scope, request):
    namespace = request.identity_namespace or "source:" + request.source_id
    if namespace != "source:" + request.source_id:
        grant = get(s, scope, "identity_namespace", namespace)
        if (
            not grant
            or request.source_id not in grant.data["source_ids"]
            or request.identity_authority_ref != grant.data["authority_ref"]
        ):
            raise HTTPException(
                403, "Shared namespace requires an approved identifier authority grant"
            )
    return namespace


def map_identity(s, scope, request, principal):
    principal.require("identity")
    left = get(s, scope, "identity_binding", key(request.from_namespace, request.from_native_id))
    right = get(s, scope, "identity_binding", key(request.to_namespace, request.to_native_id))
    if (
        not left
        or not right
        or not all(principal.can_read(r.classification) for r in [left, right])
    ):
        raise HTTPException(404, "Identity binding not found")
    if left.data["entity_kind"] != right.data["entity_kind"]:
        raise HTTPException(409, "Identity types are incompatible")
    evidence = {e.id: e for e in rows(s, scope, "evidence")}
    if any(
        eid not in evidence or not principal.can_read(evidence[eid].classification)
        for eid in request.evidence_ids
    ):
        raise HTTPException(403, "Mapping evidence not authorized")
    for binding in (left, right):
        if not set(binding.data["identity_evidence_ids"]) & set(request.evidence_ids):
            raise HTTPException(422, "Mapping needs identity evidence from both bindings")
    current = [
        r
        for r in rows(s, scope, "identity_mapping")
        if r.data["from_canonical_id"] == left.data["canonical_id"]
        and r.data["decision"] == "accepted"
    ]
    if request.decision == "accepted" and current:
        raise HTTPException(
            409, "Identity already mapped; conflicting reconciliation requires review"
        )
    target = resolve(s, scope, request.to_namespace, request.to_native_id, request.valid_from)
    if target == left.data["canonical_id"]:
        raise HTTPException(409, "Identity mapping would be redundant or cyclic")
    from shared.contracts import uid

    classification = (
        "restricted"
        if any(
            r.classification == "restricted"
            for r in [left, right, *[evidence[e] for e in request.evidence_ids]]
        )
        else "internal"
    )
    row = put(
        s,
        scope,
        "identity_mapping",
        uid(),
        {
            **request.model_dump(),
            "from_canonical_id": left.data["canonical_id"],
            "to_canonical_id": target,
            "actor": principal.subject,
            "review_basis": "Explicit authorized identity attestation; no name-similarity merge",
        },
        classification,
    )
    audit(
        s, scope, principal.subject, "identity.mapping_" + request.decision, row.id, classification
    )
    return row


def migrate_legacy(s, scope):
    """Idempotent compatibility migration; never rewrite historical revisions/UUIDs."""
    marker = get(s, scope, "identity_migration", "v0.4.0")
    if marker:
        return marker
    count, aliases = 0, {}
    for source in rows(s, scope, "source"):
        source.data = {
            **source.data,
            "identity_namespace": source.data.get("identity_namespace", "source:" + source.key),
            "grant_version": source.data.get("grant_version", 1),
        }
    evidence = {e.id: e for e in rows(s, scope, "evidence")}
    for item in evidence.values():
        if "identity_namespace" not in item.data:
            # Add server-owned compatibility metadata only; source payload, digest,
            # evidence UUID and every historical investigation reference stay intact.
            item.data = {
                **item.data,
                "identity_namespace": namespace_for(s, scope, item.data["source_id"]),
            }
    for assertion in rows(s, scope, "assertion"):
        if "identity_namespace" in assertion.data:
            continue
        namespace = namespace_for(s, scope, assertion.data["source_id"])
        for entity in assertion.data["knowledge"]["entities"]:
            old = get(s, scope, "entity", entity["native_id"])
            if old and old.data["entity_kind"] == entity["kind"]:
                bind(
                    s,
                    scope,
                    namespace,
                    entity["native_id"],
                    entity["kind"],
                    assertion.data["evidence_id"],
                    assertion.classification,
                    legacy=True,
                    legacy_canonical_id=old.data["canonical_id"],
                )
                aliases.setdefault(old.data["canonical_id"], set()).add(namespace)
                count += 1
        assertion.data = {
            **assertion.data,
            "identity_namespace": namespace,
            "identity_origin": "legacy_compatibility",
        }
    for cid, namespaces in aliases.items():
        if len(namespaces) > 1:
            put(
                s,
                scope,
                "identity_reconciliation",
                cid,
                {
                    "canonical_id": cid,
                    "namespaces": sorted(namespaces),
                    "state": "manual_review_required",
                    "reason": "Historical v0.3.0 shared native ID; compatibility UUID preserved, equivalence not newly certified",
                },
                "restricted",
            )
    return put(
        s,
        scope,
        "identity_migration",
        "v0.4.0",
        {
            "bindings_examined": count,
            "shared_legacy_ids_requiring_review": sum(len(v) > 1 for v in aliases.values()),
            "historical_revisions_rewritten": 0,
            "evidence_count": len(evidence),
        },
    )
