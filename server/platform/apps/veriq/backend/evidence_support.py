"""Conservative, deterministic support checks, not general natural-language entailment.

The narrow English grammar intentionally abstains on unfamiliar prose. No evaluation
answers, external authority inference, fuzzy identity resolution or model judges.
"""

import hashlib
import json
import re
from copy import deepcopy

from apps.veriq.backend.knowledge import COMPATIBILITY
from shared.contracts import instant

VERSION = "support-v1"
MAX_INPUT_BYTES = 18000
MAX_EVIDENCE = 12
DIRECTIVE = re.compile(
    r"ignore (?:all |the |any |prior |previous |system )|system override|untrusted instruction|"
    r"output a |invent |refund (?:it|everyone)|issue a refund|mark my payment|"
    r"(?:say|state|claim|pretend) (?:that |the )?(?:transfer|payment)|fabricate",
    re.I,
)
TYPED = re.compile(
    r"\b(route|gateway|service|system|process|procedure)\s+([A-Z][A-Z0-9_-]{0,59})\b", re.I
)
IDENTIFIER = re.compile(r"\b[A-Z][A-Z0-9_-]*[0-9][A-Z0-9_-]*\b")
NEGATION = re.compile(
    r"\bnot\b|\bnever\b|\bunknown\b|\bno\b|\bneither\b|\bif\b|\bmay\b|\bmight\b|\bcould\b", re.I
)


class UnsupportedEvidence(Exception):
    pass


def sentences(text):
    # Periods in timestamps and identifiers are deliberately outside this grammar.
    return [(m.start(), m.end(), m.group()) for m in re.finditer(r"[^.!?;\n]+[.!?;]?", text)]


def safe_text(text):
    return " ".join(s for _, _, s in sentences(text) if not DIRECTIVE.search(s))


def extraction_support(inputs):
    text = inputs["document"]["text"]
    if DIRECTIVE.search(text):
        raise UnsupportedEvidence("Directive-bearing institutional prose requires manual review")
    entities, claims = {}, []
    for start, end, sentence in sentences(text):
        if DIRECTIVE.search(sentence):
            continue
        for m in TYPED.finditer(sentence):
            kind, identifier = m.groups()
            # IDs remain exact and case-sensitive; prose 'route named' is not an ID.
            if identifier != identifier.upper():
                continue
            if identifier in entities and entities[identifier]["kind"] != kind.lower():
                raise UnsupportedEvidence("Conflicting source identity types")
            entities[identifier] = {
                "kind": kind.lower(),
                "span": [start + m.start(2), start + m.end(2)],
            }
        if NEGATION.search(sentence):
            continue
        for predicate, verb in (
            ("uses_gateway", r"uses(?:\s+gateway)?"),
            ("depends_on", r"depends\s+on(?:\s+(?:service|gateway))?"),
            ("belongs_to", r"belongs\s+to(?:\s+system)?"),
            ("governed_by", r"is\s+governed\s+by(?:\s+procedure)?"),
        ):
            pattern = rf"\b([A-Z][A-Z0-9_-]*)\b(?:\s*,?\s+named\s+[^,.;]+?,?)?\s+{verb}\s+([A-Z][A-Z0-9_-]*)\b"
            for m in re.finditer(pattern, sentence):
                claims.append(
                    {
                        "subject": m[1],
                        "predicate": predicate,
                        "object": m[2],
                        "span": [start + m.start(), start + m.end()],
                    }
                )
    effective = re.search(
        r"\beffective\s+(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+]00:00))", safe_text(text), re.I
    )
    valid_from = effective[1] if effective else inputs.get("source_occurred_at")
    return {"entities": entities, "relationships": claims, "valid_from": valid_from, "text": text}


def symptom_category(text):
    text = safe_text(text).lower()
    text = re.sub(
        r"\b(?:not|never|hasn't|has not|didn't|did not)\s+(?:been\s+)?(?:failed|a failure)\b",
        "",
        text,
    )
    if re.search(r"login|password|sign in|access (?:is )?(?:blocked|denied)", text):
        return "access_problem"
    if re.search(r"\bfailed\b|\bfailure\b", text):
        return "reported_failure"
    if re.search(r"\bpending\b|\bdelay\w*\b|not received|timeout", text):
        return "transfer_delay"
    return None  # Abstain; an unmatched phrase is not proof of 'other'.


def analysis_catalog(inputs):
    evidence = inputs["evidence"]
    as_of = inputs.get("as_of")
    latest = {}
    for e in evidence:
        p = e.get("payload", {})
        if (
            e["record_type"] == "transaction"
            and "status" in e.get("authority", [])
            and p.get("transaction_id")
            and isinstance(p.get("version"), int)
        ):
            if as_of and p.get("occurred_at") and instant(p["occurred_at"]) > instant(as_of):
                continue
            latest[(e.get("identity_namespace"), p["transaction_id"])] = max(
                latest.get((e.get("identity_namespace"), p["transaction_id"]), 0), p["version"]
            )
    evidence = [
        e
        for e in evidence
        if not (
            as_of
            and e.get("payload", {}).get("occurred_at")
            and instant(e["payload"]["occurred_at"]) > instant(as_of)
        )
        and not (
            e["record_type"] == "transaction"
            and "status" in e.get("authority", [])
            and (e.get("identity_namespace"), e.get("payload", {}).get("transaction_id")) in latest
            and e["payload"].get("version")
            != latest[(e.get("identity_namespace"), e["payload"]["transaction_id"])]
        )
    ]
    hypotheses, recommendations, missing = [], [], []
    statuses = {}
    for e in evidence:
        eid, p = e["id"], e.get("payload", {})
        authority = e.get("authority", [])
        # Direct callers must explicitly supply authority. In production this is
        # injected from the authenticated source registration, never source prose.
        if e["record_type"] == "transaction" and "status" in authority:
            key = (e.get("identity_namespace"), p.get("transaction_id"), p.get("version"))
            statuses.setdefault(key, []).append(e)
            status = p.get("status")
            if status in {"pending", "completed", "failed"}:
                hypotheses.append(
                    {
                        "text": f"Source records bank status {status}; beneficiary receipt is not established by this statement.",
                        "evidence_ids": [eid],
                        "epistemic_status": "hypothesis",
                    }
                )
                recommendations.append(
                    {
                        "text": "Request authorized transaction status and independent beneficiary receipt verification before financial action.",
                        "evidence_ids": [eid],
                        "epistemic_status": "recommendation",
                    }
                )
                missing.append(
                    "Independently verified beneficiary receipt and final outcome remain unknown."
                )
        elif e["record_type"] == "interaction" and "report" in authority:
            hypotheses.append(
                {
                    "text": "A customer reports a problem; its cause and financial outcome are unknown.",
                    "evidence_ids": [eid],
                    "epistemic_status": "hypothesis",
                }
            )
            recommendations.append(
                {
                    "text": "Request an authorized transaction reference and bank status verification.",
                    "evidence_ids": [eid],
                    "epistemic_status": "recommendation",
                }
            )
            missing.append("Authoritative bank outcome and beneficiary receipt are unknown.")
        elif e["record_type"] == "observation" and "measurement" in authority:
            if isinstance(p.get("attempts"), int) and isinstance(p.get("timeouts"), int):
                hypotheses.append(
                    {
                        "text": f"The source records {p['timeouts']} timeouts in {p['attempts']} attempts; financial outcomes are unknown.",
                        "evidence_ids": [eid],
                        "epistemic_status": "hypothesis",
                    }
                )
                recommendations.append(
                    {
                        "text": "Inspect authorized operational measurements and relevant configuration before attributing a cause.",
                        "evidence_ids": [eid],
                        "epistemic_status": "recommendation",
                    }
                )
                missing.append("A verified causal explanation is missing.")
    conflicts = []
    for records in statuses.values():
        if len({e["payload"].get("status") for e in records}) > 1:
            ids = sorted(e["id"] for e in records)
            conflicts.append(ids)
            # Remove individual status suggestions in the conflicting group.
            hypotheses = [x for x in hypotheses if not set(x["evidence_ids"]) & set(ids)]
            hypotheses.insert(
                0,
                {
                    "text": "Authorized sources contain conflicting bank statuses; the final outcome is unresolved.",
                    "evidence_ids": ids,
                    "epistemic_status": "hypothesis",
                },
            )
            recommendations.insert(
                0,
                {
                    "text": "Resolve the conflicting authoritative status records before any financial action.",
                    "evidence_ids": ids,
                    "epistemic_status": "recommendation",
                },
            )
            missing.append(
                "Conflicting authoritative statuses require reconciliation; beneficiary receipt is unknown."
            )
    return {
        "hypotheses": hypotheses,
        "recommendations": recommendations,
        "missing_information": sorted(set(missing)),
        "conflicts": conflicts,
    }


def prepare(task, inputs):
    if len(json.dumps(inputs).encode()) > MAX_INPUT_BYTES:
        raise UnsupportedEvidence("Input exceeds bounded task budget; split the evidence task")
    prepared = deepcopy(inputs)
    if task == "extract_knowledge":
        support = extraction_support(inputs)
        prepared["document"]["text"] = safe_text(inputs["document"]["text"])
        prepared["supported_claims"] = {k: v for k, v in support.items() if k != "text"}
    elif task == "interpret_interaction":
        prepared["interaction"]["text"] = safe_text(inputs["interaction"]["text"])
        prepared["resolved_reference"] = inputs["interaction"].get("transaction_id")
        prepared["symptom_anchor"] = symptom_category(inputs["interaction"]["text"])
        prepared["allowed_unknowns"] = [
            "Bank-recorded transaction status is unknown",
            "Beneficiary receipt is unverified",
            "Authorized final transaction outcome is unknown",
        ]
    else:
        if len(inputs["evidence"]) > MAX_EVIDENCE:
            raise UnsupportedEvidence("Too many evidence records; split the investigation task")
        catalog = analysis_catalog(inputs)
        if not catalog["hypotheses"]:
            raise UnsupportedEvidence("No authorized supported analysis statements; abstain")
        # Language model ranks/selects an application-built catalog. Raw prose,
        # unrelated identities and full workspaces never enter this model task.
        prepared = {
            "evidence": [{"id": e["id"]} for e in inputs["evidence"]],
            "allowed_statements": catalog,
        }
    return prepared


def verify(task, inputs, result):
    """Raise on unsupported output; never silently repair a model's answer."""
    receipts = []
    if task == "extract_knowledge":
        support = extraction_support(inputs)
        text = support["text"]
        kinds = {e["native_id"]: e["kind"] for e in result["entities"]}
        for entity in result["entities"]:
            identifier = entity["native_id"]
            anchor = support["entities"].get(identifier)
            if not anchor or anchor["kind"] != entity["kind"]:
                raise UnsupportedEvidence("Entity identifier/type lacks an explicit source anchor")
            for value, label in [
                (entity["name"], "named"),
                *[(x, "alias") for x in entity.get("aliases", [])],
            ]:
                binding = re.search(
                    r"\b"
                    + re.escape(identifier)
                    + r"\b\s*,?\s*(?:is\s+|has\s+)?"
                    + label
                    + r"\s+"
                    + re.escape(value)
                    + r"(?=[,.;!?]|\s+(?:uses|depends|belongs|is governed|and)|$)",
                    safe_text(text),
                )
                if not binding:
                    raise UnsupportedEvidence(
                        "Display name/alias lacks an identity-bound source span"
                    )
                receipts.append(
                    {
                        "claim": {"entity": identifier, label: value},
                        "source_span_text": binding.group(),
                    }
                )
            receipts.append({"claim": identifier, "span": anchor["span"]})
        for edge in result["relationships"]:
            anchor = next(
                (
                    c
                    for c in support["relationships"]
                    if all(c[k] == edge[k] for k in ("subject", "predicate", "object"))
                ),
                None,
            )
            subject, obj = COMPATIBILITY[edge["predicate"]]
            if (
                not anchor
                or kinds.get(edge["subject"]) not in subject
                or kinds.get(edge["object"]) not in obj
            ):
                raise UnsupportedEvidence("Relationship lacks a positive typed source span")
            receipts.append({"claim": edge, "span": anchor["span"]})
        if not support["valid_from"] or instant(result["valid_from"]) != instant(
            support["valid_from"]
        ):
            raise UnsupportedEvidence("Effective timestamp lacks source support")
        if result.get("valid_to") is not None:
            raise UnsupportedEvidence("End-time extraction is outside the supported grammar")
    elif task == "interpret_interaction":
        original = inputs["interaction"]
        if result.get("transaction_reference") != original.get("transaction_id"):
            raise UnsupportedEvidence("Missing or invented exact transaction reference")
        anchor = symptom_category(original["text"])
        if not anchor or result["category"] != anchor:
            raise UnsupportedEvidence("Customer category lacks a matching symptom anchor")
        allowed_unknowns = prepare(task, inputs)["allowed_unknowns"]
        if any(value not in allowed_unknowns for value in result["unknowns"]):
            raise UnsupportedEvidence(
                "Unknowns must select a bounded missing-verification statement"
            )
        if not result["unknowns"]:
            raise UnsupportedEvidence("Customer report must preserve outcome uncertainty")
        receipts.append(
            {
                "claim": "reported_symptom",
                "source_text": original["text"],
                "not_financial_status": True,
            }
        )
    else:
        catalog = analysis_catalog(inputs)
        for section in ("hypotheses", "recommendations"):
            for statement in result[section]:
                if not any(
                    statement["text"] == x["text"]
                    and set(statement["evidence_ids"]) == set(x["evidence_ids"])
                    and statement["epistemic_status"] == x["epistemic_status"]
                    for x in catalog[section]
                ):
                    raise UnsupportedEvidence(
                        "Analysis statement/citation pair is not supported by authorized facts"
                    )
                receipts.append({"claim": statement, "support": "deterministic_catalog"})
        if not result["hypotheses"] or not result["recommendations"]:
            raise UnsupportedEvidence("Analysis must select a supported statement and next check")
        if not result["missing_information"] or any(
            x not in catalog["missing_information"] for x in result["missing_information"]
        ):
            raise UnsupportedEvidence("Unsupported or missing verification question")
        for conflict in catalog["conflicts"]:
            if not any(
                set(s["evidence_ids"]) == set(conflict) and "conflicting" in s["text"]
                for s in result["hypotheses"]
            ):
                raise UnsupportedEvidence("Analysis omitted a deterministic status conflict")
    return {
        "version": VERSION,
        "state": "supported_candidate",
        "receipts": receipts,
        "input_sha256": hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest(),
        "limits": "Narrow deterministic grammar/catalog; not general semantic entailment or source truth certification",
    }
