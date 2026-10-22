"""Real HTTP + restartable worker demo; synthetic evidence, no inference doubles.

Uses a separately running approved runtime. Private existing development credentials
stay in var; fresh SQLite DBs are explicit here, not claimed as PostgreSQL.
"""

import json
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path

import httpx

from scripts.qualify_low_resource import fields
from shared.contracts import Envelope, now, uid
from shared.db import Database

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "var/reports/ticket003/async-http-demo.json"


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    runtime = json.loads((ROOT / "var/runtime.json").read_text())
    folder = ROOT / "var" / ("ticket003-demo-" + uid())
    folder.mkdir(mode=0o700)
    report = {
        "synthetic": True,
        "transport": "real_http",
        "database": "SQLite persisted on disk",
        "model_endpoint": os.environ["LOCAL_AI_URL"],
        "model": os.environ["LOCAL_AI_MODEL"],
        "requests": [],
        "started_at": now(),
    }
    processes, logs = [], []
    worker_env = None
    try:
        for app, port in (("cedar", 8301), ("veriq", 8300)):
            env = {
                **os.environ,
                **runtime[app],
                f"{app.upper()}_DATABASE_URL": "sqlite:///" + str(folder / (app + ".db")),
            }
            if app == "veriq":
                env["CEDAR_CONNECTORS"] = "{}"
                worker_env = env
            Database(env[f"{app.upper()}_DATABASE_URL"]).create_schema()
            log = (folder / (app + ".log")).open("w")
            logs.append(log)
            processes.append(
                subprocess.Popen(
                    [
                        sys.executable,
                        "-m",
                        "uvicorn",
                        f"apps.{app}.backend.api:app",
                        "--host",
                        "127.0.0.1",
                        "--port",
                        str(port),
                    ],
                    env=env,
                    stdout=log,
                    stderr=log,
                )
            )
        client = httpx.Client(timeout=15, trust_env=False)
        for port in (8300, 8301):
            deadline = time.monotonic() + 30
            while True:
                try:
                    if client.get(f"http://127.0.0.1:{port}/ready").status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                if time.monotonic() > deadline:
                    raise RuntimeError("API failed readiness")
                time.sleep(0.1)

        def call(app, method, path, body=None, token=None, source_secret=None):
            port = 8300 if app == "veriq" else 8301
            headers = {
                "Authorization": "Bearer "
                + runtime["tokens"][
                    token or ("veriq_admin" if app == "veriq" else "cedar_operator")
                ]
            }
            if source_secret:
                headers = {"X-Source-Secret": source_secret}
            response = client.request(
                method, f"http://127.0.0.1:{port}" + path, headers=headers, json=body
            )
            response.raise_for_status()
            result = response.json()
            safe_body = (
                {k: v for k, v in body.items() if k != "ingestion_secret"}
                if isinstance(body, dict)
                else body
            )
            report["requests"].append(
                {
                    "application": app,
                    "method": method,
                    "path": path,
                    "request": safe_body,
                    "status": response.status_code,
                    "response": result,
                }
            )
            return result

        scope = worker_env["INSTALLATION_SCOPE"]
        institution = scope.split(":")[0]
        source_secret = secrets.token_urlsafe(32)

        def register(source, kind, authority):
            call(
                "veriq",
                "POST",
                "/v1/sources",
                {
                    "source_id": source,
                    "name": source,
                    "record_types": [kind],
                    "authority": [authority],
                    "max_classification": "internal",
                    "authorization_ref": "ticket003-synthetic",
                    "ingestion_secret": source_secret,
                },
            )

        def ingest(source, kind, payload):
            envelope = Envelope(
                institution_id=institution,
                source_id=source,
                native_record_id=uid(),
                record_type=kind,
                authorization_ref="ticket003-synthetic",
                payload=payload,
            ).model_dump()
            return call("veriq", "POST", "/v1/ingest", envelope, source_secret=source_secret)[
                "evidence_id"
            ]

        call("cedar", "POST", "/v1/simulator/seed", token="cedar_simulator")
        before = {k: call("cedar", "GET", "/v1/" + k) for k in ("accounts", "transactions")}
        register("ticket003-doc", "document", "document")
        doc = ingest(
            "ticket003-doc",
            "document",
            {
                "text": "Effective 2026-10-20T00:00:00Z. Route QX12 named Payments uses gateway HG81 named Router."
            },
        )
        register("ticket003-report", "interaction", "report")
        interaction = ingest(
            "ticket003-report",
            "interaction",
            {
                "customer_id": "C1",
                "transaction_id": None,
                "channel": "in_app",
                "text": "My transfer is pending and delayed",
                "occurred_at": now(),
            },
        )
        investigation = call("veriq", "GET", "/v1/investigations")[0]
        tasks = [
            call("veriq", "POST", f"/v1/inference/tasks/evidence/{doc}"),
            call("veriq", "POST", f"/v1/inference/tasks/evidence/{interaction}"),
            call("veriq", "POST", f"/v1/inference/tasks/investigations/{investigation['id']}"),
        ]
        assert all(t["data"]["state"] == "queued" for t in tasks)
        for _ in tasks:
            subprocess.run(
                [sys.executable, "-m", "scripts.ai_worker", "--once"],
                env=worker_env,
                check=True,
                timeout=120,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        completed = [call("veriq", "GET", f"/v1/inference/tasks/{t['id']}") for t in tasks]
        assert all(t["data"]["state"] == "completed" for t in completed)
        report["task_runs"] = call("veriq", "GET", "/v1/inference/runs")
        assert all(
            r["data"].get("inference_metadata", {}).get("transport") == "http"
            for r in report["task_runs"]
        )
        report["candidate_only"] = (
            call("veriq", "GET", "/v1/knowledge/context")["relationships"] == []
        )
        report["task_outcomes"] = [t["data"]["outcome"] for t in completed]
        offline = call("veriq", "POST", f"/v1/inference/tasks/evidence/{interaction}")
        offline_env = {**worker_env, "LOCAL_AI_URL": "http://127.0.0.1:19999/v1"}
        subprocess.run(
            [sys.executable, "-m", "scripts.ai_worker", "--once"],
            env=offline_env,
            check=True,
            timeout=30,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        offline_state = call("veriq", "GET", f"/v1/inference/tasks/{offline['id']}")["data"][
            "state"
        ]
        assert offline_state == "retryable"
        register("ticket003-config", "knowledge", "structure")
        ingest(
            "ticket003-config",
            "knowledge",
            {
                "entities": [
                    {"native_id": "QX12", "kind": "route", "name": "Payments"},
                    {"native_id": "HG81", "kind": "gateway", "name": "Router"},
                ],
                "relationships": [
                    {"subject": "QX12", "predicate": "uses_gateway", "object": "HG81"}
                ],
                "valid_from": "2026-10-20T00:00:00Z",
            },
        )
        register("ticket003-metrics", "observation", "measurement")
        ingest(
            "ticket003-metrics",
            "observation",
            {
                "route_id": "QX12",
                "gateway_id": "HG81",
                "attempts": 10,
                "timeouts": 8,
                "occurred_at": now(),
            },
        )
        context = call("veriq", "GET", "/v1/knowledge/context")
        incidents = call("veriq", "GET", "/v1/incidents")
        report["offline_operational"] = bool(
            context["relationships"]
            and incidents
            and call("veriq", "GET", "/ready")["status"] == "ready"
        )
        after = {k: call("cedar", "GET", "/v1/" + k) for k in ("accounts", "transactions")}
        report["cedar_financial_state_unchanged"] = before == after
        report["api_process_memory"] = {
            name: fields(f"/proc/{p.pid}/smaps_rollup")
            for name, p in zip(("cedar", "veriq"), processes)
        }
        report["workflow_verified"] = (
            report["offline_operational"]
            and report["candidate_only"]
            and report["cedar_financial_state_unchanged"]
        )
        report["model_qualified"] = False
        report["completed_at"] = now()
    finally:
        for process in processes:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for log in logs:
            log.close()
        OUT.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {k: v for k, v in report.items() if k not in {"requests", "task_runs"}}, indent=2
        )
    )


if __name__ == "__main__":
    main()
