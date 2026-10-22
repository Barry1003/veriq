"""Independent real HTTP Cedar/Veriq/worker demo; actual local model, no conclusions inserted.

Uses only existing Cedar interfaces. Isolated SQLite databases minimize developer RAM.
This is not PostgreSQL/production verification. Stops only its own child processes.
"""

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx

from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def main():
    runtime = json.loads((ROOT / "var/runtime.json").read_text())
    private = ROOT / "var" / ("ticket005-demo-" + str(uuid4()))
    private.mkdir(mode=0o700)
    output = ROOT / "docs/implementation/ticket005/http-demo.json"
    tokens = runtime["tokens"]
    result = {
        "started_at": now(),
        "transport": "actual_http",
        "persistence": "Separate isolated SQLite databases",
        "inference": "Actual local HTTP, no model double",
        "requests": [],
        "checks": {},
        "model_qualified": False,
    }
    processes = []
    logs = []
    client = httpx.Client(timeout=20, trust_env=False)

    def save():
        output.write_text(json.dumps(result, indent=2) + "\n")

    def request(app, method, path, payload=None, token=None):
        response = client.request(
            method,
            "http://127.0.0.1:" + ("8621" if app == "cedar" else "8620") + path,
            headers={
                "Authorization": "Bearer "
                + tokens[token or ("cedar_operator" if app == "cedar" else "veriq_admin")]
            },
            json=payload,
        )
        data = response.json()
        result["requests"].append(
            {
                "application": app,
                "method": method,
                "path": path,
                "status": response.status_code,
                "response": data,
            }
        )
        save()
        if response.status_code not in (200, 201, 202):
            raise RuntimeError(f"{app} {path}: HTTP {response.status_code}")
        return data

    def wait(label, fn, seconds=240):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            try:
                found = fn()
                if found:
                    return found
            except httpx.TransportError:
                pass
            time.sleep(1)
        raise RuntimeError("Timed out: " + label)

    def start(name, command, env):
        log = (private / (name + ".log")).open("w")
        logs.append(log)
        processes.append(
            subprocess.Popen(
                [sys.executable, "-m", *command],
                cwd=ROOT,
                env={**os.environ, **env},
                stdout=log,
                stderr=log,
                start_new_session=True,
            )
        )

    common = {
        "INSTALLATION_SCOPE": "cedar:development",
        "AUTO_AI_ENABLED": "true",
        "AI_INVESTIGATION_MODE": "adaptive",
        "AI_MODEL_CONFIG_VERSION": "ticket005-demo-v2",
        "LOCAL_AI_URL": os.getenv("LOCAL_AI_URL", "http://127.0.0.1:8181/v1"),
        "LOCAL_AI_MODEL": os.getenv("LOCAL_AI_MODEL", "veriq-qwen2.5-0.5b"),
        "LOCAL_AI_MAX_OUTPUT_TOKENS": os.getenv("LOCAL_AI_MAX_OUTPUT_TOKENS", "512"),
        "LOCAL_AI_TIMEOUT_SECONDS": os.getenv("LOCAL_AI_TIMEOUT_SECONDS", "90"),
        "AI_TASK_CONCURRENCY": "1",
        "AUTO_CONNECTOR_POLL_ENABLED": "true",
        "AUTO_CONNECTOR_POLL_SECONDS": "2",
    }
    cedar = {
        **runtime["cedar"],
        **common,
        "CEDAR_DATABASE_URL": "sqlite:///" + str(private / "cedar.db"),
    }
    veriq = {
        **runtime["veriq"],
        **common,
        "VERIQ_DATABASE_URL": "sqlite:///" + str(private / "veriq.db"),
    }
    veriq["CEDAR_CONNECTORS"] = json.dumps(
        {
            k: {**v, "url": "http://127.0.0.1:8621"}
            for k, v in json.loads(veriq["CEDAR_CONNECTORS"]).items()
        }
    )
    try:
        start("cedar", ["scripts.run", "cedar", "--container", "--port", "8621"], cedar)
        start("veriq", ["scripts.run", "veriq", "--container", "--port", "8620"], veriq)
        wait("Cedar ready", lambda: request("cedar", "GET", "/ready"))
        wait("Veriq ready", lambda: request("veriq", "GET", "/ready"))
        start("worker", ["scripts.ai_worker"], veriq)
        request(
            "veriq",
            "POST",
            "/v1/identity/namespaces",
            {
                "namespace": "cedar-demo-master",
                "authority_ref": "synthetic-cedar-master-v1",
                "source_ids": [s["source_id"] for s in runtime["sources"]],
            },
        )
        for source in runtime["sources"]:
            request(
                "veriq",
                "POST",
                "/v1/sources",
                {
                    **source,
                    "identity_namespace": "cedar-demo-master",
                    "identity_authority_ref": "synthetic-cedar-master-v1",
                    "ai_enabled": True,
                },
            )
        request("cedar", "POST", "/v1/simulator/seed", token="cedar_simulator")
        wait(
            "accepted configuration",
            lambda: request("veriq", "GET", "/v1/knowledge/context")["relationships"],
        )
        request(
            "cedar",
            "POST",
            "/v1/institutional/documents",
            {
                "text": "R1 handoff journal: queue Heron recorded delayed handoff notifications. Independent timestamps are unavailable; this is not proof of gateway failure."
            },
        )
        request(
            "cedar",
            "POST",
            "/v1/simulator/conditions",
            {"gateway_id": "G1", "timeout": True},
            token="cedar_simulator",
        )
        transfers = [
            request(
                "cedar",
                "POST",
                "/v1/transfers",
                {
                    "account_id": "A1",
                    "amount_minor": 1000,
                    "route_id": "R1",
                    "idempotency_key": str(uuid4()),
                },
                token="customer1",
            )
            for _ in range(10)
        ]
        txid = transfers[0]["data"]["transaction_id"]
        wait("proactive incident", lambda: request("veriq", "GET", "/v1/incidents"))
        result["checks"]["proactive_before_complaint"] = not request(
            "veriq", "GET", "/v1/interactions"
        )
        request(
            "cedar",
            "POST",
            "/v1/channels/in-app/messages",
            {
                "message_id": "T005-" + str(uuid4()),
                "customer_id": "C1",
                "message": "My transfer is delayed. Please inspect the processing evidence.",
                "transaction_id": txid,
            },
            token="customer1",
        )
        interactions = wait(
            "native interaction", lambda: request("veriq", "GET", "/v1/interactions")
        )
        result["checks"]["native_reference_preserved"] = any(
            r["data"]["transaction_id"] == txid for r in interactions
        )
        inv = wait(
            "interaction investigation",
            lambda: next(
                (
                    r
                    for r in request("veriq", "GET", "/v1/investigations")
                    if r["data"]["trigger_type"] == "interaction"
                ),
                None,
            ),
        )
        before = request("cedar", "GET", "/v1/transactions")

        def latest_finished():
            tasks = request("veriq", "GET", "/v1/inference/tasks?limit=500")
            return next(
                (
                    t
                    for t in reversed(tasks)
                    if t["data"]["task"] == "adaptive_investigation"
                    and t["data"]["investigation_id"] == inv["id"]
                    and t["data"]["state"] in {"completed", "failed"}
                ),
                None,
            )

        task = wait("automatic adaptive completion/failure", latest_finished, seconds=480)
        trace = request("veriq", "GET", f"/v1/inference/tasks/{task['id']}/steps")
        workspace = request("veriq", "GET", f"/v1/investigations/{inv['id']}/workspace")
        result["checks"]["automatic_adaptive_task"] = task["data"]["initiation"] == "automatic"
        result["checks"]["durable_real_inference"] = any(
            s["data"].get("inference_metadata", {}).get("transport") == "http"
            for s in trace["steps"]
        )
        result["checks"]["no_ai_financial_change"] = before == request(
            "cedar", "GET", "/v1/transactions"
        )
        result["checks"]["no_manual_ai_requests"] = not any(
            r["method"] == "POST" and ("/adaptive" in r["path"] or "/inference" in r["path"])
            for r in result["requests"]
        )
        result["task"] = task
        result["trace"] = trace
        result["workspace"] = workspace
        result["functional_pipeline_passed"] = all(result["checks"].values())
        result["adaptive_reasoning_quality"] = (
            "Requires inspection; transport and tool execution do not establish quality"
        )
        result["completed_at"] = now()
        save()
        print(
            json.dumps(
                {"checks": result["checks"], "outcome": task["data"].get("outcome")}, indent=2
            )
        )
    finally:
        for proc in reversed(processes):
            if proc.poll() is None:
                os.killpg(proc.pid, signal.SIGTERM)
        for proc in processes:
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
        for log in logs:
            log.close()
        client.close()
        result["cleanup"] = {
            "own_processes_stopped": True,
            "isolated_databases_preserved": str(private),
            "at": now(),
        }
        save()


if __name__ == "__main__":
    main()
