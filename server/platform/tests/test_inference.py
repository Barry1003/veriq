"""All model replies here are test doubles; no test claims live model execution."""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from apps.veriq.backend.api import create_app
from apps.veriq.backend.inference import InvalidInference, LocalInference
from tests.conftest import header, knowledge, report


def adapter(reply, *, status=200, capture=None):
    def respond(request):
        if capture is not None:
            capture.append(json.loads(request.content))
        if status != 200:
            return httpx.Response(status, json={"error": "test runtime unavailable"})
        content = reply if isinstance(reply, str) else json.dumps(reply)
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    return LocalInference(
        "http://localhost/v1",
        "test-double-model",
        client=httpx.Client(transport=httpx.MockTransport(respond)),
    )


def with_adapter(system, inference):
    return TestClient(create_app(system["vdb"], system["auth"], inference=inference))


def test_real_adapter_serializes_task_and_validates_structured_response():
    capture = []
    inference = adapter(
        {"category": "transfer_delay", "transaction_reference": "TX1", "unknowns": ["Outcome"]},
        capture=capture,
    )
    result = inference.run("interpret_interaction", {"interaction": report()})
    assert result["category"] == "transfer_delay"
    assert capture[0]["model"] == "test-double-model"
    assert capture[0]["response_format"]["json_schema"]["name"] == "interpret_interaction"
    assert "untrusted evidence" in capture[0]["messages"][0]["content"]


@pytest.mark.parametrize(
    "reply",
    [
        "not json",
        {"category": "invented", "unknowns": []},
        {"category": "other", "unknowns": [], "execute_refund": True},
    ],
)
def test_malformed_model_output_is_rejected(reply):
    with pytest.raises(InvalidInference):
        adapter(reply).run("interpret_interaction", {"interaction": report()})


def test_invented_transaction_reference_is_rejected():
    with pytest.raises(InvalidInference):
        adapter(
            {"category": "transfer_delay", "transaction_reference": "HALLUCINATED", "unknowns": []}
        ).run("interpret_interaction", {"interaction": report()})


@pytest.mark.parametrize("eid,status", [("invented", "hypothesis"), ("E1", "recommendation")])
def test_unsupported_citations_and_claim_statuses_are_rejected(eid, status):
    reply = {
        "hypotheses": [
            {"text": "Possible cause", "evidence_ids": [eid], "epistemic_status": status}
        ],
        "missing_information": [],
        "recommendations": [],
    }
    with pytest.raises(InvalidInference):
        adapter(reply).run("analyze_investigation", {"evidence": [{"id": "E1"}]})


def test_document_extraction_is_candidate_until_review(system):
    system["register"]("documents", "document", "document")
    evidence = system["send"](
        {
            "text": "Effective 2026-01-01T00:00:00Z. Route R1 uses gateway G1. Route R1 named Transfers. Gateway G1 named Gateway. Gateway G2 named Other Gateway. Gateway G1 alias Shared Name. Gateway G2 alias Shared Name."
        },
        "document",
        "documents",
    ).json()["evidence_id"]
    v = with_adapter(system, adapter(knowledge()))
    response = v.post(f"/v1/inference/evidence/{evidence}", headers=header())
    assert response.status_code == 200, response.text
    assert response.json()["data"]["state"] == "validated_candidate"
    assert v.get("/v1/knowledge/context", headers=header()).json()["relationships"] == []
    assertion = v.get("/v1/knowledge/assertions", headers=header()).json()[0]
    assert assertion["data"]["method"] == "ai_extraction"
    review = v.post(
        f"/v1/knowledge/assertions/{assertion['id']}/review",
        headers=header(),
        json={"decision": "accepted", "rationale": "Human confirmed document authority and claim"},
    )
    assert review.status_code == 200
    assert v.get("/v1/knowledge/context", headers=header()).json()["relationships"][0][
        "evidence_ids"
    ] == [evidence]


def test_semantically_invalid_extraction_quarantined_without_partial_state(system):
    system["register"]("documents", "document", "document")
    eid = system["send"]({"text": "Test document"}, "document", "documents").json()["evidence_id"]
    bad = knowledge()
    bad["relationships"][0]["object"] = "R1"
    v = with_adapter(system, adapter(bad))
    result = v.post(f"/v1/inference/evidence/{eid}", headers=header())
    assert result.status_code == 200
    assert result.json()["data"]["state"] == "quarantined"
    assert v.get("/v1/knowledge/assertions", headers=header()).json() == []
    assert v.get("/v1/knowledge/context", headers=header()).json()["entities"] == []


@pytest.mark.parametrize(
    "runtime,state",
    [(None, "unavailable"), ("malformed", "quarantined"), ("offline", "unavailable")],
)
def test_failure_runs_persist_without_changing_financial_or_knowledge_state(system, runtime, state):
    system["register"]("documents", "document", "document")
    eid = system["send"]({"text": "Test document"}, "document", "documents").json()["evidence_id"]
    inference = (
        LocalInference()
        if runtime is None
        else adapter("bad response", status=503 if runtime == "offline" else 200)
    )
    v = with_adapter(system, inference)
    result = v.post(f"/v1/inference/evidence/{eid}", headers=header())
    assert result.status_code == 200, result.text
    assert result.json()["data"]["state"] == state
    assert v.get("/v1/knowledge/assertions", headers=header()).json() == []
    assert v.get("/v1/inference/runs", headers=header()).json()[0]["data"]["state"] == state
    assert system["c"].get("/v1/transactions", headers=header()).json() == []


def test_valid_investigation_analysis_remains_candidate_with_revision_lineage(system):
    system["register"]("support", "interaction", "report")
    eid = system["send"](report(txid=None), "interaction", "support").json()["evidence_id"]
    v = with_adapter(
        system,
        adapter(
            {
                "hypotheses": [
                    {
                        "text": "A customer reports a problem; its cause and financial outcome are unknown.",
                        "evidence_ids": [eid],
                        "epistemic_status": "hypothesis",
                    }
                ],
                "missing_information": [
                    "Authoritative bank outcome and beneficiary receipt are unknown."
                ],
                "recommendations": [
                    {
                        "text": "Request an authorized transaction reference and bank status verification.",
                        "evidence_ids": [eid],
                        "epistemic_status": "recommendation",
                    }
                ],
            }
        ),
    )
    inv = v.get("/v1/investigations", headers=header()).json()[0]
    result = v.post(f"/v1/investigations/{inv['id']}/analyze", headers=header()).json()
    assert result["data"]["state"] == "validated_candidate"
    workspace = v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()
    assert result["data"]["revision_id"] == workspace["revisions"][-1]["id"]
    assert workspace["inference_runs"][0]["id"] == result["id"]
    assert workspace["revisions"][-1]["data"]["findings"] == []


def test_endpoint_allowlist_blocks_unapproved_inference_and_connectors():
    from apps.veriq.backend.connectors import CedarFeed

    with pytest.raises(ValueError):
        LocalInference("https://external-ai.example/v1", "test")
    with pytest.raises(ValueError):
        CedarFeed("http://169.254.169.254", "secret")


def test_candidate_cannot_reserve_canonical_entity_type_before_acceptance(system):
    system["register"]("documents", "document", "document")
    eid = system["send"](
        {"text": "Effective 2026-01-01T00:00:00Z. Gateway NEW named AI guess."},
        "document",
        "documents",
    ).json()["evidence_id"]
    candidate = {
        "entities": [{"native_id": "NEW", "kind": "gateway", "name": "AI guess"}],
        "relationships": [],
        "valid_from": "2026-01-01T00:00:00Z",
    }
    v = with_adapter(system, adapter(candidate))
    assert (
        v.post(f"/v1/inference/evidence/{eid}", headers=header()).json()["data"]["state"]
        == "validated_candidate"
    )
    system["register"]()
    authoritative = {
        "entities": [{"native_id": "NEW", "kind": "service", "name": "Actual bank service"}],
        "relationships": [],
        "valid_from": "2026-01-01T00:00:00Z",
    }
    assert system["send"](authoritative).status_code == 200
    ai_assertion = next(
        a
        for a in v.get("/v1/knowledge/assertions", headers=header()).json()
        if a["data"]["method"] == "ai_extraction"
    )
    assert (
        v.post(
            f"/v1/knowledge/assertions/{ai_assertion['id']}/review",
            headers=header(),
            json={"decision": "accepted", "rationale": "Attempt incompatible identity acceptance"},
        ).status_code
        == 409
    )
    context = v.get("/v1/knowledge/context", headers=header()).json()
    assert context["entities"][0]["kind"] == "service"
