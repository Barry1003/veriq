import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

from apps.veriq.backend.connectors import pull
from shared.contracts import Envelope
from shared.db import Database, get, rows
from tests.conftest import SCOPE, SECRET, header, knowledge


def test_pull_page_failure_does_not_advance_cursor_or_partially_ingest(system):
    system["register"]()
    good = Envelope(
        institution_id="cedar",
        source_id="knowledge-source",
        native_record_id="one",
        record_type="knowledge",
        authorization_ref="grant-1",
        payload=knowledge(),
    ).model_dump()
    bad = {**good, "native_record_id": "two", "schema_version": "invalid"}

    class BrokenFeed:
        def page(self, source_id, cursor):
            assert cursor == 0
            return {
                "items": [{"sequence": 1, "envelope": good}, {"sequence": 2, "envelope": bad}],
                "next_cursor": 2,
            }

    with pytest.raises(HTTPException) as exc:
        pull(system["vdb"], SCOPE, "knowledge-source", SECRET, BrokenFeed(), "test")
    assert exc.value.status_code == 502
    with system["vdb"].session() as s:
        assert get(s, SCOPE, "source", "knowledge-source").data["cursor"] == 0
        assert rows(s, SCOPE, "evidence") == []
        assert rows(s, SCOPE, "ingestion_error")


def test_durable_data_survives_new_engine(system, tmp_path):
    system["register"]()
    eid = system["send"](knowledge()).json()["evidence_id"]
    new = Database("sqlite:///" + str(tmp_path / "veriq.db"))
    with new.session() as s:
        assert rows(s, SCOPE, "evidence")[0].id == eid
        assert rows(s, SCOPE, "assertion")
    new.engine.dispose()


def test_alembic_fresh_migration_roundtrip(tmp_path):
    root = Path(__file__).resolve().parents[1]
    env = {**os.environ, "DATABASE_URL": "sqlite:///" + str(tmp_path / "migrated.db")}
    for command in (["upgrade", "head"], ["check"], ["downgrade", "base"], ["upgrade", "head"]):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", *command],
            cwd=root,
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
        )
        assert result.returncode == 0, result.stdout + result.stderr


def test_invalid_envelope_and_bad_timestamps_are_rejected(system):
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Envelope(
            institution_id="cedar",
            source_id="x",
            native_record_id="one",
            record_type="observation",
            authorization_ref="grant",
            payload={"route_id": "R1", "gateway_id": "G1", "attempts": 1, "timeouts": 2},
        )
    assert (
        system["v"]
        .get("/v1/knowledge/context", headers=header(), params={"at": "2026-01-01"})
        .status_code
        == 422
    )


def test_readiness_reports_missing_migrations(tmp_path, system):
    from fastapi.testclient import TestClient

    from apps.veriq.backend.api import create_app

    db = Database("sqlite:///" + str(tmp_path / "empty.db"))
    v = TestClient(create_app(db, system["auth"]))
    assert v.get("/health").status_code == 200
    assert v.get("/ready").status_code == 503
    db.create_schema()
    assert v.get("/ready").status_code == 200


def test_stale_pull_page_cannot_rewind_cursor(system):
    system["register"]()

    class InterleavedFeed:
        def page(self, source_id, cursor):
            with system["vdb"].session() as s:
                row = get(s, SCOPE, "source", source_id)
                row.data = {**row.data, "cursor": 99}
            return {"items": [], "next_cursor": 0}

    with pytest.raises(HTTPException) as exc:
        pull(system["vdb"], SCOPE, "knowledge-source", SECRET, InterleavedFeed(), "test")
    assert exc.value.status_code == 409
    with system["vdb"].session() as s:
        assert get(s, SCOPE, "source", "knowledge-source").data["cursor"] == 99
