"""Real DB orchestration with labelled inference doubles; no runtime quality claims."""

import threading
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from apps.veriq.backend import orchestration as queue
from apps.veriq.backend.api import create_app
from apps.veriq.backend.inference import LocalInference
from shared.auth import Auth
from shared.db import Database, get, rows
from tests.conftest import SCOPE, header, observation, report
from tests.test_inference import adapter

REPLY = {
    "category": "reported_failure",
    "transaction_reference": "TX1",
    "unknowns": ["Bank-recorded transaction status is unknown"],
}


def enqueue(system, token="admin"):
    if not system["v"].get("/v1/sources", headers=header()).json():
        system["register"]("support", "interaction", "report")
    eid = system["send"](report(), "interaction", "support").json()["evidence_id"]
    response = system["v"].post(f"/v1/inference/tasks/evidence/{eid}", headers=header(token))
    assert response.status_code == 202, response.text
    return response.json()


def test_queue_survives_database_reopen_and_completes_once(system):
    task = enqueue(system)
    assert task["data"]["state"] == "queued"
    assert not {"spec", "principal", "lease_token"} & task["data"].keys()
    db = Database(str(system["vdb"].engine.url))
    result = queue.run_one(db, SCOPE, adapter(REPLY), system["auth"])
    assert result["data"]["state"] == "completed"
    assert result["data"]["outcome"] == "validated_candidate"
    assert queue.run_one(db, SCOPE, adapter(REPLY), system["auth"]) is None
    with db.session() as s:
        assert len(rows(s, SCOPE, "inference_run")) == 1
    db.engine.dispose()


def test_unconfigured_then_manual_retry_can_complete(system):
    task = enqueue(system)
    result = queue.run_one(system["vdb"], SCOPE, LocalInference(), system["auth"])
    assert result["data"]["state"] == "unavailable"
    assert queue.run_one(system["vdb"], SCOPE, adapter(REPLY), system["auth"]) is None
    retry = system["v"].post(f"/v1/inference/tasks/{task['id']}/retry", headers=header())
    assert retry.status_code == 200
    assert (
        queue.run_one(system["vdb"], SCOPE, adapter(REPLY), system["auth"])["data"]["state"]
        == "completed"
    )


def test_transient_failure_backoff_and_finite_attempt_budget(system, monkeypatch):
    monkeypatch.setenv("AI_TASK_MAX_ATTEMPTS", "2")
    task = enqueue(system)
    clock = [1000.0]
    monkeypatch.setattr(queue.time, "time", lambda: clock[0])
    result = queue.run_one(system["vdb"], SCOPE, adapter({}, status=503), system["auth"])
    assert result["data"]["state"] == "retryable"
    assert queue.run_one(system["vdb"], SCOPE, adapter(REPLY), system["auth"]) is None
    clock[0] += 11
    result = queue.run_one(system["vdb"], SCOPE, adapter({}, status=503), system["auth"])
    assert result["data"]["state"] == "failed" and result["data"]["attempts"] == 2
    assert (
        system["v"].post(f"/v1/inference/tasks/{task['id']}/retry", headers=header()).status_code
        == 409
    )


def test_crashed_worker_lease_expires_and_requeues(system, monkeypatch):
    task = enqueue(system)
    clock = [1000.0]
    monkeypatch.setattr(queue.time, "time", lambda: clock[0])
    first = queue.claim(system["vdb"], SCOPE)
    assert first["data"]["state"] == "running"
    clock[0] += 241
    assert queue.claim(system["vdb"], SCOPE) is None  # expiry backoff
    clock[0] += 11
    second = queue.claim(system["vdb"], SCOPE)
    assert second["id"] == task["id"] and second["data"]["attempts"] == 2
    assert second["data"]["lease_token"] != first["data"]["lease_token"]


def test_two_workers_cannot_exceed_shared_concurrency_one(system):
    enqueue(system)
    enqueue(system)
    with ThreadPoolExecutor(max_workers=2) as pool:
        claims = list(pool.map(lambda _: queue.claim(system["vdb"], SCOPE), range(2)))
    assert sum(x is not None for x in claims) == 1


def test_stale_worker_output_is_not_published(system):
    task = enqueue(system)
    entered, release = threading.Event(), threading.Event()

    class BlockingDouble:
        def run(self, task_name, inputs):
            entered.set()
            assert release.wait(5)
            return REPLY

    with ThreadPoolExecutor(max_workers=1) as pool:
        job = pool.submit(queue.run_one, system["vdb"], SCOPE, BlockingDouble(), system["auth"])
        assert entered.wait(5)
        with system["vdb"].session() as s:
            row = get(s, SCOPE, "ai_task", task["id"])
            row.data = {**row.data, "lease_until": 0}
        release.set()
        assert job.result() is None
    with system["vdb"].session() as s:
        assert rows(s, SCOPE, "inference_run") == []


def test_ingestion_monitoring_and_accepted_knowledge_continue_while_runtime_down(system):
    enqueue(system)
    queue.run_one(system["vdb"], SCOPE, LocalInference(), system["auth"])
    system["register"]()
    from tests.conftest import knowledge

    assert system["send"](knowledge()).status_code == 200
    assert system["v"].get("/v1/knowledge/context", headers=header()).json()["relationships"]
    system["register"]("metrics", "observation", "measurement")
    assert system["send"](observation(), "observation", "metrics").status_code == 200
    assert system["v"].get("/v1/incidents", headers=header()).json()
    assert system["v"].get("/ready").status_code == 200


def test_authorization_revocation_prevents_execution_and_private_task_fields(system):
    task = enqueue(system)
    result = queue.run_one(system["vdb"], SCOPE, adapter(REPLY), Auth({}))
    assert result["data"]["state"] == "failed"
    assert (
        system["v"]
        .get(f"/v1/inference/tasks/{task['id']}", headers=header("operations"))
        .status_code
        == 404
    )
    assert (
        system["v"]
        .post(f"/v1/inference/tasks/{task['id']}/retry", headers=header("internal"))
        .status_code
        == 404
    )
    with system["vdb"].session() as s:
        assert rows(s, SCOPE, "inference_run") == []


def test_synchronous_path_uses_same_capacity_and_keeps_queued_task(system):
    first = enqueue(system)
    queue.claim(system["vdb"], SCOPE, first["id"])
    v = TestClient(create_app(system["vdb"], system["auth"], inference=adapter(REPLY)))
    eid = system["send"](report(), "interaction", "support").json()["evidence_id"]
    response = v.post(f"/v1/inference/evidence/{eid}", headers=header())
    assert response.status_code == 409
    assert response.json()["detail"]["task_id"]


def test_queue_limit_does_not_block_ingestion(system, monkeypatch):
    monkeypatch.setenv("AI_TASK_QUEUE_LIMIT", "1")
    task = enqueue(system)
    eid = system["send"](report(), "interaction", "support").json()["evidence_id"]
    response = system["v"].post(f"/v1/inference/tasks/evidence/{eid}", headers=header())
    assert response.status_code == 429
    assert system["v"].get(f"/v1/inference/tasks/{task['id']}", headers=header()).status_code == 200
