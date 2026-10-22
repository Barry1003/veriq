"""Five bounded persisted-evidence capabilities; no model-supplied executable access."""

import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select

from apps.veriq.backend.adaptive_contracts import ToolCall
from apps.veriq.backend.lifecycle import validate_source
from shared.contracts import instant
from shared.db import Row

MAX_SCAN = 500
MAX_RESULTS = 3
MAX_RESULT_BYTES = 9000


def visible(s, scope, principal, evidence):
    if principal.scope != scope or not principal.can_read(evidence.classification):
        raise HTTPException(403, "Evidence not authorized")
    source = validate_source(s, scope, evidence)
    if not source.data.get("ai_enabled", False):
        raise HTTPException(403, "Source does not permit AI processing")
    return source


def receipt(s, scope, principal, evidence):
    source = visible(s, scope, principal, evidence)
    payload = evidence.data["payload"]
    # Document/report text is untrusted data, never tool/application authority.
    if evidence.data["record_type"] in {"document", "interaction"}:
        payload = {**payload, "text": payload["text"][:1200]}
    item = {
        "id": evidence.id,
        "record_type": evidence.data["record_type"],
        "source_id": source.key,
        "identity_namespace": source.data["identity_namespace"],
        "authority": source.data["authority"],
        "classification": evidence.classification,
        "valid_at": evidence.data["payload"].get(
            "occurred_at", evidence.data["payload"].get("valid_from", evidence.data["occurred_at"])
        ),
        "valid_to": evidence.data["payload"].get("valid_to"),
        "known_at": evidence.data["received_at"],
        "native_record_id": evidence.data["native_record_id"],
        "origin": evidence.data.get("origin"),
        "digest": evidence.data["digest"],
        "grant_version": source.data.get("grant_version", 1),
        "content_truncated": payload != evidence.data["payload"],
        "acceptance": "authorized_structured_record"
        if evidence.data["record_type"] != "document"
        else "untrusted_document_content",
        "payload": payload,
    }
    return item


def execute(s, scope, principal, call, known_at, default_namespace=None):
    principal.require("investigation")
    call = ToolCall.model_validate(call)
    args = call.arguments
    try:
        at = instant(args.at or known_at)
        if at > known_at:
            raise ValueError("Future query outside pinned knowledge horizon")
    except ValueError:
        return {"state": "error", "code": "invalid_time", "evidence": []}, []
    namespace = args.namespace or default_namespace
    if call.name == "search_institutional_sources":
        if not args.query:
            return {"state": "error", "code": "query_required", "evidence": []}, []
    elif not args.native_id or not namespace:
        return {"state": "error", "code": "exact_identity_required", "evidence": []}, []
    kinds = {
        "get_transaction_evidence": ["transaction"],
        "get_operational_observations": ["observation"],
        "get_institutional_context": ["knowledge"],
        "get_customer_issue_context": ["interaction"],
        "search_institutional_sources": ["knowledge", "document"],
    }[call.name]
    # A bounded scan over typed rows; no SQL or wildcards supplied by the model.
    candidates = list(
        s.scalars(
            select(Row)
            .where(
                Row.scope == scope,
                Row.kind == "evidence",
                Row.created_at <= known_at,
                Row.data["record_type"].as_string().in_(kinds),
            )
            .order_by(Row.created_at.desc(), Row.id)
            .limit(MAX_SCAN + 1)
        )
    )
    found = []
    for e in candidates[:MAX_SCAN]:
        try:
            source = visible(s, scope, principal, e)
        except HTTPException:
            continue  # Hidden records are indistinguishable from absence.
        if namespace and source.data["identity_namespace"] != namespace:
            continue
        p = e.data["payload"]
        valid = p.get("occurred_at", p.get("valid_from", e.data["occurred_at"]))
        if valid > at or (p.get("valid_to") and at >= p["valid_to"]):
            continue
        if call.name == "get_transaction_evidence":
            matches = p["transaction_id"] == args.native_id
        elif call.name == "get_operational_observations":
            matches = (
                args.native_id in (p["route_id"], p["gateway_id"])
                and abs(
                    (datetime.fromisoformat(at) - datetime.fromisoformat(valid)).total_seconds()
                )
                <= 86400
            )
        elif call.name == "get_customer_issue_context":
            matches = args.native_id in (p["transaction_id"], p["customer_id"])
        elif call.name == "get_institutional_context":
            matches = any(x["native_id"] == args.native_id for x in p["entities"])
        else:
            matches = args.query.casefold() in json.dumps(p, ensure_ascii=False).casefold()
        if matches:
            found.append(e)
    # Prefer transaction version, preserving a same-version conflict when it fits;
    # incompleteness is explicit and cannot support a categorical derived finding.
    if call.name == "get_transaction_evidence":
        found.sort(key=lambda e: (e.data["payload"]["version"], e.created_at, e.id), reverse=True)
    items, included = [], []
    for e in found[:MAX_RESULTS]:
        item = receipt(s, scope, principal, e)
        if len(json.dumps(items + [item]).encode()) > MAX_RESULT_BYTES:
            break
        items.append(item)
        included.append(e)
    truncated = len(found) > len(items) or len(candidates) > MAX_SCAN
    for item in items:
        item["query_incomplete"] = truncated
    return {
        "state": "ok" if items else "missing",
        "evidence": items,
        "known_at": known_at,
        "as_of": at,
        "truncated": truncated,
        "limits": {"scan": MAX_SCAN, "records": MAX_RESULTS, "bytes": MAX_RESULT_BYTES},
        "missing_information": "Additional matching or older evidence may exist"
        if truncated
        else (None if items else "No visible matching evidence established"),
    }, included
