import json
from hashlib import sha256

from fastapi.testclient import TestClient

from apps.cedar.backend.channels import CHANNEL_SOURCES
from apps.veriq.backend.api import create_app
from apps.veriq.backend.connectors import CedarFeed
from shared.contracts import Envelope, now
from tests.conftest import SCOPE, SECRET, header, knowledge


def native_messages():
    stamp = now()
    return [
        (
            "in_app",
            "/v1/channels/in-app/messages",
            {
                "message_id": "APP-1",
                "customer_id": "C1",
                "message": "Transfer delayed",
                "sent_at": stamp,
            },
        ),
        (
            "email",
            "/v1/channels/email/messages",
            {
                "message_id": "MAIL-1",
                "customer_id": "C1",
                "subject": "Transfer issue",
                "body": "Recipient has not received it",
                "sent_at": stamp,
            },
        ),
        (
            "contact_centre",
            "/v1/channels/contact-centre/transcripts",
            {
                "call_id": "CALL-1",
                "customer_id": "C1",
                "transcript": "Customer reports a pending transfer",
                "started_at": stamp,
            },
        ),
        (
            "branch",
            "/v1/channels/branch/visits",
            {
                "visit_id": "VISIT-1",
                "customer_id": "C1",
                "notes": "Customer reports failed transfer",
                "recorded_at": stamp,
            },
        ),
    ]


def test_distinct_channel_adapters_have_native_records_and_independent_pull_status(system):
    c = system["c"]
    feeds = {}
    v = TestClient(create_app(system["vdb"], system["auth"], SCOPE, feeds=feeds))
    for channel, path, native in native_messages():
        source, grant, adapter = CHANNEL_SOURCES[channel]
        response = c.post(
            path, headers=header("customer1" if channel == "in_app" else "admin"), json=native
        )
        assert response.status_code == 201, response.text
        repeated = c.post(
            path, headers=header("customer1" if channel == "in_app" else "admin"), json=native
        )
        assert repeated.json()["id"] == response.json()["id"]
        assert (
            v.post(
                "/v1/sources",
                headers=header(),
                json={
                    "source_id": source,
                    "name": source,
                    "record_types": ["interaction"],
                    "authority": ["report"],
                    "authorization_ref": grant,
                    "ingestion_secret": SECRET,
                    "channel": channel,
                    "adapter_id": adapter,
                },
            ).status_code
            == 201
        )
        feeds[source] = {
            "feed": CedarFeed("http://localhost", "feed", client=c),
            "source_secret": SECRET,
        }
        before = next(
            s
            for s in v.get("/v1/connectors", headers=header()).json()
            if s["data"]["source_id"] == source
        )
        assert before["data"]["ingested"] == 0 and before["data"]["state"] == "registered"
        pulled = v.post(f"/v1/connectors/{source}/pull", headers=header())
        assert pulled.status_code == 200 and pulled.json()["received"] == 1
    interactions = v.get("/v1/interactions", headers=header()).json()
    assert len(interactions) == 4
    assert len({r["data"]["source_id"] for r in interactions}) == 4
    for row in interactions:
        p = row["data"]
        assert p["origin"]["native_record_id"] == p["source_native_record_id"]
        assert p["origin"]["adapter_id"] == CHANNEL_SOURCES[p["channel"]][2]
    assert all(
        r["received"] == 1 and r["state"] == "receiving"
        for r in c.get("/v1/channels", headers=header()).json()
    )
    assert all(
        r["data"]["state"] == "receiving" and r["data"]["ingested"] == 1
        for r in v.get("/v1/connectors", headers=header()).json()
    )


def test_channel_native_id_mutation_and_customer_impersonation_rejected(system):
    channel, path, payload = native_messages()[0]
    assert system["c"].post(path, headers=header("customer1"), json=payload).status_code == 201
    payload["message"] = "Changed original"
    assert system["c"].post(path, headers=header("customer1"), json=payload).status_code == 409
    assert system["c"].post(path, headers=header("customer2"), json=payload).status_code == 403
    assert system["c"].get("/v1/channels", headers=header("customer1")).status_code == 403
    _, staff_path, staff_payload = native_messages()[-1]
    assert (
        system["c"].post(staff_path, headers=header("customer1"), json=staff_payload).status_code
        == 403
    )


def test_bound_source_cannot_impersonate_another_adapter(system):
    source, grant, adapter = CHANNEL_SOURCES["email"]
    assert (
        system["v"]
        .post(
            "/v1/sources",
            headers=header(),
            json={
                "source_id": source,
                "name": source,
                "record_types": ["interaction"],
                "authority": ["report"],
                "authorization_ref": grant,
                "ingestion_secret": SECRET,
                "channel": "email",
                "adapter_id": adapter,
            },
        )
        .status_code
        == 201
    )
    envelope = Envelope(
        institution_id="cedar",
        source_id=source,
        native_record_id="MAIL-2",
        record_type="interaction",
        schema_version="1.1",
        authorization_ref=grant,
        payload={"channel": "branch", "customer_id": "C1", "text": "Delayed"},
        origin={"adapter_id": adapter, "native_record_id": "MAIL-2", "normalized_at": now()},
    )
    assert (
        system["v"]
        .post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope.record())
        .status_code
        == 403
    )


def test_v1_envelope_replay_retains_original_digest(system):
    system["register"]()
    envelope = Envelope(
        institution_id="cedar",
        source_id="knowledge-source",
        native_record_id="original",
        record_type="knowledge",
        authorization_ref="grant-1",
        payload=knowledge(),
    )
    record = envelope.model_dump(exclude={"origin"})
    expected = sha256(json.dumps(record, sort_keys=True).encode()).hexdigest()
    response = system["v"].post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=record)
    assert response.status_code == 200
    evidence = system["v"].get("/v1/evidence", headers=header()).json()[0]
    assert evidence["data"]["digest"] == expected
    assert (
        system["v"]
        .post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope.model_dump())
        .json()["duplicate"]
    )
