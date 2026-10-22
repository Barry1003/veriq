"""Opt-in real HTTP model integration. Never substitutes doubles or fallback output."""

import os

import pytest
from fastapi.testclient import TestClient

from apps.veriq.backend.api import create_app
from apps.veriq.backend.inference import LocalInference
from tests.conftest import header, report

pytestmark = [
    pytest.mark.live_ai,
    pytest.mark.skipif(
        os.getenv("VERIQ_LIVE_AI") != "1", reason="Requires explicit real local-model execution"
    ),
]


def test_live_extraction_candidate_and_authorized_acceptance(system):
    system["register"]("live-documents", "document", "document")
    eid = system["send"](
        {
            "text": "Effective 2026-10-20T00:00:00Z: Route LR1 named Local route uses gateway LG1 named Local gateway."
        },
        "document",
        "live-documents",
    ).json()["evidence_id"]
    v = TestClient(create_app(system["vdb"], system["auth"], inference=LocalInference()))
    run = v.post(f"/v1/inference/evidence/{eid}", headers=header()).json()
    assert run["data"]["state"] == "validated_candidate", run
    assert run["data"]["inference_metadata"]["transport"] == "http"
    assert v.get("/v1/knowledge/context", headers=header()).json()["relationships"] == []
    assertion = next(
        a
        for a in v.get("/v1/knowledge/assertions", headers=header()).json()
        if a["id"] == run["data"]["assertion_id"]
    )
    assert assertion["data"]["inference_run_id"] == run["id"]
    assert [
        (e["subject"], e["predicate"], e["object"])
        for e in assertion["data"]["knowledge"]["relationships"]
    ] == [("LR1", "uses_gateway", "LG1")]
    assert (
        v.post(
            f"/v1/knowledge/assertions/{assertion['id']}/review",
            headers=header(),
            json={
                "decision": "accepted",
                "rationale": "Synthetic fixture verified by authorized test reviewer",
            },
        ).status_code
        == 200
    )
    assert v.get("/v1/knowledge/context", headers=header()).json()["relationships"][0][
        "evidence_ids"
    ] == [eid]


def test_live_interpretation_is_traceable_to_original_record(system):
    system["register"]("live-support", "interaction", "report")
    eid = system["send"](
        report(txid=None, text="My transfer is pending and delayed"), "interaction", "live-support"
    ).json()["evidence_id"]
    v = TestClient(create_app(system["vdb"], system["auth"], inference=LocalInference()))
    run = v.post(f"/v1/inference/evidence/{eid}", headers=header()).json()
    assert run["data"]["state"] == "validated_candidate", run
    row = v.get("/v1/interactions", headers=header()).json()[0]
    assert row["data"]["ai_interpretation"]["category"] == "transfer_delay"
    assert row["data"]["ai_inference_run_id"] == run["id"]
    assert (
        row["data"]["evidence_id"] == eid
        and row["data"]["text"] == "My transfer is pending and delayed"
    )


def test_live_analysis_uses_authorized_evidence_and_pins_revision(system):
    system["register"]("live-support", "interaction", "report")
    system["send"](report(txid=None), "interaction", "live-support")
    v = TestClient(create_app(system["vdb"], system["auth"], inference=LocalInference()))
    inv = v.get("/v1/investigations", headers=header()).json()[0]
    workspace = v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()
    run = v.post(f"/v1/investigations/{inv['id']}/analyze", headers=header()).json()
    assert run["data"]["state"] == "validated_candidate", run
    assert run["data"]["revision_id"] == workspace["revisions"][-1]["id"]
    allowed = set(workspace["revisions"][-1]["data"]["evidence_ids"])
    for section, status in (("hypotheses", "hypothesis"), ("recommendations", "recommendation")):
        for statement in run["data"]["result"][section]:
            assert (
                set(statement["evidence_ids"]) <= allowed
                and statement["epistemic_status"] == status
            )
    assert system["c"].get("/v1/transactions", headers=header()).json() == []
