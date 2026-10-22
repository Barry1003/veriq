from datetime import datetime, timedelta, timezone

from shared.contracts import now
from tests.conftest import header, knowledge, observation, report, transaction


def setup_sources(system):
    for source, kind, authority in (
        ("knowledge-source", "knowledge", "structure"),
        ("monitoring", "observation", "measurement"),
        ("support", "interaction", "report"),
        ("status", "transaction", "status"),
    ):
        system["register"](source, kind, authority)
    assert system["send"](knowledge()).status_code == 200


def ingest_case(
    system,
    gateway="G1",
    observation_gateway="G1",
    tx_time=None,
    obs_time=None,
    report_time=None,
    tx_status="pending",
):
    setup_sources(system)
    tx_time = tx_time or now()
    assert (
        system["send"](
            transaction(gateway, status=tx_status, occurred_at=tx_time), "transaction", "status"
        ).status_code
        == 200
    )
    assert (
        system["send"](
            observation(observation_gateway, obs_time or tx_time), "observation", "monitoring"
        ).status_code
        == 200
    )
    assert (
        system["send"](report(occurred_at=report_time), "interaction", "support").status_code == 200
    )
    v = system["v"]
    inv = next(
        i
        for i in v.get("/v1/investigations", headers=header()).json()
        if i["data"]["trigger_type"] == "interaction"
    )
    workspace = v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()
    return workspace


def test_monitoring_detects_incident_before_any_complaint(system):
    system["register"]("monitoring", "observation", "measurement")
    assert system["send"](observation(), "observation", "monitoring").status_code == 200
    v = system["v"]
    incidents = v.get("/v1/incidents", headers=header()).json()
    assert len(incidents) == 1
    incident = incidents[0]["data"]
    assert incident["attempts"] == 10 and incident["timeouts"] == 8
    assert incident["rate"] == 0.8 and incident["detector"] == "deterministic-window-v1"
    assert incident["financial_outcome"] == "not_established"
    assert v.get("/v1/interactions", headers=header()).json() == []
    assert (
        v.get("/v1/investigations", headers=header()).json()[0]["data"]["trigger_type"]
        == "incident"
    )


def test_detector_minimum_sample_and_baseline_increase(system):
    system["register"]("monitoring", "observation", "measurement")
    old = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    system["send"](
        observation(occurred_at=old, attempts=100, timeouts=1), "observation", "monitoring"
    )
    system["send"](observation(attempts=5, timeouts=1), "observation", "monitoring")
    assert system["v"].get("/v1/incidents", headers=header()).json() == []
    system["send"](observation(attempts=5, timeouts=1), "observation", "monitoring")
    incident = system["v"].get("/v1/incidents", headers=header()).json()[0]["data"]
    assert incident["rate"] == 0.2 and incident["baseline_rate"] == 0.01
    assert incident["baseline_attempts"] == 100
    assert "baseline" in incident["rule"]


def test_customer_triggered_investigation_without_monitoring(system):
    system["register"]("support", "interaction", "report")
    system["send"](report(txid=None), "interaction", "support")
    v = system["v"]
    assert v.get("/v1/incidents", headers=header()).json() == []
    inv = v.get("/v1/investigations", headers=header()).json()[0]
    w = v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()
    assert "No authorized matching transaction" in w["revisions"][-1]["data"]["unknowns"][0]


def test_unified_evidence_path_and_pending_outcome(system):
    w = ingest_case(system)
    revision = w["revisions"][-1]["data"]
    assert len(revision["correlations"]) == 1
    assert revision["correlations"][0]["causation"] == "not_established"
    assert {e["data"]["record_type"] for e in w["evidence"]} == {
        "knowledge",
        "transaction",
        "interaction",
        "observation",
    }
    assert any("timeout does not establish failure" in u for u in revision["unknowns"])
    assert all(
        set(f["evidence_ids"]) <= set(revision["evidence_ids"]) for f in revision["findings"]
    )


def test_wrong_processing_gateway_rejects_correlation(system):
    w = ingest_case(system, gateway="G2", observation_gateway="G1")
    assert w["revisions"][-1]["data"]["correlations"] == []
    assert "Correlation unsupported" in " ".join(w["revisions"][-1]["data"]["unknowns"])


def test_observation_outside_time_window_rejects_correlation(system):
    old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    w = ingest_case(system, obs_time=old)
    assert w["revisions"][-1]["data"]["correlations"] == []


def test_report_before_transaction_rejects_correlation(system):
    old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    w = ingest_case(system, report_time=old)
    assert w["revisions"][-1]["data"]["correlations"] == []


def test_similar_reports_preserve_channels_without_inventing_common_cause(system):
    setup_sources(system)
    system["send"](report(txid=None), "interaction", "support")
    system["send"](report(txid="unrelated", channel="branch"), "interaction", "support")
    v = system["v"]
    issue = v.get("/v1/issues", headers=header()).json()[0]["data"]
    assert issue["count"] == 2 and issue["channels"] == ["branch", "in_app"]
    assert "common technical cause is not established" in issue["meaning"]
    for inv in v.get("/v1/investigations", headers=header()).json():
        assert (
            v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()[
                "revisions"
            ][-1]["data"]["correlations"]
            == []
        )


def test_later_status_creates_revision_without_rewriting_prior_findings(system):
    w = ingest_case(system)
    initial = w["revisions"][-1]
    tx = next(
        e["data"]["payload"] for e in w["evidence"] if e["data"]["record_type"] == "transaction"
    )
    tx.update(status="completed", response="reconciled", version=2)
    assert system["send"](tx, "transaction", "status").status_code == 200
    v = system["v"]
    updated = v.get(
        f"/v1/investigations/{w['investigation']['id']}/workspace", headers=header()
    ).json()
    assert updated["revisions"][0] == initial
    assert len(updated["revisions"]) == len(w["revisions"]) + 1
    assert any(f["kind"] == "contradiction" for f in updated["revisions"][-1]["data"]["findings"])
    assert any("pending" in u for u in updated["revisions"][0]["data"]["unknowns"])


def test_conflicting_authoritative_status_is_contested(system):
    w = ingest_case(system)
    system["register"]("alternate-status", "transaction", "status")
    tx = next(
        e["data"]["payload"] for e in w["evidence"] if e["data"]["record_type"] == "transaction"
    )
    tx.update(status="completed", response="reconciled")
    system["send"](tx, "transaction", "alternate-status")
    updated = (
        system["v"]
        .get(f"/v1/investigations/{w['investigation']['id']}/workspace", headers=header())
        .json()
    )
    latest = updated["revisions"][-1]["data"]
    assert latest["correlations"] == []
    assert any("contested" in u for u in latest["unknowns"])
    assert any(f["kind"] == "contradiction" for f in latest["findings"])


def test_contested_structure_prevents_correlation(system):
    w = ingest_case(system)
    system["register"]("conflicting-config")
    system["send"](knowledge("G2"), source="conflicting-config")
    updated = (
        system["v"]
        .get(f"/v1/investigations/{w['investigation']['id']}/workspace", headers=header())
        .json()
    )
    assert updated["revisions"][-1]["data"]["correlations"] == []


def test_state_changes_and_review_are_audited(system):
    w = ingest_case(system)
    v = system["v"]
    inv_id = w["investigation"]["id"]
    assert (
        v.post(
            f"/v1/investigations/{inv_id}/review",
            headers=header(),
            json={"rationale": "Evidence reviewed by analyst"},
        ).status_code
        == 200
    )
    assert (
        v.post(
            f"/v1/investigations/{inv_id}/state",
            headers=header(),
            json={"state": "resolved", "rationale": "Authorized status verification completed"},
        ).status_code
        == 200
    )
    updated = v.get(f"/v1/investigations/{inv_id}/workspace", headers=header()).json()
    assert updated["investigation"]["data"]["state"] == "resolved"
    assert updated["investigation"]["data"]["review_required"] is False
    assert updated["review_history"][0]["data"]["revision_id"] == w["revisions"][-1]["id"]
    assert any(
        a["data"]["action"] == "investigation.state_changed"
        for a in v.get("/v1/audit", headers=header()).json()
    )


def test_independent_measurement_sources_do_not_double_count_sample(system):
    system["register"]("monitor-a", "observation", "measurement")
    system["register"]("monitor-b", "observation", "measurement")
    for source in ("monitor-a", "monitor-b"):
        assert (
            system["send"](observation(attempts=5, timeouts=5), "observation", source).status_code
            == 200
        )
    assert system["v"].get("/v1/incidents", headers=header()).json() == []


def test_separate_service_dependency_source_is_retrieved_with_provenance(system):
    w = ingest_case(system)
    system["register"]("service-inventory", "knowledge", "structure", "restricted")
    inventory = {
        "entities": [
            {"native_id": "G1", "kind": "gateway", "name": "Primary gateway"},
            {"native_id": "S1", "kind": "service", "name": "Restricted payment processor"},
        ],
        "relationships": [{"subject": "G1", "predicate": "depends_on", "object": "S1"}],
        "valid_from": "2026-01-01T00:00:00Z",
    }
    eid = system["send"](inventory, source="service-inventory", classification="restricted").json()[
        "evidence_id"
    ]
    updated = (
        system["v"]
        .get(f"/v1/investigations/{w['investigation']['id']}/workspace", headers=header())
        .json()
    )
    latest = updated["revisions"][-1]["data"]
    assert any(e["native_id"] == "S1" for e in latest["context"]["entities"])
    assert any(
        e["predicate"] == "depends_on" and e["evidence_ids"] == [eid]
        for e in latest["context"]["relationships"]
    )
    assert eid in latest["evidence_ids"]
    assert updated["investigation"]["classification"] == "restricted"
    assert (
        system["v"]
        .get(f"/v1/investigations/{w['investigation']['id']}/workspace", headers=header("internal"))
        .status_code
        == 404
    )
