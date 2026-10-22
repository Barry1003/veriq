import json
from pathlib import Path

from fastapi.testclient import TestClient

from apps.veriq.backend.api import create_app
from scripts.evaluate_ai import score
from tests.conftest import header, knowledge, report
from tests.test_inference import adapter


def test_ai_lineage_links_assertions_and_interpretations_to_durable_run(system):
    system["register"]("documents", "document", "document")
    eid = system["send"](
        {
            "text": "Effective 2026-01-01T00:00:00Z. Route R1 uses gateway G1. Route R1 named Transfers. Gateway G1 named Gateway. Gateway G2 named Other Gateway. Gateway G1 alias Shared Name. Gateway G2 alias Shared Name."
        },
        "document",
        "documents",
    ).json()["evidence_id"]
    v = TestClient(create_app(system["vdb"], system["auth"], inference=adapter(knowledge())))
    run = v.post(f"/v1/inference/evidence/{eid}", headers=header()).json()
    assertion = next(
        a
        for a in v.get("/v1/knowledge/assertions", headers=header()).json()
        if a["id"] == run["data"]["assertion_id"]
    )
    assert assertion["data"]["inference_run_id"] == run["id"]
    assert run["data"]["inference_metadata"]["transport"] == "injected_client"
    system["register"]("support", "interaction", "report")
    eid = system["send"](report(), "interaction", "support").json()["evidence_id"]
    v = TestClient(
        create_app(
            system["vdb"],
            system["auth"],
            inference=adapter(
                {
                    "category": "reported_failure",
                    "transaction_reference": "TX1",
                    "unknowns": ["Bank-recorded transaction status is unknown"],
                }
            ),
        )
    )
    run = v.post(f"/v1/inference/evidence/{eid}", headers=header()).json()
    row = v.get("/v1/interactions", headers=header()).json()[0]
    assert row["data"]["ai_inference_run_id"] == run["id"]
    assert row["data"]["evidence_id"] in run["data"]["evidence_ids"]
    assert row["data"]["text"] == "My transfer failed"


def test_quality_scoring_detects_schema_valid_but_unsupported_relationship():
    cases = json.loads(
        (Path(__file__).resolve().parents[1] / "evaluations/cases.json").read_text()
    )["cases"]
    case = next(c for c in cases if c["id"] == "extract_no_cooccurrence_link")
    wrong = {
        "entities": [{"native_id": "R8", "kind": "route"}, {"native_id": "G8", "kind": "gateway"}],
        "relationships": [{"subject": "R8", "predicate": "uses_gateway", "object": "G8"}],
    }
    checks = score(case, wrong)
    assert checks["entity_set"] is True and checks["supported_edges"] is False


def test_v0_2_retains_previous_api_paths_and_required_request_fields():
    from apps.cedar.backend.api import create_app as cedar
    from apps.veriq.backend.api import create_app as veriq

    root = Path(__file__).resolve().parents[1] / "contracts/api"
    for name, factory in (("cedar", cedar), ("veriq", veriq)):
        previous = json.loads((root / f"{name}-v0.1.0.openapi.json").read_text())
        current = factory().openapi()
        for path, operations in previous["paths"].items():
            assert path in current["paths"]
            for method in operations:
                assert method in current["paths"][path]
        for name, schema in previous["components"]["schemas"].items():
            assert set(current["components"]["schemas"][name].get("required", [])) <= set(
                schema.get("required", [])
            )
