"""Inspect the actual running Compose deployment; never prints env credentials."""

import json
import subprocess
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]


def run(*args):
    return subprocess.check_output(["podman", *args], text=True, stderr=subprocess.STDOUT).strip()


def main():
    report = {"runtime": "podman", "checks": {}}
    for application in ("cedar", "veriq"):
        running_image = run("inspect", "--format", "{{.Image}}", f"veriq-platform_{application}_1")
        tagged_image = run(
            "image",
            "inspect",
            "--format",
            "{{.Id}}",
            f"localhost/veriq-platform_{application}:latest",
        )
        assert running_image == tagged_image, (
            "Application container must use the final audited image"
        )
        report["checks"][application + "_image"] = running_image
        code = """import json,os
from sqlalchemy import create_engine,text
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata
from shared.db import Base
engine=create_engine(os.environ["APP_DATABASE_URL"])
with engine.connect() as c:
 print(json.dumps({"dialect":c.dialect.name,"server_version":c.scalar(text("SELECT version()")),"migration":MigrationContext.configure(c).get_current_revision(),"metadata_differences":len(compare_metadata(MigrationContext.configure(c),Base.metadata)),"domain_record_count":c.scalar(text("SELECT count(*) FROM domain_records"))}))
"""
        # Use the container's own bank-controlled environment, without exposing it to host logs.
        code = code.replace(
            'os.environ["APP_DATABASE_URL"]', f'os.environ["{application.upper()}_DATABASE_URL"]'
        )
        result = json.loads(run("exec", f"veriq-platform_{application}_1", "python", "-c", code))
        assert (
            result["dialect"] == "postgresql"
            and result["migration"] == "0001"
            and result["metadata_differences"] == 0
        )
        report["checks"][application + "_database"] = result
    isolation = """import os,json
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
url=make_url(os.environ["VERIQ_DATABASE_URL"]).set(host="cedar-db",database="cedar")
try:
 with create_engine(url,connect_args={"connect_timeout":5}).connect():
  raise RuntimeError("Cross-application database access unexpectedly succeeded")
except OperationalError as e:
 expected="password authentication failed" in str(e.orig)
 print(json.dumps({"cross_database_credential_rejected":expected}))
 if not expected:raise RuntimeError("Expected database authentication rejection was not observed")
"""
    report["checks"]["database_credential_isolation"] = json.loads(
        run("exec", "veriq-platform_veriq_1", "python", "-c", isolation)
    )
    networks = json.loads(run("network", "inspect", "veriq-platform_bank"))
    report["checks"]["internal_bank_network"] = networks[0]["internal"]
    assert report["checks"]["internal_bank_network"] is True
    names = run("ps", "--format", "{{.Names}}").splitlines()
    if "veriq-platform_local-ai_1" in names:
        ports = run("port", "veriq-platform_local-ai_1")
        assert ports == ""
        report["checks"]["model_has_no_host_published_port"] = True
        report["checks"]["model_runtime_version"] = run(
            "exec", "veriq-platform_local-ai_1", "/runtime/llama-server", "--version"
        )
    config = json.loads((ROOT / "var/runtime.json").read_text())
    with httpx.Client(timeout=15, trust_env=False) as client:
        token = config["tokens"]["veriq_admin"]
        response = client.get(
            "http://127.0.0.1:8200/v1/inference/status",
            headers={"Authorization": "Bearer " + token},
        )
        response.raise_for_status()
        report["checks"]["inference_status"] = response.json()
        feed_token = config["tokens"]["cedar_feed"]
        response = client.get(
            "http://127.0.0.1:8201/v1/accounts", headers={"Authorization": "Bearer " + feed_token}
        )
        assert response.status_code == 403
        report["checks"]["cedar_feed_cannot_read_accounts"] = True
        customer_token = config["tokens"]["customer1"]
        response = client.post(
            "http://127.0.0.1:8201/v1/channels/branch/visits",
            headers={"Authorization": "Bearer " + customer_token},
            json={
                "visit_id": "unauthorized-recorder-test",
                "customer_id": "C1",
                "notes": "Synthetic permission probe",
            },
        )
        assert response.status_code == 403
        report["checks"]["customer_cannot_impersonate_branch_recorder"] = True
        response = client.get(
            "http://127.0.0.1:8201/v1/feed?source_id=cedar-institutional&after=0&limit=1",
            headers={"Authorization": "Bearer " + feed_token},
        )
        response.raise_for_status()
        envelope = response.json()["items"][0]["envelope"]
        response = client.post(
            "http://127.0.0.1:8200/v1/ingest",
            json=envelope,
            headers={"X-Source-Secret": "intentionally-invalid-source-credential"},
        )
        assert response.status_code == 401
        report["checks"]["invalid_source_secret_rejected"] = True
    report["postgres_verified"] = True
    report["all_three_live_tasks_verified_in_bank_network"] = set(
        report["checks"]["inference_status"].get("verified_tasks", {})
    ) == {"extract_knowledge", "interpret_interaction", "analyze_investigation"}
    output = ROOT / "docs/implementation/ticket002/deployment-results.json"
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
