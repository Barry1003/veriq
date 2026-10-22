import json

import pytest
from fastapi.testclient import TestClient

from apps.veriq.backend import orchestration
from apps.veriq.backend.api import create_app
from apps.veriq.backend.inference import LocalInference
from scripts import rehearsal
from shared.db import get
from tests.conftest import header, knowledge

PROFILE = {
    "institution_name": "Synthetic Cedar",
    "deployment_label": "Rehearsal",
    "synthetic_development": True,
}


def configure(system):
    for kind, authority in (
        ("knowledge", "structure"),
        ("observation", "measurement"),
        ("interaction", "report"),
        ("transaction", "status"),
        ("document", "document"),
    ):
        system["register"](kind + "-source", kind, authority)
    assert system["send"](knowledge()).status_code == 200
    assert (
        system["send"](
            {"text": "Synthetic routing note"}, kind="document", source="document-source"
        ).status_code
        == 200
    )


def test_setup_is_disabled_by_default_and_admin_only(system, monkeypatch):
    v = system["v"]
    monkeypatch.delenv("VERIQ_DEMO_SETUP_ENABLED", raising=False)
    assert v.get("/v1/setup", headers=header()).status_code == 404
    monkeypatch.setenv("VERIQ_DEMO_SETUP_ENABLED", "true")
    assert v.get("/v1/setup").status_code == 401
    assert v.get("/v1/setup", headers=header("internal")).status_code == 403
    assert v.get("/v1/setup", headers=header("foreign")).status_code == 403
    assert (
        v.post(
            "/v1/setup", headers=header(), json={**PROFILE, "synthetic_development": False}
        ).status_code
        == 422
    )
    assert (
        v.post(
            "/v1/setup", headers=header(), json={**PROFILE, "identity_provider": "verified"}
        ).status_code
        == 422
    )


def test_readiness_requires_real_evidence_and_persists_across_api_restart(system, monkeypatch):
    monkeypatch.setenv("VERIQ_DEMO_SETUP_ENABLED", "true")
    v = system["v"]
    first = v.post("/v1/setup", headers=header(), json=PROFILE).json()
    assert v.post("/v1/setup", headers=header(), json=PROFILE).json() == first
    assert v.post("/v1/setup/activate", headers=header()).status_code == 409
    configure(system)
    ready = v.get("/v1/setup/readiness", headers=header()).json()
    assert ready["state"] == "ready_limited"
    assert ready["activation_allowed"] and not ready["production_approved"]
    assert ready["checks"]["accepted_institutional_context"]
    assert any(s["delivery"] == "not_tested" for s in ready["sources"])
    activation = v.post("/v1/setup/activate", headers=header()).json()
    assert v.post("/v1/setup/activate", headers=header()).json() == activation
    restarted = TestClient(create_app(system["vdb"], system["auth"], "cedar:development"))
    assert restarted.get("/v1/setup", headers=header()).json()["profile"] == first
    assert restarted.get("/v1/setup/readiness", headers=header()).json()["activation_valid"]
    changed = v.post(
        "/v1/setup", headers=header(), json={**PROFILE, "deployment_label": "Next rehearsal"}
    ).json()
    assert changed["data"]["version"] == 2
    assert not v.get("/v1/setup/readiness", headers=header()).json()["activation_valid"]


def test_source_loss_degrades_activation_without_erasing_history(system, monkeypatch):
    monkeypatch.setenv("VERIQ_DEMO_SETUP_ENABLED", "true")
    v = system["v"]
    v.post("/v1/setup", headers=header(), json=PROFILE)
    configure(system)
    assert v.post("/v1/setup/activate", headers=header()).status_code == 200
    assert (
        v.post(
            "/v1/sources/document-source/authorization",
            headers=header(),
            json={"state": "revoked", "rationale": "Synthetic authorization withdrawn"},
        ).status_code
        == 200
    )
    result = v.get("/v1/setup/readiness", headers=header()).json()
    assert result["state"] == "blocked" and not result["activation_valid"]
    assert result["activation"] is not None
    assert v.post("/v1/setup/activate", headers=header()).status_code == 409


def test_revoked_empty_feed_cannot_report_success(system):
    system["connect"]()
    v = system["v"]
    assert (
        v.post(
            "/v1/sources/cedar-institutional/authorization",
            headers=header(),
            json={"state": "revoked", "rationale": "Stop feed before any events"},
        ).status_code
        == 200
    )
    result = v.post("/v1/connectors/cedar-institutional/pull", headers=header())
    assert result.status_code == 403
    with system["vdb"].session() as s:
        source = get(s, "cedar:development", "source", "cedar-institutional")
        assert not source.data.get("last_pull_at") and source.data["cursor"] == 0


def test_worker_configuration_mismatch_is_visible(system, monkeypatch):
    monkeypatch.setenv("VERIQ_DEMO_SETUP_ENABLED", "true")
    monkeypatch.setenv("AI_INVESTIGATION_MODE", "adaptive")
    monkeypatch.setenv("AI_MODEL_CONFIG_VERSION", "demo-v1")
    inference = LocalInference(model="first")
    orchestration.heartbeat(system["vdb"], "cedar:development", "real-config-test", inference)
    v = TestClient(
        create_app(
            system["vdb"],
            system["auth"],
            "cedar:development",
            inference=LocalInference(model="second"),
        )
    )
    result = v.get("/v1/setup/readiness", headers=header()).json()
    assert result["ai"]["adaptive_mode_enabled"]
    assert not result["ai"]["worker_configuration_consistent"]
    assert result["ai"]["model_qualification"]["state"] == "unqualified"


@pytest.mark.parametrize("name", ["../outside", "/tmp/elsewhere", "x/y", "", ".", "UPPER"])
def test_rehearsal_rejects_unselected_paths(name):
    with pytest.raises(ValueError):
        rehearsal.directory(name)


def test_rehearsal_manifest_cannot_select_another_directory(tmp_path, monkeypatch):
    monkeypatch.setattr(rehearsal, "RUNS", tmp_path)
    p = tmp_path / "selected"
    p.mkdir()
    (p / "manifest.json").write_text(
        json.dumps({"directory": str(tmp_path / "other"), "synthetic_development": True})
    )
    with pytest.raises(ValueError):
        rehearsal.load("selected")
    p.rename(tmp_path / "original")
    p.symlink_to(tmp_path / "original")
    with pytest.raises(ValueError):
        rehearsal.load("selected")


def test_rehearsal_does_not_signal_reused_pid(monkeypatch):
    monkeypatch.setattr(rehearsal, "start_tick", lambda pid: "new-process")
    monkeypatch.setattr(
        rehearsal.os, "killpg", lambda *args: pytest.fail("Signalled an unrelated process")
    )
    rehearsal.stop_process({"pid": 123, "start_tick": "old-process"})


def test_ai_source_opt_out_is_reported_without_blocking_core(system, monkeypatch):
    monkeypatch.setenv("VERIQ_DEMO_SETUP_ENABLED", "true")
    v = system["v"]
    v.post("/v1/setup", headers=header(), json=PROFILE)
    configure(system)
    result = v.post(
        "/v1/sources/document-source/processing-policy",
        headers=header(),
        json={
            "enabled": False,
            "rationale": "Do not allow model processing of this document source",
        },
    )
    assert result.status_code == 200
    ready = v.get("/v1/setup/readiness", headers=header()).json()
    assert ready["activation_allowed"]
    assert not ready["ai"]["source_processing_policy_enabled"]
    assert not ready["ai"]["available_for_experiment"]


def test_additive_contract_preserves_baseline_operations():
    from pathlib import Path

    baseline = json.loads(
        (Path(__file__).parents[1] / "contracts/api/veriq-v0.5.0.openapi.json").read_text()
    )
    current = create_app().openapi()
    for path, operations in baseline["paths"].items():
        for method, operation in operations.items():
            assert current["paths"][path][method] == operation
    recorded = json.loads(
        (Path(__file__).parents[1] / "contracts/api/veriq-live-demo.openapi.json").read_text()
    )
    assert current == recorded


def test_restart_port_check_distinguishes_listener_from_time_wait():
    import socket

    listener = socket.socket()
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
    listener.listen()
    with pytest.raises(OSError):
        rehearsal.free_port(port)
    client = socket.create_connection(("127.0.0.1", port))
    accepted, _ = listener.accept()
    accepted.close()
    assert client.recv(1) == b""
    client.close()
    listener.close()
    rehearsal.free_port(port)
