"""Transparent deterministic detection; correlations require identity, time and structure."""

from datetime import datetime

from shared.contracts import uid
from shared.db import get, put, rows


def delta(a: str, b: str) -> float:
    return (datetime.fromisoformat(a) - datetime.fromisoformat(b)).total_seconds()


def classify(text: str) -> str:
    text = text.casefold()
    if any(x in text for x in ("login", "password", "sign in")):
        return "access_problem"
    if any(x in text for x in ("failed", "failure")):
        return "reported_failure"
    if any(x in text for x in ("pending", "delay", "not received", "timeout")):
        return "transfer_delay"
    return "other"


def start_investigation(s, scope, trigger_type, trigger, classification):
    key = f"{trigger_type}:{trigger.id}"
    if get(s, scope, "investigation", key):
        return
    put(
        s,
        scope,
        "investigation",
        key,
        {
            "trigger_type": trigger_type,
            "trigger_id": trigger.id,
            "state": "open",
            "revision": 0,
            "review_required": True,
        },
        classification,
    )


def detect_observation(s, scope, evidence):
    p = evidence.data["payload"]
    observations = [
        r
        for r in rows(s, scope, "evidence")
        if r.data["record_type"] == "observation"
        and r.data["source_id"] == evidence.data["source_id"]
        and r.data["payload"]["route_id"] == p["route_id"]
        and r.data["payload"]["gateway_id"] == p["gateway_id"]
        and 0 <= delta(p["occurred_at"], r.data["payload"]["occurred_at"]) <= 1800
    ]
    window = [
        r for r in observations if delta(p["occurred_at"], r.data["payload"]["occurred_at"]) <= 300
    ]
    baseline = [r for r in observations if r not in window]
    attempts = sum(r.data["payload"]["attempts"] for r in window)
    timeouts = sum(r.data["payload"]["timeouts"] for r in window)
    base_attempts = sum(r.data["payload"]["attempts"] for r in baseline)
    base_timeouts = sum(r.data["payload"]["timeouts"] for r in baseline)
    rate = timeouts / attempts
    base_rate = base_timeouts / base_attempts if base_attempts else None
    absolute = attempts >= 10 and rate >= 0.30
    increase = (
        attempts >= 10
        and base_attempts >= 20
        and rate >= (base_rate + 0.15)
        and rate >= 3 * base_rate
    )
    if not (absolute or increase):
        return
    classification = (
        "restricted" if any(r.classification == "restricted" for r in observations) else "internal"
    )
    incident = next(
        (
            r
            for r in reversed(rows(s, scope, "incident"))
            if r.data["source_id"] == evidence.data["source_id"]
            and r.data["route_id"] == p["route_id"]
            and r.data["gateway_id"] == p["gateway_id"]
            and r.data["state"] != "resolved"
        ),
        None,
    )
    data = {
        "source_id": evidence.data["source_id"],
        "route_id": p["route_id"],
        "gateway_id": p["gateway_id"],
        "state": incident.data["state"] if incident else "open",
        "detector": "deterministic-window-v1",
        "rule": "timeout_rate >= 0.30 and attempts >= 10"
        if absolute
        else "rate >= 3x baseline and +0.15",
        "attempts": attempts,
        "timeouts": timeouts,
        "rate": rate,
        "baseline_rate": base_rate,
        "baseline_attempts": base_attempts,
        "evidence_ids": [r.id for r in observations],
        "window_start": min(r.data["payload"]["occurred_at"] for r in window),
        "window_end": p["occurred_at"],
        "financial_outcome": "not_established",
    }
    if incident:
        incident.data = data
        if classification == "restricted":
            incident.classification = classification
    else:
        incident = put(s, scope, "incident", uid(), data, classification)
        start_investigation(s, scope, "incident", incident, classification)


def process_interaction(s, scope, evidence):
    p = evidence.data["payload"]
    category = classify(p["text"])
    row = put(
        s,
        scope,
        "interaction",
        evidence.id,
        {
            **p,
            "evidence_id": evidence.id,
            "source_id": evidence.data["source_id"],
            "source_native_record_id": evidence.data["native_record_id"],
            "origin": evidence.data.get("origin"),
            "category": category,
            "method": "deterministic-keywords-v1",
            "processing_state": "classified",
        },
        evidence.classification,
    )
    start_investigation(s, scope, "interaction", row, row.classification)
    group = [
        r
        for r in rows(s, scope, "interaction")
        if r.data["category"] == category
        and abs(delta(p["occurred_at"], r.data["occurred_at"])) <= 3600
    ]
    if len(group) >= 2:
        key = f"{category}:{int(datetime.fromisoformat(p['occurred_at']).timestamp()) // 3600}"
        issue = get(s, scope, "issue", key)
        data = {
            "category": category,
            "count": len(group),
            "channels": sorted({r.data["channel"] for r in group}),
            "evidence_ids": [r.data["evidence_id"] for r in group],
            "meaning": "Recurring customer reports; common technical cause is not established",
        }
        classification = (
            "restricted" if any(r.classification == "restricted" for r in group) else "internal"
        )
        if issue:
            issue.data = data
            issue.classification = classification
        else:
            put(s, scope, "issue", key, data, classification)
