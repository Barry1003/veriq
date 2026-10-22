"""Ticket 004 lifecycle/identity tests; model outputs here are explicit doubles."""

import json
import threading
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.veriq.backend import identity, lifecycle, orchestration
from apps.veriq.backend.api import create_app
from apps.veriq.backend.inference import LocalInference
from shared.contracts import Envelope, Knowledge, now, uid
from shared.db import get, put, rows
from tests.conftest import SCOPE, SECRET, header, knowledge, observation, report, transaction
from tests.test_evidence_support import CLAIM, DOCUMENT
from tests.test_inference import adapter


class LifecycleDouble:
    """Application contract double, not a live inference result."""

    def run(self, task, inputs):
        if task == "extract_knowledge":
            return deepcopy(CLAIM)
        if task == "interpret_interaction":
            return {
                "category": inputs["symptom_anchor"],
                "transaction_reference": inputs["interaction"].get("transaction_id"),
                "unknowns": ["Bank-recorded transaction status is unknown"],
            }
        catalog = inputs["allowed_statements"]
        return {
            k: deepcopy(catalog[k][:1])
            for k in ("hypotheses", "recommendations", "missing_information")
        }


@pytest.fixture
def automatic(system, monkeypatch):
    monkeypatch.setenv("AUTO_AI_ENABLED", "true")
    return system


def records(system, kind):
    with system["vdb"].session() as s:
        return [deepcopy(r.data) | {"id": r.id} for r in rows(s, SCOPE, kind)]


def run(system, task_id=None, inference=None):
    return orchestration.run_one(
        system["vdb"], SCOPE, inference or LifecycleDouble(), system["auth"], task_id=task_id
    )


def test_t004_01_automatic_document_exactly_once(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    eid = s["send"](DOCUMENT["document"], "document", "documents").json()["evidence_id"]
    intents = records(s, "processing_intent")
    assert len(intents) == 1 and intents[0]["task"] == "extract_knowledge"
    assert intents[0]["target_id"] == eid
    result = run(s)
    assert (
        result["data"]["initiation"] == "automatic"
        and result["data"]["outcome"] == "validated_candidate"
    )
    assert run(s) is None
    assert len(records(s, "ai_task")) == 1
    assert s["v"].get("/v1/knowledge/context", headers=header()).json()["relationships"] == []


def test_t004_02_automatic_interpretation_retains_references(automatic):
    s = automatic
    s["register"]("support", "interaction", "report")
    eid = s["send"](report(channel="email"), "interaction", "support").json()["evidence_id"]
    for _ in range(2):
        run(s)
    row = s["v"].get("/v1/interactions", headers=header()).json()[0]["data"]
    assert row["evidence_id"] == eid and row["source_id"] == "support"
    assert row["channel"] == "email" and row["transaction_id"] == "TX1"
    assert row["ai_interpretation"]["transaction_reference"] == "TX1"
    assert row["category"] == "reported_failure" and row["text"] == "My transfer failed"


def test_t004_03_proactive_incident_before_any_complaint(automatic):
    s = automatic
    s["register"]("metrics", "observation", "measurement")
    s["send"](observation(), "observation", "metrics")
    assert records(s, "incident") and records(s, "interaction") == []
    assert records(s, "processing_intent")[0]["task"] == "analyze_investigation"
    assert run(s)["data"]["state"] == "completed"


def test_t004_04_duplicate_delivery_and_transactional_outbox(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    envelope = Envelope(
        institution_id="cedar",
        source_id="documents",
        native_record_id=uid(),
        record_type="document",
        payload=DOCUMENT["document"],
        authorization_ref="grant-1",
    ).model_dump()
    a = s["v"].post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope)
    b = s["v"].post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope)
    assert a.json()["evidence_id"] == b.json()["evidence_id"] and b.json()["duplicate"]
    lifecycle.dispatch(s["vdb"], SCOPE)
    lifecycle.dispatch(s["vdb"], SCOPE)
    assert len(records(s, "processing_intent")) == len(records(s, "ai_task")) == 1


def test_outbox_failure_rolls_back_source_record(automatic, monkeypatch):
    s = automatic
    s["register"]("documents", "document", "document")

    def fail(*args):
        raise RuntimeError("Simulated outbox persistence failure")

    monkeypatch.setattr(lifecycle, "stage_evidence", fail)
    with pytest.raises(RuntimeError, match="outbox persistence"):
        s["send"](DOCUMENT["document"], "document", "documents")
    assert records(s, "evidence") == [] and records(s, "processing_intent") == []


def test_t004_05_material_revision_without_low_event_storm(automatic):
    s = automatic
    s["register"]("metrics", "observation", "measurement")
    s["send"](observation(timeouts=4), "observation", "metrics")
    first = records(s, "investigation")[0]
    s["send"](observation(timeouts=4), "observation", "metrics")
    assert records(s, "investigation")[0]["latest_revision_id"] == first["latest_revision_id"]
    assert len(records(s, "processing_intent")) == 1
    s["send"](observation(timeouts=10), "observation", "metrics")
    s["send"](observation(timeouts=10), "observation", "metrics")
    assert len(records(s, "investigation_revision")) == len(records(s, "processing_intent")) == 2


def test_t004_06_worker_restart_and_expired_lease(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    lifecycle.dispatch(s["vdb"], SCOPE)
    claimed = orchestration.claim(s["vdb"], SCOPE)
    with s["vdb"].session() as session:
        row = get(session, SCOPE, "ai_task", claimed["id"])
        row.data = {**row.data, "lease_until": 0}
    orchestration.claim(s["vdb"], SCOPE)
    with s["vdb"].session() as session:
        row = get(session, SCOPE, "ai_task", claimed["id"])
        row.data = {**row.data, "next_attempt_at": 0}
    result = run(s)
    assert result["data"]["attempts"] == 2 and result["data"]["state"] == "completed"
    assert len(records(s, "assertion")) == 1


def test_t004_07_unavailable_never_blocks_core_processing(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    assert run(s, inference=LocalInference())["data"]["state"] == "unavailable"
    s["register"]()
    assert s["send"](knowledge()).status_code == 200
    s["register"]("metrics", "observation", "measurement")
    assert s["send"](observation(), "observation", "metrics").status_code == 200
    assert records(s, "incident")
    assert s["v"].get("/v1/knowledge/context", headers=header()).json()["relationships"]
    assert s["v"].get("/v1/investigations", headers=header()).json()
    assert s["v"].get("/ready").status_code == 200
    assert records(s, "inference_run")[0]["state"] == "unavailable"


def test_t004_08_stale_revision_rejected_during_inference(automatic):
    s = automatic
    s["register"]("metrics", "observation", "measurement")
    s["send"](observation(timeouts=4), "observation", "metrics")
    entered, release = threading.Event(), threading.Event()

    class BlockingDouble(LifecycleDouble):
        def run(self, task, inputs):
            entered.set()
            assert release.wait(8)
            return super().run(task, inputs)

    with ThreadPoolExecutor(max_workers=1) as pool:
        job = pool.submit(run, s, inference=BlockingDouble())
        assert entered.wait(8)
        s["send"](observation(timeouts=10), "observation", "metrics")
        release.set()
        result = job.result()
    assert result["data"]["state"] == "failed" and "Stale" in result["data"]["error"]
    assert records(s, "inference_run") == []


def separate_source(s, source):
    response = s["v"].post(
        "/v1/sources",
        headers=header(),
        json={
            "source_id": source,
            "name": source,
            "record_types": ["knowledge"],
            "authority": ["structure"],
            "authorization_ref": "grant-1",
            "ingestion_secret": SECRET,
        },
    )
    assert response.status_code == 201, response.text
    return s["send"](knowledge(), source=source).json()["evidence_id"]


def test_t004_09_namespace_collision_is_not_identity(automatic):
    s = automatic
    separate_source(s, "registry-a")
    separate_source(s, "registry-b")
    context = s["v"].get("/v1/knowledge/context", headers=header()).json()
    r1 = [e for e in context["entities"] if e["native_id"] == "R1"]
    assert len(r1) == 2 and len({e["canonical_id"] for e in r1}) == 2
    assert {e["state"] for e in context["relationships"]} == {"accepted"}
    assert (
        s["v"].get("/v1/knowledge/resolve", headers=header(), params={"name": "R1"}).json()["state"]
        == "ambiguous"
    )


def test_t004_10_authorized_mapping_preserves_provenance_and_history(automatic):
    s = automatic
    a, b = separate_source(s, "registry-a"), separate_source(s, "registry-b")
    cutoff = now()
    mapping = {
        "from_namespace": "source:registry-a",
        "from_native_id": "R1",
        "to_namespace": "source:registry-b",
        "to_native_id": "R1",
        "authority_ref": "reviewed-bank-master-identity",
        "evidence_ids": [a, b],
        "decision": "candidate",
        "rationale": "Bank identity officer inspected both native records",
        "valid_from": "2026-01-01T00:00:00Z",
    }
    assert s["v"].post("/v1/identity/mappings", headers=header(), json=mapping).status_code == 201
    before = s["v"].get("/v1/knowledge/context", headers=header()).json()
    assert len([e for e in before["entities"] if e["native_id"] == "R1"]) == 2
    mapping["decision"] = "accepted"
    response = s["v"].post("/v1/identity/mappings", headers=header(), json=mapping)
    assert response.status_code == 201, response.text
    after = s["v"].get("/v1/knowledge/context", headers=header()).json()
    route = [e for e in after["entities"] if e["native_id"] == "R1"]
    assert len(route) == 1 and {x["namespace"] for x in route[0]["source_identities"]} == {
        "source:registry-a",
        "source:registry-b",
    }
    historical = (
        s["v"].get("/v1/knowledge/context", headers=header(), params={"known_at": cutoff}).json()
    )
    assert len([e for e in historical["entities"] if e["native_id"] == "R1"]) == 2


def test_t004_11_source_revocation_during_model_call_blocks_publication(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    entered, release = threading.Event(), threading.Event()

    class BlockingDouble(LifecycleDouble):
        def run(self, task, inputs):
            entered.set()
            assert release.wait(8)
            return super().run(task, inputs)

    with ThreadPoolExecutor(max_workers=1) as pool:
        job = pool.submit(run, s, inference=BlockingDouble())
        assert entered.wait(8)
        response = s["v"].post(
            "/v1/sources/documents/authorization",
            headers=header(),
            json={"state": "revoked", "rationale": "Source grant revoked by bank administrator"},
        )
        assert response.status_code == 200
        release.set()
        result = job.result()
    assert result["data"]["state"] == "failed"
    assert records(s, "assertion") == records(s, "inference_run") == []
    assert s["send"](DOCUMENT["document"], "document", "documents").status_code == 403


def test_t004_12_supported_schema_is_not_accepted_knowledge(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    bad = deepcopy(CLAIM)
    bad["relationships"][0].update(subject="HG81", object="QX12")
    result = run(s, inference=adapter(bad))
    assert result["data"]["state"] == "completed" and result["data"]["outcome"] == "quarantined"
    assert records(s, "assertion") == []


def test_t004_13_status_survives_api_process_recreation(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    run(s, inference=adapter(CLAIM))

    class FreshStatusDouble:
        model = "test-double"

        def status(self):
            return {"state": "reachable", "live_inference_verified": False}

    client = TestClient(create_app(s["vdb"], s["auth"], inference=FreshStatusDouble()))
    status = client.get("/v1/inference/status", headers=header()).json()
    assert status["task_counts"]["completed"] == 1
    assert (
        status["latest_successful_inference"]
        and status["model_qualification"]["state"] == "unqualified"
    )
    assert status["display"] == "Inference available — model unqualified."


def test_t004_14_no_recursive_analysis_loop(automatic):
    s = automatic
    s["register"]("metrics", "observation", "measurement")
    s["send"](observation(), "observation", "metrics")
    before = len(records(s, "processing_intent"))
    assert run(s)["data"]["state"] == "completed"
    assert run(s) is None
    assert len(records(s, "processing_intent")) == before


def test_t004_15_previous_api_paths_and_required_fields():
    from apps.cedar.backend.api import create_app as cedar

    for name, factory in (("cedar", cedar), ("veriq", create_app)):
        old = json.loads(
            (
                Path(__file__).resolve().parents[1] / f"contracts/api/{name}-v0.3.0.openapi.json"
            ).read_text()
        )
        current = factory().openapi()
        for path, operations in old["paths"].items():
            assert path in current["paths"] and operations.keys() <= current["paths"][path].keys()
        for name, schema in old["components"]["schemas"].items():
            assert set(current["components"]["schemas"][name].get("required", [])) <= set(
                schema.get("required", [])
            )


def test_legacy_identity_migration_keeps_uuid_and_revision_references(system):
    s = system
    with s["vdb"].session() as session:
        put(
            session,
            SCOPE,
            "source",
            "old-registry",
            {
                "record_types": ["knowledge"],
                "authority": ["structure"],
                "authorization_ref": "legacy",
                "max_classification": "internal",
            },
        )
        k = Knowledge.model_validate(knowledge()).model_dump()
        e = put(
            session,
            SCOPE,
            "evidence",
            "old-registry:1",
            {"source_id": "old-registry", "record_type": "knowledge", "payload": k},
        )
        for entity in k["entities"]:
            put(
                session,
                SCOPE,
                "entity",
                entity["native_id"],
                {
                    "canonical_id": identity.legacy_id(SCOPE, entity["native_id"]),
                    "entity_kind": entity["kind"],
                },
            )
        assertion = put(
            session,
            SCOPE,
            "assertion",
            uid(),
            {
                "source_id": "old-registry",
                "evidence_id": e.id,
                "knowledge": k,
                "method": "structured",
            },
        )
        put(
            session,
            SCOPE,
            "knowledge_review",
            uid(),
            {"assertion_id": assertion.id, "decision": "accepted"},
        )
        historical = {"subject_id": identity.legacy_id(SCOPE, "R1"), "evidence_ids": [e.id]}
        revision = put(session, SCOPE, "investigation_revision", "old:1", historical)
        revision_id = revision.id
        identity.migrate_legacy(session, SCOPE)
        identity.migrate_legacy(session, SCOPE)
        assert (
            next(
                r for r in rows(session, SCOPE, "investigation_revision") if r.id == revision_id
            ).data
            == historical
        )
        assert (
            identity.resolve(session, SCOPE, "source:old-registry", "R1")
            == historical["subject_id"]
        )
        assert len(rows(session, SCOPE, "identity_binding")) == 3


def test_full_queue_defers_outbox_without_losing_input(automatic, monkeypatch):
    s = automatic
    monkeypatch.setenv("AI_TASK_QUEUE_LIMIT", "1")
    s["register"]("documents", "document", "document")
    for _ in range(2):
        assert s["send"](DOCUMENT["document"], "document", "documents").status_code == 200
    lifecycle.dispatch(s["vdb"], SCOPE)
    assert len(records(s, "evidence")) == 2
    assert {i["state"] for i in records(s, "processing_intent")} == {"scheduled", "deferred"}
    run(s)
    run(s)
    assert len(records(s, "inference_run")) == 2


def test_unrelated_namespace_cannot_correlate_matching_native_strings(automatic):
    s = automatic
    s["register"]()
    s["send"](knowledge())
    s["register"]("metrics", "observation", "measurement")
    s["send"](observation(), "observation", "metrics")
    incident_inv = records(s, "investigation")[0]
    for source, kind, authority in (
        ("foreign-status", "transaction", "status"),
        ("foreign-report", "interaction", "report"),
    ):
        response = s["v"].post(
            "/v1/sources",
            headers=header(),
            json={
                "source_id": source,
                "name": source,
                "record_types": [kind],
                "authority": [authority],
                "authorization_ref": "grant-1",
                "ingestion_secret": SECRET,
            },
        )
        assert response.status_code == 201
    s["send"](transaction(), "transaction", "foreign-status")
    s["send"](report(), "interaction", "foreign-report")
    workspace = (
        s["v"].get(f"/v1/investigations/{incident_inv['id']}/workspace", headers=header()).json()
    )
    assert workspace["revisions"][-1]["data"]["correlations"] == []
    assert not any(e["data"]["record_type"] == "transaction" for e in workspace["evidence"])


def test_automatic_status_does_not_expose_private_task_snapshot(automatic):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    run(s, inference=LocalInference())
    status = s["v"].get("/v1/inference/status", headers=header()).json()
    assert (
        not {"spec", "principal", "lease_token"} & status["latest_failed_processing"]["data"].keys()
    )


def test_automatic_tasks_are_visible_to_authorized_customer_analyst(automatic):
    s = automatic
    s["register"]("support", "interaction", "report")
    eid = s["send"](report(), "interaction", "support").json()["evidence_id"]
    lifecycle.dispatch(s["vdb"], SCOPE)
    tasks = s["v"].get("/v1/inference/tasks", headers=header("customer_analyst")).json()
    assert len(tasks) == 1 and tasks[0]["data"]["task"] == "interpret_interaction"
    detail = s["v"].get(f"/v1/processing/evidence/{eid}", headers=header("customer_analyst"))
    assert detail.status_code == 200 and len(detail.json()["tasks"]) == 1


def test_model_profile_change_restages_once_with_new_identity(automatic, monkeypatch):
    s = automatic
    s["register"]("documents", "document", "document")
    s["send"](DOCUMENT["document"], "document", "documents")
    run(s)
    monkeypatch.setenv("AI_MODEL_CONFIG_VERSION", "new-approved-profile-v2")
    run(s)
    assert len(records(s, "ai_task")) == 2
    assert len({t["scheduling_identity"] for t in records(s, "ai_task")}) == 2
    assert run(s) is None


def test_alembic_legacy_upgrade_preserves_stored_uuid_and_revision(tmp_path):
    import os
    import subprocess
    import sys

    from shared.db import Database

    root = Path(__file__).resolve().parents[1]
    url = "sqlite:///" + str(tmp_path / "legacy-upgrade.db")
    env = {**os.environ, "DATABASE_URL": url}
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "0001"],
        cwd=root,
        env=env,
        check=True,
        capture_output=True,
    )
    db = Database(url)
    legacy_uuid = "11111111-1111-4111-8111-111111111111"
    with db.session() as session:
        put(
            session,
            SCOPE,
            "source",
            "old-source",
            {
                "record_types": ["knowledge"],
                "authority": ["structure"],
                "authorization_ref": "legacy",
                "max_classification": "internal",
            },
        )
        k = Knowledge.model_validate(knowledge()).model_dump()
        evidence = put(
            session,
            SCOPE,
            "evidence",
            "old-source:one",
            {"source_id": "old-source", "record_type": "knowledge", "payload": k},
        )
        put(session, SCOPE, "entity", "R1", {"canonical_id": legacy_uuid, "entity_kind": "route"})
        put(
            session,
            SCOPE,
            "assertion",
            "old-assertion",
            {
                "source_id": "old-source",
                "evidence_id": evidence.id,
                "knowledge": k,
                "method": "structured",
            },
        )
        put(
            session,
            SCOPE,
            "investigation_revision",
            "old-inv:1",
            {"historical_entity_id": legacy_uuid, "evidence_ids": [evidence.id]},
        )
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=root,
        env=env,
        check=True,
        capture_output=True,
    )
    with db.session() as session:
        assert identity.resolve(session, SCOPE, "source:old-source", "R1") == legacy_uuid
        assert (
            get(session, SCOPE, "investigation_revision", "old-inv:1").data["historical_entity_id"]
            == legacy_uuid
        )
        assert (
            get(session, SCOPE, "identity_migration", "v0.4.0").data[
                "historical_revisions_rewritten"
            ]
            == 0
        )
    db.engine.dispose()


def test_namespace_delimiters_cannot_create_canonical_uuid_collision():
    assert identity.native_id(SCOPE, "source:a", "b:C") != identity.native_id(
        SCOPE, "source:a:b", "C"
    )
    assert identity.native_id(SCOPE, "source:a", "b:C") == identity.native_id(
        SCOPE, "source:a", "b:C"
    )


def test_canonical_path_selector_never_treats_another_native_uuid_as_equivalence():
    from apps.veriq.backend.knowledge import path_context

    projection = {
        "entities": [
            {"canonical_id": "CID-A", "native_id": "R1"},
            {"canonical_id": "CID-B", "native_id": "CID-A"},
            {"canonical_id": "CID-G", "native_id": "G1"},
        ],
        "relationships": [],
    }
    result = path_context(projection, "CID-A", "CID-G", canonical=True)
    assert {e["canonical_id"] for e in result["entities"]} == {"CID-A", "CID-G"}


def test_financial_references_do_not_inherit_institutional_entity_mappings(system):
    s = system
    s["register"]()
    s["send"](knowledge())
    with s["vdb"].session() as session:
        gateway = identity.source_ref(session, SCOPE, "knowledge-source", "G1")
        transaction_ref = identity.source_ref(
            session, SCOPE, "knowledge-source", "G1", identity_kind="transaction_id"
        )
        customer_ref = identity.source_ref(
            session, SCOPE, "knowledge-source", "G1", identity_kind="customer_id"
        )
        assert len({gateway, transaction_ref, customer_ref}) == 3


def test_namespace_contract_accepts_default_prefix_for_maximum_source_id():
    from shared.contracts import IdentityMapping, IdentityNamespace

    namespace = "source:" + "a" * 100
    assert (
        IdentityNamespace(
            namespace=namespace, authority_ref="approved-master", source_ids=["a" * 100]
        ).namespace
        == namespace
    )
    assert (
        IdentityMapping(
            from_namespace=namespace,
            from_native_id="R1",
            to_namespace="source:b",
            to_native_id="R1",
            authority_ref="approved-master",
            evidence_ids=["one", "two"],
            rationale="Authorized mapping review",
            valid_from="2026-01-01T00:00:00Z",
        ).from_namespace
        == namespace
    )


def test_internal_identity_admin_cannot_expand_a_restricted_namespace_grant(system):
    from shared.auth import Principal

    s = system
    s["register"]()
    s["auth"].credentials["limited-identity-admin"] = Principal(
        "Limited identity administrator", SCOPE, ("institution_admin",), "internal"
    )
    response = s["v"].post(
        "/v1/identity/namespaces",
        headers=header("limited-identity-admin"),
        json={
            "namespace": "fixture-bank-identifiers",
            "authority_ref": "fixture-approved-master-registry",
            "source_ids": ["unapproved-source"],
        },
    )
    assert response.status_code == 404
    assert "source_ids" not in response.text
