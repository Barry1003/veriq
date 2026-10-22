"""Durable evidence assembly, bounded correlation, and immutable revisions."""

import hashlib
import json

from apps.veriq.backend import identity
from apps.veriq.backend.intelligence import delta
from apps.veriq.backend.knowledge import context, path_context
from shared.contracts import now
from shared.db import put, rows


def current_transaction_records(records, as_of):
    """Version is per transaction/identifier authority, not global configuration recency.

    Future-effective revisions cannot rewrite present execution. Equal-version
    disagreement is retained and must not establish an incident association.
    """
    eligible = [e for e in records if e.data["payload"]["occurred_at"] <= as_of]
    if not eligible:
        return []
    # A version counter is meaningful within its issuing source. Independent
    # authorities are not silently ordered by unrelated version numbers.
    versions = {}
    for e in eligible:
        source = e.data["source_id"]
        versions[source] = max(versions.get(source, 0), e.data["payload"]["version"])
    return [e for e in eligible if e.data["payload"]["version"] == versions[e.data["source_id"]]]


def execution_records(records, as_of):
    # A reconciliation revises financial status; it is not an execution receipt.
    return current_transaction_records(
        [e for e in records if e.data["payload"]["response"] != "reconciled"], as_of
    )


def uncontested(records):
    return (
        bool(records) and len({json.dumps(e.data["payload"], sort_keys=True) for e in records}) == 1
    )


def refresh_investigations(s, scope):
    evidence = rows(s, scope, "evidence")
    by_id = {e.id: e for e in evidence}
    from fastapi import HTTPException

    from apps.veriq.backend.lifecycle import validate_source

    txs = []
    for e in evidence:
        if e.data["record_type"] != "transaction":
            continue
        try:
            validate_source(s, scope, e)
            txs.append(e)
        except HTTPException:
            pass
    observations = [e for e in evidence if e.data["record_type"] == "observation"]
    interactions = rows(s, scope, "interaction")

    def ref(e, field):
        return identity.source_ref(
            s,
            scope,
            e.data["source_id"],
            e.data["payload"][field],
            at=e.data["payload"].get("occurred_at", e.data.get("occurred_at")),
            identity_kind=field if field in {"transaction_id", "customer_id"} else None,
        )

    def report_ref(interaction, field):
        return identity.source_ref(
            s,
            scope,
            interaction.data["source_id"],
            interaction.data[field],
            at=interaction.data["occurred_at"],
            identity_kind=field if field in {"transaction_id", "customer_id"} else None,
        )

    for investigation in rows(s, scope, "investigation"):
        linked, correlations, findings, unknowns, hypotheses = {}, [], [], [], []
        institutional_context = {"entities": [], "relationships": []}
        trigger_type = investigation.data["trigger_type"]
        trigger = next(
            (r for r in rows(s, scope, trigger_type) if r.id == investigation.data["trigger_id"]),
            None,
        )
        if not trigger:
            continue
        if trigger_type == "incident":
            for eid in trigger.data["evidence_ids"]:
                linked[eid] = by_id[eid]
            source_namespace = identity.namespace_for(s, scope, trigger.data["source_id"])
            route_cid = identity.resolve(s, scope, source_namespace, trigger.data["route_id"])
            gateway_cid = identity.resolve(s, scope, source_namespace, trigger.data["gateway_id"])
            # A proactive incident links actual processing records before a complaint.
            groups = {}
            for t in txs:
                groups.setdefault(ref(t, "transaction_id"), []).append(t)
            actual = []
            for group in groups.values():
                current = execution_records(group, now())
                if uncontested(current):
                    actual.append(current[0])
            matching_txs = [
                t
                for t in actual
                if ref(t, "route_id") == route_cid
                and ref(t, "gateway_id") == gateway_cid
                and abs(delta(t.data["payload"]["occurred_at"], trigger.data["window_end"])) <= 300
            ]
            matched_refs = {ref(t, "transaction_id") for t in matching_txs}
            incident_txs = [t for t in txs if ref(t, "transaction_id") in matched_refs]
            for t in incident_txs:
                linked[t.id] = t
            for txref in sorted(matched_refs):
                versions = [t for t in incident_txs if ref(t, "transaction_id") == txref]
                current_txs = current_transaction_records(versions, now())
                if len({json.dumps(t.data["payload"], sort_keys=True) for t in current_txs}) > 1:
                    findings.append(
                        {
                            "kind": "contradiction",
                            "text": "Authoritative transaction records disagree across issuing sources/current revisions"
                            if len({t.data["source_id"] for t in current_txs}) > 1
                            else "Authoritative transaction records disagree at the same version",
                            "evidence_ids": [t.id for t in current_txs],
                        }
                    )
                else:
                    t = current_txs[0]
                    findings.append(
                        {
                            "kind": "recorded_status",
                            "transaction_id": t.data["payload"]["transaction_id"],
                            "text": "Cedar recorded status " + t.data["payload"]["status"],
                            "evidence_ids": [t.id],
                            "beneficiary_verified": t.data["payload"]["beneficiary_verified"],
                        }
                    )
                    if not t.data["payload"]["beneficiary_verified"]:
                        unknowns.append("Beneficiary receipt has not been independently verified")
            target_interactions = []
            for interaction in interactions:
                candidates = [
                    t
                    for t in txs
                    if interaction.data["transaction_id"] is not None
                    and ref(t, "transaction_id") == report_ref(interaction, "transaction_id")
                    and ref(t, "customer_id") == report_ref(interaction, "customer_id")
                ]
                current = execution_records(candidates, now())
                if uncontested(current):
                    p = current[0].data["payload"]
                    if (
                        ref(current[0], "route_id") == route_cid
                        and ref(current[0], "gateway_id") == gateway_cid
                        and abs(delta(p["occurred_at"], trigger.data["window_end"])) <= 300
                    ):
                        target_interactions.append(interaction)
            findings.append(
                {
                    "kind": "measurement",
                    "text": f"Timeout detector fired: {trigger.data['rule']}",
                    "evidence_ids": trigger.data["evidence_ids"],
                }
            )
            institutional_context = path_context(
                context(s, scope, trigger.data["window_end"], now(), "restricted"),
                route_cid,
                gateway_cid,
                canonical=True,
            )
            for item in institutional_context["relationships"] + institutional_context["entities"]:
                for eid in item["evidence_ids"]:
                    linked[eid] = by_id[eid]
        else:
            target_interactions = [trigger]
        for interaction in target_interactions:
            report = by_id[interaction.data["evidence_id"]]
            linked[report.id] = report
            txid = interaction.data["transaction_id"]
            # A customer-provided reference is checked against bank-provided ownership.
            candidates = [
                t
                for t in txs
                if txid is not None
                and ref(t, "transaction_id") == report_ref(interaction, "transaction_id")
                and ref(t, "customer_id") == report_ref(interaction, "customer_id")
            ]
            if not candidates:
                unknowns.append("No authorized matching transaction record for report " + report.id)
                continue
            current = current_transaction_records(candidates, now())
            if not current:
                unknowns.append("No transaction record effective at investigation time")
                continue
            for candidate in candidates:
                linked[candidate.id] = candidate
            if len({json.dumps(t.data["payload"], sort_keys=True) for t in current}) > 1:
                findings.append(
                    {
                        "kind": "contradiction",
                        "text": "Authoritative transaction records disagree across issuing sources/current revisions"
                        if len({t.data["source_id"] for t in current}) > 1
                        else "Authoritative transaction records disagree at the same version",
                        "evidence_ids": [t.id for t in current],
                    }
                )
                unknowns.append(
                    "Transaction state is contested; authorized reconciliation is required"
                )
                continue
            tx = current[0]
            p = tx.data["payload"]
            paths = execution_records(candidates, now())
            path_tx = paths[0] if uncontested(paths) else None
            good_edges, relevant, report_time_valid = [], [], False
            if path_tx:
                path_p = path_tx.data["payload"]
                if (p["route_id"], p["gateway_id"]) != (path_p["route_id"], path_p["gateway_id"]):
                    findings.append(
                        {
                            "kind": "contradiction",
                            "text": "Reconciliation/status route differs from actual execution receipt; execution path is not rewritten",
                            "evidence_ids": [tx.id, path_tx.id],
                        }
                    )
                institutional_context = path_context(
                    context(s, scope, path_p["occurred_at"], now(), "restricted"),
                    ref(path_tx, "route_id"),
                    ref(path_tx, "gateway_id"),
                    canonical=True,
                )
                for item in (
                    institutional_context["relationships"] + institutional_context["entities"]
                ):
                    for eid in item["evidence_ids"]:
                        linked[eid] = by_id[eid]
                relationships = [
                    e
                    for e in institutional_context["relationships"]
                    if e["subject_id"] == ref(path_tx, "route_id")
                    and e["predicate"] == "uses_gateway"
                ]
                for edge in relationships:
                    for eid in edge["evidence_ids"]:
                        linked[eid] = by_id[eid]
                good_edges = [
                    e
                    for e in relationships
                    if e["object_id"] == ref(path_tx, "gateway_id") and e["state"] == "accepted"
                ]
                relevant = [
                    o
                    for o in observations
                    if ref(o, "route_id") == ref(path_tx, "route_id")
                    and ref(o, "gateway_id") == ref(path_tx, "gateway_id")
                    and abs(delta(o.data["payload"]["occurred_at"], path_p["occurred_at"])) <= 300
                ]
                report_time_valid = (
                    0 <= delta(interaction.data["occurred_at"], path_p["occurred_at"]) <= 86400
                )
            else:
                institutional_context = {"entities": [], "relationships": []}
                unknowns.append(
                    "No uncontested authorized execution receipt; status/configuration does not establish a processing path"
                )
            if good_edges and relevant and report_time_valid:
                for o in relevant:
                    linked[o.id] = o
                refs = (
                    sorted({report.id, tx.id, path_tx.id})
                    + [o.id for o in relevant]
                    + good_edges[0]["evidence_ids"]
                )
                correlations.append(
                    {
                        "interaction_id": interaction.id,
                        "transaction_id": txid,
                        "route_id": path_p["route_id"],
                        "gateway_id": path_p["gateway_id"],
                        "basis": "verified reference ownership, actual processing path, temporal overlap, accepted structure",
                        "evidence_ids": refs,
                        "semantics": "observational",
                        "causation": "not_established",
                    }
                )
                if any(o.data["payload"]["timeouts"] for o in relevant):
                    hypotheses.append(
                        {
                            "text": "Gateway timeouts may be related to the reported experience",
                            "evidence_ids": refs,
                            "epistemic_status": "hypothesis",
                        }
                    )
            else:
                unknowns.append(
                    "Correlation unsupported: missing/uncontested matching route context or timed observation"
                )
            findings.append(
                {
                    "kind": "recorded_status",
                    "transaction_id": txid,
                    "text": "Cedar recorded status " + p["status"],
                    "evidence_ids": [tx.id],
                    "beneficiary_verified": p["beneficiary_verified"],
                }
            )
            if p["status"] == "pending":
                unknowns.append(
                    "Financial outcome remains pending; timeout does not establish failure"
                )
            if interaction.data["category"] == "reported_failure" and p["status"] == "completed":
                findings.append(
                    {
                        "kind": "contradiction",
                        "text": "Customer-reported failure conflicts with Cedar recorded completion",
                        "evidence_ids": [report.id, tx.id],
                    }
                )
            if not p["beneficiary_verified"]:
                unknowns.append("Beneficiary receipt has not been independently verified")
        # Context must not embed unrelated restricted names without its evidence/classification.
        used = set(linked)
        institutional_context = {
            **institutional_context,
            "entities": [
                e for e in institutional_context["entities"] if set(e["evidence_ids"]) <= used
            ],
            "relationships": [
                e for e in institutional_context["relationships"] if set(e["evidence_ids"]) <= used
            ],
        }
        snapshot = {
            "trigger_type": trigger_type,
            "trigger_id": trigger.id,
            "context": institutional_context,
            "evidence_ids": sorted(linked),
            "correlations": correlations,
            "timeline": [
                {
                    "evidence_id": e.id,
                    "type": e.data["record_type"],
                    "occurred_at": e.data["payload"].get("occurred_at", e.data["occurred_at"]),
                    "source_recorded_at": e.data["occurred_at"],
                    "received_at": e.data["received_at"],
                }
                for e in sorted(
                    linked.values(),
                    key=lambda e: e.data["payload"].get("occurred_at", e.data["occurred_at"]),
                )
            ],
            "findings": findings,
            "hypotheses": hypotheses,
            "unknowns": sorted(set(unknowns)),
            "recommendations": [
                {
                    "text": "Review source evidence and obtain authorized status verification before financial action",
                    "evidence_ids": sorted(linked),
                }
            ],
            "method": "deterministic-evidence-assembly-v1",
        }
        material = {
            "trigger": [trigger_type, trigger.id],
            "severity": ("critical" if trigger.data.get("rate", 0) >= 0.6 else "high")
            if trigger_type == "incident"
            else None,
            "rule": trigger.data.get("rule"),
            "reports": sorted(
                e.id for e in linked.values() if e.data["record_type"] == "interaction"
            ),
            "statuses": sorted(
                (
                    identity.namespace_for(s, scope, e.data["source_id"]),
                    e.data["payload"]["transaction_id"],
                    e.data["payload"]["version"],
                    e.data["payload"]["status"],
                    e.data["payload"]["beneficiary_verified"],
                    e.data["payload"]["route_id"],
                    e.data["payload"]["gateway_id"],
                )
                for e in linked.values()
                if e.data["record_type"] == "transaction"
            ),
            "structure": sorted(
                (e["subject_id"], e["predicate"], e["object_id"], e["state"])
                for e in institutional_context["relationships"]
            ),
            "correlations": sorted(
                (c["interaction_id"], c["transaction_id"], c["route_id"], c["gateway_id"])
                for c in correlations
            ),
            "unknowns": sorted(set(unknowns)),
            "classification": sorted({e.classification for e in linked.values()}),
        }
        material_fingerprint = hashlib.sha256(
            json.dumps(material, sort_keys=True).encode()
        ).hexdigest()
        if investigation.data.get("material_fingerprint") == material_fingerprint:
            continue
        # Knowledge query timestamps vary between executions; they do not by themselves merit revision.
        fingerprint_payload = {
            **snapshot,
            "context": {k: v for k, v in snapshot["context"].items() if k != "known_at"},
        }
        fingerprint = hashlib.sha256(
            json.dumps(fingerprint_payload, sort_keys=True).encode()
        ).hexdigest()
        if investigation.data.get("fingerprint") == fingerprint:
            continue
        number = investigation.data["revision"] + 1
        classification = (
            "restricted"
            if any(e.classification == "restricted" for e in linked.values())
            else investigation.classification
        )
        revision = put(
            s,
            scope,
            "investigation_revision",
            f"{investigation.id}:{number}",
            {"investigation_id": investigation.id, "number": number, **snapshot},
            classification,
        )
        investigation.data = {
            **investigation.data,
            "revision": number,
            "latest_revision_id": revision.id,
            "fingerprint": fingerprint,
            "material_fingerprint": material_fingerprint,
            "review_required": True,
        }
        investigation.classification = classification
        from apps.veriq.backend.lifecycle import stage_revision

        stage_revision(s, scope, investigation, revision)
