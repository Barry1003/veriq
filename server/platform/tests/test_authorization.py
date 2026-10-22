from tests.conftest import header, knowledge, observation, report, transaction


def test_installation_isolation_and_authentication(system):
    v, c = system["v"], system["c"]
    for client, path in ((v, "/v1/investigations"), (c, "/v1/accounts")):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=header("foreign")).status_code == 403
    system["register"]()
    assert system["send"](knowledge(), environment="production").status_code == 403


def test_roles_and_source_credential_isolation(system):
    v = system["v"]
    assert v.get("/v1/interactions", headers=header("operations")).status_code == 403
    assert v.get("/v1/observations", headers=header("customer_analyst")).status_code == 403
    assert v.get("/v1/investigations", headers=header("customer1")).status_code == 403
    system["register"]()
    assert "secret" not in str(v.get("/v1/sources", headers=header()).json())
    from shared.contracts import Envelope

    envelope = Envelope(
        institution_id="cedar",
        source_id="knowledge-source",
        native_record_id="test",
        record_type="knowledge",
        authorization_ref="grant-1",
        payload=knowledge(),
    ).model_dump()
    assert (
        v.post(
            "/v1/ingest", json=envelope, headers={"X-Source-Secret": "wrong-secret-000000000000"}
        ).status_code
        == 401
    )


def test_restricted_evidence_never_leaks_via_derived_workspace_context_or_audit(system):
    v = system["v"]
    system["register"]("secret-knowledge", "knowledge", "structure", "restricted")
    system["register"]("monitoring", "observation", "measurement")
    system["register"]("support", "interaction", "report")
    system["register"]("status", "transaction", "status")
    system["send"](knowledge(), source="secret-knowledge", classification="restricted")
    system["send"](transaction(), "transaction", "status")
    system["send"](observation(), "observation", "monitoring")
    system["send"](report(), "interaction", "support")
    inv = next(
        i
        for i in v.get("/v1/investigations", headers=header()).json()
        if i["data"]["trigger_type"] == "interaction"
    )
    assert inv["classification"] == "restricted"
    assert v.get("/v1/investigations", headers=header("internal")).json() == []
    assert (
        v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header("internal")).status_code
        == 404
    )
    assert v.get("/v1/knowledge/context", headers=header("internal")).json()["entities"] == []
    assert all(
        e["classification"] == "internal"
        for e in v.get("/v1/evidence", headers=header("internal")).json()
    )
    assert (
        v.post(f"/v1/investigations/{inv['id']}/analyze", headers=header("internal")).status_code
        == 404
    )


def test_no_inference_invocation_for_unauthorized_evidence(system):
    from fastapi.testclient import TestClient

    from apps.veriq.backend.api import create_app

    class Spy:
        def run(self, *_):
            raise AssertionError("Unauthorized data reached model")

    system["register"]("secret", "document", "document", "restricted")
    eid = system["send"]({"text": "restricted"}, "document", "secret", "restricted").json()[
        "evidence_id"
    ]
    v = TestClient(create_app(system["vdb"], system["auth"], inference=Spy()))
    assert v.post(f"/v1/inference/evidence/{eid}", headers=header("internal")).status_code == 404
