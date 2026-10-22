"""Inspect the actual Ticket 004 stack; never emit private container environments."""

import hashlib
import json
import os
import subprocess
from pathlib import Path

import httpx

from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]
PROJECT = os.getenv("VERIQ_STACK_PROJECT", "veriq-ticket004")


def podman(*args):
    return subprocess.check_output(["podman", *args], text=True, stderr=subprocess.STDOUT).strip()


def main():
    report = {
        "project": PROJECT,
        "runtime": "Podman Compose",
        "checked_at": now(),
        "components": {},
        "checks": {},
    }
    core_paths = [
        str(p.relative_to(ROOT))
        for folder in ("apps", "shared", "migrations")
        for p in (ROOT / folder).rglob("*.py")
    ]
    core_paths.append("scripts/ai_worker.py")
    expected = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in sorted(core_paths)}
    code = (
        "import json,hashlib;from pathlib import Path;paths="
        + repr(sorted(core_paths))
        + ";print(json.dumps({p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}))"
    )
    for service in ("cedar", "veriq", "ai-worker", "cedar-db", "veriq-db", "local-ai"):
        name = PROJECT + "_" + service + "_1"
        info = json.loads(podman("inspect", "--format", "{{json .State}}", name))
        assert info["Running"]
        component = {"running": True, "image": podman("inspect", "--format", "{{.Image}}", name)}
        if service in {"cedar", "veriq", "ai-worker"}:
            hashes = json.loads(podman("exec", name, "python", "-c", code))
            assert hashes == expected, "Running component differs from final source: " + service
            component["audited_source_hashes"] = hashes
        report["components"][service] = component
    for app in ("cedar", "veriq"):
        code = """import os,json,platform
from sqlalchemy import create_engine,text
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata
from shared.db import Base
from importlib.metadata import version
with create_engine(os.environ["APP_DATABASE_URL"]).connect() as c:
 print(json.dumps({"postgres":c.scalar(text("select version()")),"migration":MigrationContext.configure(c).get_current_revision(),"metadata_differences":len(compare_metadata(MigrationContext.configure(c),Base.metadata)),"python":platform.python_version(),"fastapi":version("fastapi"),"sqlalchemy":version("sqlalchemy"),"record_count":c.scalar(text("select count(*) from domain_records"))}))""".replace(
            "APP_DATABASE_URL", app.upper() + "_DATABASE_URL"
        )
        db = json.loads(podman("exec", PROJECT + "_" + app + "_1", "python", "-c", code))
        assert db["migration"] == "0002" and db["metadata_differences"] == 0
        report["components"][app]["database"] = db
    isolation = """import os,json
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
try:
 with create_engine(make_url(os.environ["VERIQ_DATABASE_URL"]).set(host="cedar-db",database="cedar"),connect_args={"connect_timeout":5}).connect():
  raise RuntimeError("Cross-database access unexpectedly succeeded")
except OperationalError as e:
 ok="password authentication failed" in str(e.orig)
 print(json.dumps({"cross_database_credentials_rejected":ok}))
 if not ok:raise RuntimeError("Did not observe authentication rejection")"""
    report["checks"].update(
        json.loads(podman("exec", PROJECT + "_veriq_1", "python", "-c", isolation))
    )
    report["checks"]["internal_bank_network"] = json.loads(
        podman("network", "inspect", PROJECT + "_bank")
    )[0]["internal"]
    report["checks"]["model_no_published_host_port"] = podman("port", PROJECT + "_local-ai_1") == ""
    report["runtime_version"] = podman(
        "exec", PROJECT + "_local-ai_1", "/runtime/llama-server", "--version"
    )
    report["model_sha256"] = podman(
        "exec",
        PROJECT + "_local-ai_1",
        "python",
        "-c",
        "import hashlib;print(hashlib.file_digest(open('/models/model.gguf','rb'),'sha256').hexdigest())",
    )
    assert (
        report["model_sha256"] == "c5396e06af294bd101b30dce59131a76d2b773e76950acc870eda801d3ab0515"
    )
    token = json.loads((ROOT / "var/runtime.json").read_text())["tokens"]["veriq_admin"]
    with httpx.Client(timeout=15, trust_env=False) as client:
        for app, port in (("cedar", 8401), ("veriq", 8400)):
            response = client.get(f"http://127.0.0.1:{port}/ready")
            response.raise_for_status()
            report["components"][app]["ready"] = response.json()
        response = client.get(
            "http://127.0.0.1:8400/v1/inference/status",
            headers={"Authorization": "Bearer " + token},
        )
        response.raise_for_status()
        runtime = json.loads((ROOT / "var/runtime.json").read_text())
        checks = [
            (
                "veriq_credential_rejected_by_cedar",
                "http://127.0.0.1:8401/v1/accounts",
                runtime["tokens"]["veriq_admin"],
                401,
            ),
            (
                "feed_credential_has_no_banking_authority",
                "http://127.0.0.1:8401/v1/accounts",
                runtime["tokens"]["cedar_feed"],
                403,
            ),
            (
                "cedar_customer_credential_rejected_by_veriq",
                "http://127.0.0.1:8400/v1/knowledge/context",
                runtime["tokens"]["customer1"],
                401,
            ),
        ]
        for label, url, credential, expected_status in checks:
            probe = client.get(url, headers={"Authorization": "Bearer " + credential})
            report["checks"][label] = probe.status_code == expected_status
        status = response.json()
        report["checks"]["worker_status_visible_in_separate_api_process"] = bool(
            status["latest_successful_inference"] and status["active_workers"]
        )
        report["checks"]["available_model_explicitly_unqualified"] = (
            status["endpoint_reachable"] and status["model_qualification"]["state"] == "unqualified"
        )
        report["checks"]["legacy_verified_tasks_now_durable"] = {
            "extract_knowledge",
            "interpret_interaction",
            "analyze_investigation",
        } <= status.get("verified_tasks", {}).keys()
        report["status"] = status
    transcript = json.loads(
        (ROOT / "docs/implementation/ticket004/http-transcript.json").read_text()
    )
    actual = {
        r["data"]["task"]
        for r in transcript.get("final_runs", [])
        if r["data"].get("inference_metadata", {}).get("transport") == "http"
        and r["data"].get("inference_metadata", {}).get("usage", {}).get("completion_tokens", 0) > 0
    }
    report["checks"]["three_task_types_have_real_generation_receipts"] = {
        "extract_knowledge",
        "interpret_interaction",
        "analyze_investigation",
    } <= actual
    report["verified"] = all(report["checks"].values())
    assert report["verified"]
    (ROOT / "docs/implementation/ticket004/deployment-results.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "verified": report["verified"],
                "checks": report["checks"],
                "runtime": report["runtime_version"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
