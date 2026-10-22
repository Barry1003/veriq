from shared.contracts import Envelope, now, uid
from tests.conftest import SECRET, header, knowledge


def test_structured_acceptance_provenance_and_stable_identity(system):
    system["register"]()
    r = system["send"](knowledge())
    assert r.status_code == 200, r.text
    context = system["v"].get("/v1/knowledge/context", headers=header()).json()
    assert context["relationships"][0]["state"] == "accepted"
    assert context["relationships"][0]["evidence_ids"] == [r.json()["evidence_id"]]
    before = {e["native_id"]: e["canonical_id"] for e in context["entities"]}
    updated = knowledge("G2", "2026-02-01T00:00:00Z")
    updated["entities"][0]["name"] = "Renamed transfers"
    assert system["send"](updated).status_code == 200
    after = system["v"].get("/v1/knowledge/context", headers=header()).json()
    assert {e["native_id"]: e["canonical_id"] for e in after["entities"]} == before
    assert after["relationships"][0]["object"] == "G2"


def test_bitemporal_history_does_not_rewrite_previous_knowledge(system):
    system["register"]()
    assert system["send"](knowledge()).status_code == 200
    cutoff = now()
    assert system["send"](knowledge("G2", "2026-02-01T00:00:00Z")).status_code == 200
    v = system["v"]
    effective = v.get(
        "/v1/knowledge/context", headers=header(), params={"at": "2026-01-15T00:00:00Z"}
    ).json()
    assert effective["relationships"][0]["object"] == "G1"
    learned = v.get(
        "/v1/knowledge/context",
        headers=header(),
        params={"at": "2026-03-01T00:00:00Z", "known_at": cutoff},
    ).json()
    assert learned["relationships"][0]["object"] == "G1"
    assert (
        v.get("/v1/knowledge/context", headers=header()).json()["relationships"][0]["object"]
        == "G2"
    )


def test_two_authoritative_sources_remain_contested(system):
    system["register"]()
    system["register"]("other-source")
    assert system["send"](knowledge()).status_code == 200
    assert system["send"](knowledge("G2"), source="other-source").status_code == 200
    edges = system["v"].get("/v1/knowledge/context", headers=header()).json()["relationships"]
    assert len(edges) == 2
    assert {e["state"] for e in edges} == {"contested"}
    assert {e["object"] for e in edges} == {"G1", "G2"}


def test_same_source_same_effective_time_does_not_silently_choose(system):
    system["register"]()
    system["send"](knowledge())
    system["send"](knowledge("G2"))
    edges = system["v"].get("/v1/knowledge/context", headers=header()).json()["relationships"]
    assert len(edges) == 2 and all(e["state"] == "contested" for e in edges)


def test_identity_ambiguity_never_merges_names(system):
    system["register"]()
    system["send"](knowledge())
    result = (
        system["v"]
        .get("/v1/knowledge/resolve", headers=header(), params={"name": "Shared Name"})
        .json()
    )
    assert result["state"] == "ambiguous"
    assert len({e["canonical_id"] for e in result["candidates"]}) == 2


def test_invalid_edge_rolls_back_evidence_and_records_error(system):
    system["register"]()
    k = knowledge()
    k["relationships"][0]["object"] = "R1"
    result = system["send"](k)
    assert result.status_code == 422
    v = system["v"]
    assert v.get("/v1/evidence", headers=header()).json() == []
    assert v.get("/v1/knowledge/assertions", headers=header()).json() == []
    assert (
        v.get("/v1/ingestion/errors", headers=header()).json()[0]["data"]["source_id"]
        == "knowledge-source"
    )


def test_duplicate_and_mutated_native_records(system):
    system["register"]()
    envelope = Envelope(
        institution_id="cedar",
        source_id="knowledge-source",
        native_record_id=uid(),
        record_type="knowledge",
        payload=knowledge(),
        authorization_ref="grant-1",
    ).model_dump()
    v = system["v"]
    a = v.post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope)
    b = v.post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope)
    assert a.status_code == b.status_code == 200
    assert b.json()["duplicate"] is True
    assert a.json()["evidence_id"] == b.json()["evidence_id"]
    envelope["payload"]["relationships"][0]["object"] = "G2"
    assert (
        v.post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope).status_code == 409
    )
    assert len(v.get("/v1/evidence", headers=header()).json()) == 1


def test_source_grant_and_classification_are_enforced(system):
    system["register"](authority="document")
    assert system["send"](knowledge()).status_code == 403
    assert system["send"](knowledge(), classification="restricted").status_code == 403
    assert system["v"].get("/v1/evidence", headers=header()).json() == []


def test_rejection_preserves_historical_acceptance(system):
    system["register"]()
    system["send"](knowledge())
    cutoff = now()
    v = system["v"]
    assertion = v.get("/v1/knowledge/assertions", headers=header()).json()[0]
    assert (
        v.post(
            f"/v1/knowledge/assertions/{assertion['id']}/review",
            headers=header(),
            json={"decision": "rejected", "rationale": "Authority revoked by review"},
        ).status_code
        == 200
    )
    assert v.get("/v1/knowledge/context", headers=header()).json()["relationships"] == []
    assert v.get("/v1/knowledge/context", headers=header(), params={"known_at": cutoff}).json()[
        "relationships"
    ]


def test_expired_snapshot_does_not_resurrect_older_structure(system):
    system["register"]()
    system["send"](knowledge())
    k = knowledge("G2", "2026-02-01T00:00:00Z")
    k["valid_to"] = "2026-03-01T00:00:00Z"
    system["send"](k)
    assert system["v"].get("/v1/knowledge/context", headers=header()).json()["relationships"] == []
