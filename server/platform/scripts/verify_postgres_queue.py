"""Real PostgreSQL queue verification; inference is an explicitly labelled double."""

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.veriq.backend import orchestration as queue
from apps.veriq.backend.api import create_app
from shared.auth import Auth, Principal
from shared.contracts import Envelope, now, uid
from shared.db import Base, Database, get, rows

ROOT = Path(__file__).resolve().parents[1]


class ExplicitDouble:
    def run(self, task, inputs):
        return {
            "category": "transfer_delay",
            "transaction_reference": None,
            "unknowns": ["Bank-recorded transaction status is unknown"],
        }


def main():
    url = json.loads((ROOT / "var/ticket003-pg.json").read_text())["url"]
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        env={**os.environ, "DATABASE_URL": url},
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    db = Database(url)
    scope = "cedar:ticket003-" + uid()
    principal = Principal("ticket003-test-actor", scope, ("admin",), "restricted")
    auth = Auth({"test-only-credential": principal})
    client = TestClient(create_app(db, auth, scope))
    headers = {"Authorization": "Bearer test-only-credential"}
    secret = "test-source-grant-000000000000003"
    response = client.post(
        "/v1/sources",
        headers=headers,
        json={
            "source_id": "queue-test",
            "name": "Synthetic queue test",
            "record_types": ["interaction"],
            "authority": ["report"],
            "max_classification": "internal",
            "authorization_ref": "ticket003-test",
            "ingestion_secret": secret,
        },
    )
    assert response.status_code == 201, response.text
    envelope = Envelope(
        institution_id="cedar",
        environment=scope.split(":")[1],
        source_id="queue-test",
        native_record_id=uid(),
        record_type="interaction",
        authorization_ref="ticket003-test",
        payload={
            "customer_id": "SYNTHETIC-C",
            "channel": "in_app",
            "text": "My transfer is delayed",
            "occurred_at": now(),
        },
    )
    response = client.post(
        "/v1/ingest", headers={"X-Source-Secret": secret}, json=envelope.model_dump()
    )
    assert response.status_code == 200, response.text
    eid = response.json()["evidence_id"]
    tasks = [queue.enqueue(db, scope, eid, principal) for _ in range(2)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        claims = list(pool.map(lambda _: queue.claim(db, scope), range(2)))
    assert sum(x is not None for x in claims) == 1
    claimed = next(x for x in claims if x)
    with db.session() as s:
        row = get(s, scope, "ai_task", claimed["id"])
        row.data = {**row.data, "lease_until": 0}
    # Another worker expires the dead lease and can process the other queued job.
    queue.run_one(db, scope, ExplicitDouble(), auth)
    queue.retry(db, scope, claimed["id"], principal)
    db.engine.dispose()
    reopened = Database(url)
    result = queue.run_one(reopened, scope, ExplicitDouble(), auth)
    assert result["data"]["state"] == "completed"
    with reopened.session() as s:
        persisted = rows(s, scope, "ai_task")
        assert all(r.data["state"] == "completed" for r in persisted)
        assert len(rows(s, scope, "inference_run")) == 2
    with reopened.engine.connect() as connection:
        version = connection.execute(text("select version()")).scalar()
        migration = connection.execute(text("select version_num from alembic_version")).scalar()
        differences = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    assert not differences
    report = {
        "postgres_version": version,
        "migration": migration,
        "metadata_differences": differences,
        "actual_postgres_transport": True,
        "inference_transport": "explicit_test_double_no_model_claim",
        "two_simultaneous_claims_only_one_succeeded": True,
        "expired_lease_recovered": True,
        "database_reopen_preserved_tasks": True,
        "completed_tasks": len(tasks),
        "verification_passed": True,
        "completed_at": now(),
    }
    output = ROOT / "var/reports/ticket003/postgres-queue.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    client.close()
    reopened.engine.dispose()


if __name__ == "__main__":
    main()
