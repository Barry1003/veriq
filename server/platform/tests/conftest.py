import pytest
from fastapi.testclient import TestClient

from apps.cedar.backend.api import create_app as cedar_app
from apps.veriq.backend.api import create_app as veriq_app
from apps.veriq.backend.connectors import CedarFeed
from shared.auth import Auth, Principal
from shared.contracts import Envelope, now, uid
from shared.db import Database

SCOPE = "cedar:development"
SECRET = "source-secret-for-tests-00001"


def header(token="admin"):
    return {"Authorization": "Bearer " + token}


def knowledge(gateway="G1", valid_from="2026-01-01T00:00:00+00:00"):
    return {
        "entities": [
            {"native_id": "R1", "kind": "route", "name": "Transfers"},
            {"native_id": "G1", "kind": "gateway", "name": "Gateway", "aliases": ["Shared Name"]},
            {
                "native_id": "G2",
                "kind": "gateway",
                "name": "Other Gateway",
                "aliases": ["Shared Name"],
            },
        ],
        "relationships": [{"subject": "R1", "predicate": "uses_gateway", "object": gateway}],
        "valid_from": valid_from,
    }


@pytest.fixture
def system(tmp_path, monkeypatch):
    # Existing manual orchestration baseline. Ticket 004 tests explicitly enable lifecycle mode.
    monkeypatch.setenv("AUTO_AI_ENABLED", "false")
    credentials = {
        "admin": Principal("Daniel", SCOPE, ("admin",), "restricted"),
        "internal": Principal("Internal investigator", SCOPE, ("investigator",)),
        "operations": Principal("Operations analyst", SCOPE, ("operations",)),
        "customer_analyst": Principal("Customer analyst", SCOPE, ("customer_analyst",)),
        "customer1": Principal("Customer 1", SCOPE, ("customer",), customer_id="C1"),
        "customer2": Principal("Customer 2", SCOPE, ("customer",), customer_id="C2"),
        "foreign": Principal("Other institution", "other:development", ("admin",), "restricted"),
        "feed": Principal("Cedar connector", SCOPE, ("connector",), "restricted"),
    }
    auth = Auth(credentials)
    vdb = Database("sqlite:///" + str(tmp_path / "veriq.db"))
    cdb = Database("sqlite:///" + str(tmp_path / "cedar.db"))
    vdb.create_schema()
    cdb.create_schema()
    c = TestClient(cedar_app(cdb, auth, SCOPE, simulator=True))
    feeds = {}
    vapp = veriq_app(vdb, auth, SCOPE, feeds=feeds)
    v = TestClient(vapp)

    def register(
        source="knowledge-source",
        kind="knowledge",
        authority="structure",
        classification="internal",
    ):
        grant = v.post(
            "/v1/identity/namespaces",
            headers=header(),
            json={
                "namespace": "fixture-bank-identifiers",
                "authority_ref": "fixture-approved-master-registry",
                "source_ids": [source],
            },
        )
        assert grant.status_code == 200, grant.text
        response = v.post(
            "/v1/sources",
            headers=header(),
            json={
                "source_id": source,
                "identity_namespace": "fixture-bank-identifiers",
                "identity_authority_ref": "fixture-approved-master-registry",
                "name": source,
                "record_types": [kind],
                "authority": [authority],
                "max_classification": classification,
                "authorization_ref": "grant-1",
                "ingestion_secret": SECRET,
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    def send(
        payload, kind="knowledge", source="knowledge-source", classification="internal", **kwargs
    ):
        envelope = Envelope(
            institution_id="cedar",
            source_id=source,
            native_record_id=uid(),
            record_type=kind,
            authorization_ref="grant-1",
            payload=payload,
            classification=classification,
            **kwargs,
        ).model_dump()
        return v.post("/v1/ingest", headers={"X-Source-Secret": SECRET}, json=envelope)

    def connect_cedar():
        mapping = {
            "cedar-institutional": ("knowledge", "structure", "cedar-config-v1"),
            "cedar-operations": ("observation", "measurement", "cedar-monitoring-v1"),
            "cedar-service": ("interaction", "report", "cedar-support-v1"),
            "cedar-status": ("transaction", "status", "cedar-status-v1"),
        }
        for source, (kind, authority, grant) in mapping.items():
            namespace = v.post(
                "/v1/identity/namespaces",
                headers=header(),
                json={
                    "namespace": "fixture-cedar-master",
                    "authority_ref": "fixture-approved-cedar-registry",
                    "source_ids": [source],
                },
            )
            assert namespace.status_code == 200, namespace.text
            response = v.post(
                "/v1/sources",
                headers=header(),
                json={
                    "source_id": source,
                    "identity_namespace": "fixture-cedar-master",
                    "identity_authority_ref": "fixture-approved-cedar-registry",
                    "name": source,
                    "record_types": [kind],
                    "authority": [authority],
                    "max_classification": "internal",
                    "authorization_ref": grant,
                    "ingestion_secret": SECRET,
                },
            )
            assert response.status_code == 201, response.text
            feeds[source] = {
                "feed": CedarFeed("http://localhost", "feed", client=c),
                "source_secret": SECRET,
            }

    def pull_all():
        for source in ("cedar-institutional", "cedar-status", "cedar-operations", "cedar-service"):
            response = v.post(f"/v1/connectors/{source}/pull", headers=header())
            assert response.status_code == 200, response.text

    yield {
        "v": v,
        "c": c,
        "vdb": vdb,
        "cdb": cdb,
        "auth": auth,
        "vapp": vapp,
        "register": register,
        "send": send,
        "connect": connect_cedar,
        "pull": pull_all,
    }
    v.close()
    c.close()
    vdb.engine.dispose()
    cdb.engine.dispose()


def observation(gateway="G1", occurred_at=None, attempts=10, timeouts=8):
    return {
        "route_id": "R1",
        "gateway_id": gateway,
        "attempts": attempts,
        "timeouts": timeouts,
        "occurred_at": occurred_at or now(),
    }


def transaction(gateway="G1", txid="TX1", status="pending", version=1, occurred_at=None):
    return {
        "transaction_id": txid,
        "customer_id": "C1",
        "account_id": "A1",
        "amount_minor": 1000,
        "route_id": "R1",
        "gateway_id": gateway,
        "status": status,
        "response": "timeout" if status == "pending" else "reconciled",
        "version": version,
        "occurred_at": occurred_at or now(),
    }


def report(txid="TX1", channel="in_app", occurred_at=None, text="My transfer failed"):
    return {
        "customer_id": "C1",
        "transaction_id": txid,
        "channel": channel,
        "text": text,
        "occurred_at": occurred_at or now(),
    }
