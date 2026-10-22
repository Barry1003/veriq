"""Isolated, persistent, offline-capable development rehearsal. No model answers inserted."""

import argparse
import json
import os
import re
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx

from scripts.bootstrap import bootstrap, write_private
from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "var/rehearsals"


def directory(name):
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,35}", name):
        raise ValueError("Run name must be 1–36 lowercase letters, digits or hyphens")
    path = RUNS / name
    if path.is_symlink() or RUNS.is_symlink():
        raise ValueError("Rehearsal directories must not be symlinks")
    return path


def load(name):
    path = directory(name)
    config = json.loads((path / "manifest.json").read_text())
    if config["directory"] != str(path) or config["synthetic_development"] is not True:
        raise ValueError("Not this installation's isolated synthetic run")
    return path, config


def save(path, config):
    write_private(path / "manifest.json", json.dumps(config, indent=2) + "\n")


def start_tick(pid):
    try:
        return Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[19]
    except (FileNotFoundError, ProcessLookupError):
        return None


def alive(record):
    if not record or start_tick(record["pid"]) != record["start_tick"]:
        return False
    try:
        return Path(f"/proc/{record['pid']}/stat").read_text().rsplit(")", 1)[1].split()[0] != "Z"
    except FileNotFoundError:
        return False


def spawn(path, config, name, command, env):
    if alive(config["processes"].get(name)):
        return
    with (path / (name + ".log")).open("a") as log:
        child = subprocess.Popen(
            command, cwd=ROOT, env=env, stdout=log, stderr=log, start_new_session=True
        )
    config["processes"][name] = {
        "pid": child.pid,
        "start_tick": start_tick(child.pid),
        "started_epoch": time.time(),
    }
    save(path, config)


def stop_process(record):
    if not alive(record):
        return
    try:
        os.killpg(record["pid"], signal.SIGTERM)
    except ProcessLookupError:
        return
    for _ in range(100):
        if not alive(record):
            return
        time.sleep(0.1)
    # Only the process group started and identified by this run may be stopped.
    if alive(record):
        try:
            os.killpg(record["pid"], signal.SIGKILL)
        except ProcessLookupError:
            pass


def free_port(port):
    with socket.socket() as sock:
        # A recently stopped API may leave TIME_WAIT sockets, not a live listener.
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("127.0.0.1", port))


def wait_for(label, fn, seconds=90):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            result = fn()
            if result:
                return result
        except (httpx.TransportError, httpx.HTTPStatusError):
            pass
        time.sleep(1)
    raise RuntimeError("Timed out: " + label)


class Session:
    def __init__(self, path, config):
        self.path, self.config = path, config
        self.runtime = json.loads((path / "runtime.json").read_text())
        self.client = httpx.Client(timeout=12, trust_env=False)

    def request(self, app, method, route, data=None, token=None, expected=(200, 201, 202)):
        token = token or ("veriq_admin" if app == "veriq" else "cedar_operator")
        started = time.monotonic()
        response = self.client.request(
            method,
            f"http://127.0.0.1:{self.config[app + '_port']}" + route,
            headers={"Authorization": "Bearer " + self.runtime["tokens"][token]},
            json=data,
        )
        payload = response.json()
        # Request bodies can contain source credentials. Record responses only.
        entry = {
            "app": app,
            "method": method,
            "path": route,
            "status": response.status_code,
            "seconds": round(time.monotonic() - started, 4),
            "response": payload,
        }
        with (self.path / "transcript.jsonl").open("a") as stream:
            stream.write(json.dumps(entry) + "\n")
        if response.status_code not in expected:
            raise RuntimeError(f"{app} {method} {route}: HTTP {response.status_code}")
        return payload

    def close(self):
        self.client.close()


def initialize(args):
    ports = [args.veriq_port, args.cedar_port, args.model_port, args.db_port, args.db_port + 1]
    if len(set(ports)) != len(ports) or any(not 1024 <= port <= 65535 for port in ports):
        raise ValueError("Use distinct unprivileged API/model/database ports")
    path = directory(args.run)
    if path.exists():
        raise ValueError("Run already exists; use it or explicitly reset this named run")
    path.mkdir(parents=True, mode=0o700)
    bootstrap(path)
    runtime = json.loads((path / "runtime.json").read_text())
    identifier = uuid4().hex
    config = {
        "directory": str(path),
        "synthetic_development": True,
        "id": identifier,
        "storage": args.storage,
        "veriq_port": args.veriq_port,
        "cedar_port": args.cedar_port,
        "model_port": args.model_port,
        "db_ports": [args.db_port, args.db_port + 1],
        "runtime": str(Path(args.runtime).resolve()),
        "weights": str(Path(args.weights).resolve()),
        "external_model": args.external_model,
        "processes": {},
        "common": {
            "INSTALLATION_SCOPE": "cedar:development",
            "VERIQ_DEMO_SETUP_ENABLED": "true",
            "AI_INVESTIGATION_MODE": "adaptive",
            "AUTO_AI_ENABLED": "true",
            "AI_MODEL_CONFIG_VERSION": args.model_version,
            "LOCAL_AI_MODEL": args.model_alias,
            "LOCAL_AI_URL": args.external_model or f"http://127.0.0.1:{args.model_port}/v1",
            "LOCAL_AI_ALLOWED_HOSTS": args.allowed_model_hosts,
            "LOCAL_AI_CONTEXT_WINDOW": str(args.context),
            "LOCAL_AI_MAX_OUTPUT_TOKENS": str(args.tokens),
            "LOCAL_AI_TIMEOUT_SECONDS": str(args.timeout),
            "AI_TASK_CONCURRENCY": "1",
            "AUTO_CONNECTOR_POLL_ENABLED": "true",
            "AUTO_CONNECTOR_POLL_SECONDS": "2",
        },
    }
    from apps.veriq.backend.inference import LocalInference

    # Validate runtime host restrictions before any process starts.
    previous = os.environ.get("LOCAL_AI_ALLOWED_HOSTS")
    try:
        os.environ["LOCAL_AI_ALLOWED_HOSTS"] = args.allowed_model_hosts
        LocalInference(endpoint=config["common"]["LOCAL_AI_URL"], model=args.model_alias)
    finally:
        if previous is None:
            os.environ.pop("LOCAL_AI_ALLOWED_HOSTS", None)
        else:
            os.environ["LOCAL_AI_ALLOWED_HOSTS"] = previous
    for index, app in enumerate(("cedar", "veriq")):
        if args.storage == "sqlite":
            url = "sqlite:///" + str(path / (app + ".db"))
        else:
            values = dict(
                line.split("=", 1) for line in (path / (app + "-db.env")).read_text().splitlines()
            )
            url = f"postgresql+psycopg://{app}:{values['POSTGRES_PASSWORD']}@127.0.0.1:{config['db_ports'][index]}/{app}"
        runtime[app][app.upper() + "_DATABASE_URL"] = url
    runtime["veriq"]["CEDAR_CONNECTORS"] = json.dumps(
        {
            key: {**value, "url": f"http://127.0.0.1:{args.cedar_port}"}
            for key, value in json.loads(runtime["veriq"]["CEDAR_CONNECTORS"]).items()
        }
    )
    write_private(path / "runtime.json", json.dumps(runtime, indent=2) + "\n")
    save(path, config)
    print("Created isolated synthetic run:", args.run)


def databases(path, config):
    if config["storage"] != "postgres":
        return
    for index, app in enumerate(("cedar", "veriq")):
        name = "veriq-rehearsal-" + config["id"] + "-" + app
        exists = subprocess.run(["podman", "container", "exists", name]).returncode == 0
        if exists:
            subprocess.run(["podman", "start", name], check=True, stdout=subprocess.DEVNULL)
        else:
            free_port(config["db_ports"][index])
            subprocess.run(
                [
                    "podman",
                    "run",
                    "--pull=never",
                    "-d",
                    "--name",
                    name,
                    "--label",
                    "veriq.rehearsal=" + config["id"],
                    "--memory=256m",
                    "--env-file",
                    str(path / (app + "-db.env")),
                    "-p",
                    f"127.0.0.1:{config['db_ports'][index]}:5432",
                    "-v",
                    name + "-data:/var/lib/postgresql/data",
                    "docker.io/library/postgres:16",
                    "postgres",
                    "-c",
                    "shared_buffers=32MB",
                    "-c",
                    "max_connections=20",
                ],
                check=True,
                stdout=subprocess.DEVNULL,
            )
        wait_for(
            app + " PostgreSQL",
            lambda: (
                subprocess.run(
                    ["podman", "exec", name, "pg_isready", "-U", app, "-d", app],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                ).returncode
                == 0
            ),
        )


def up(args, path, config):
    startup = time.monotonic()
    databases(path, config)
    runtime = json.loads((path / "runtime.json").read_text())
    common = config["common"]
    if not args.without_model and not config["external_model"]:
        if not alive(config["processes"].get("model")):
            free_port(config["model_port"])
        binary, weights = Path(config["runtime"]), Path(config["weights"])
        if not binary.is_file() or not weights.is_file():
            raise ValueError(
                "Provision the approved runtime/weights first; nothing is downloaded by up"
            )
        spawn(
            path,
            config,
            "model",
            [
                str(binary),
                "--model",
                str(weights),
                "--alias",
                common["LOCAL_AI_MODEL"],
                "--host",
                "127.0.0.1",
                "--port",
                str(config["model_port"]),
                "--ctx-size",
                common["LOCAL_AI_CONTEXT_WINDOW"],
                "--parallel",
                "1",
                "--threads",
                "4",
                "--batch-size",
                "64",
                "--ubatch-size",
                "32",
                "--n-gpu-layers",
                "0",
                "--chat-template",
                "chatml",
                "--no-webui",
            ],
            {**os.environ, "LD_LIBRARY_PATH": str(binary.parent)},
        )
        spawn(
            path,
            config,
            "guard",
            [sys.executable, "-m", "scripts.rehearsal", "guard", "--run", args.run],
            os.environ.copy(),
        )
        with httpx.Client(trust_env=False, timeout=3) as client:
            wait_for(
                "actual model alias",
                lambda: any(
                    m["id"] == common["LOCAL_AI_MODEL"]
                    for m in client.get(common["LOCAL_AI_URL"] + "/models").json().get("data", [])
                ),
                240,
            )
    for app in ("cedar", "veriq"):
        if not alive(config["processes"].get(app)):
            free_port(config[app + "_port"])
        spawn(
            path,
            config,
            app,
            [
                sys.executable,
                "-m",
                "scripts.run",
                app,
                "--container",
                "--port",
                str(config[app + "_port"]),
            ],
            {**os.environ, **runtime[app], **common},
        )
    session = Session(path, config)
    try:
        for app in ("cedar", "veriq"):
            wait_for(app + " ready", lambda app=app: session.request(app, "GET", "/ready"))
    finally:
        session.close()
    spawn(
        path,
        config,
        "worker",
        [sys.executable, "-m", "scripts.ai_worker"],
        {**os.environ, **runtime["veriq"], **common},
    )
    session = Session(path, config)

    def worker_ready():
        ready = session.request("veriq", "GET", "/v1/setup/readiness")["ai"]
        return ready["worker_configuration_consistent"] and any(
            worker["last_seen_epoch"] >= config["processes"]["worker"].get("started_epoch", 0)
            for worker in ready["active_workers"]
        )

    try:
        wait_for("durable worker heartbeat and matching configuration", worker_ready, 45)
    finally:
        session.close()
    config["last_startup_seconds"] = round(time.monotonic() - startup, 3)
    save(path, config)
    print("Services running for", args.run, "(not model-qualified)")


def stop(path, config, service="all"):
    names = (
        ["worker", "veriq", "cedar", "guard", "model"]
        if service == "all"
        else ["guard", "model"]
        if service == "model"
        else [service]
    )
    for name in names:
        stop_process(config["processes"].get(name))
    if service == "all" and config["storage"] == "postgres":
        for app in ("cedar", "veriq"):
            name = "veriq-rehearsal-" + config["id"] + "-" + app
            subprocess.run(
                ["podman", "stop", "-t", "15", name], stdout=subprocess.DEVNULL, check=True
            )
    print("Stopped selected owned services; data retained")


def guard(path, config):
    model = config["processes"].get("model")
    resource_file = path / "resources.json"
    samples = json.loads(resource_file.read_text()) if resource_file.exists() else []
    while alive(model):
        info = dict(line.split(":", 1) for line in Path("/proc/meminfo").read_text().splitlines())
        available = int(info["MemAvailable"].split()[0])
        psi = float(Path("/proc/pressure/memory").read_text().split("full avg10=")[1].split()[0])
        status = Path(f"/proc/{model['pid']}/status")
        if not status.exists():
            break
        memory = dict(line.split(":", 1) for line in status.read_text().splitlines())
        samples.append(
            {
                "epoch": time.time(),
                "available_kib": available,
                "full_psi_avg10": psi,
                "rss_kib": int(memory.get("VmRSS", "0 kB").split()[0]),
                "swap_kib": int(memory.get("VmSwap", "0 kB").split()[0]),
            }
        )
        samples = samples[-1800:]
        write_private(path / "resources.json", json.dumps(samples))
        if available < 384 * 1024 or psi > 20:
            write_private(path / "model-emergency-stop.json", json.dumps(samples[-1]))
            stop_process(model)
            return
        time.sleep(2)


def prepare(session):
    r = session.request
    r(
        "veriq",
        "POST",
        "/v1/setup",
        {
            "institution_name": "Cedar synthetic bank",
            "deployment_label": "Live rehearsal " + session.config["id"][:8],
            "synthetic_development": True,
        },
    )
    sources = r("veriq", "GET", "/v1/sources")
    if not sources:
        r(
            "veriq",
            "POST",
            "/v1/identity/namespaces",
            {
                "namespace": "cedar-rehearsal-master",
                "authority_ref": "synthetic-master-v1",
                "source_ids": [s["source_id"] for s in session.runtime["sources"]],
            },
        )
    existing = {s["data"]["source_id"] for s in sources}
    for source in session.runtime["sources"]:
        if source["source_id"] not in existing:
            r(
                "veriq",
                "POST",
                "/v1/sources",
                {
                    **source,
                    "identity_namespace": "cedar-rehearsal-master",
                    "identity_authority_ref": "synthetic-master-v1",
                    "ai_enabled": True,
                },
            )
    r("cedar", "POST", "/v1/simulator/seed", token="cedar_simulator")
    text = (
        "Synthetic rehearsal "
        + session.config["id"]
        + ": R1 uses G1. Customer receipt must be checked independently of processing completion."
    )
    if not any(d["data"]["text"] == text for d in r("cedar", "GET", "/v1/institutional/documents")):
        r("cedar", "POST", "/v1/institutional/documents", {"text": text})
    pull_all(session)
    r("veriq", "POST", "/v1/setup/activate")
    print("Synthetic source setup prepared; no conclusions inserted")


def pull_all(session):
    for source in session.runtime["sources"]:
        for _ in range(5):
            result = session.request(
                "veriq", "POST", f"/v1/connectors/{source['source_id']}/pull", expected=(200, 409)
            )
            if "received" in result:
                break
            time.sleep(0.2)
        else:
            raise RuntimeError("Concurrent polling kept advancing source; retry preparation")


def scenario(session, phase):
    r = session.request
    key = session.config["id"]
    state_file = session.path / "scenario.json"
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    if phase == "anomaly":
        r(
            "cedar",
            "POST",
            "/v1/simulator/conditions",
            {"gateway_id": "G1", "timeout": True},
            token="cedar_simulator",
        )
        for n in range(10):
            r(
                "cedar",
                "POST",
                "/v1/transfers",
                {
                    "account_id": "A1",
                    "amount_minor": 1000,
                    "route_id": "R1",
                    "idempotency_key": key + "-anomaly-" + str(n),
                },
                token="customer1",
            )
        pull_all(session)
        incidents = r("veriq", "GET", "/v1/incidents")
        assert incidents and incidents[-1]["data"]["gateway_id"] == "G1"
        state["incident_id"] = incidents[-1]["id"]
        state.setdefault("detected_before_complaint", not r("veriq", "GET", "/v1/interactions"))
    elif phase == "customer":
        if not state.get("incident_id"):
            raise ValueError("Create and observe the operational anomaly before the customer phase")
        tx = r(
            "cedar",
            "POST",
            "/v1/transfers",
            {
                "account_id": "A1",
                "amount_minor": 1500,
                "route_id": "R1",
                "idempotency_key": key + "-customer-transfer",
            },
            token="customer1",
        )
        state["transaction_id"] = tx["data"]["transaction_id"]
        reports = r("cedar", "GET", "/v1/interactions")
        existing = next(
            (
                item
                for item in reports
                if item["data"].get("source_native_record_id") == key + "-complaint"
            ),
            None,
        )
        state.setdefault("report_sent_at", existing["data"]["occurred_at"] if existing else now())
        # Persist the exact native request time before sending; retries must not change it.
        write_private(state_file, json.dumps(state, indent=2) + "\n")
        r(
            "cedar",
            "POST",
            "/v1/channels/in-app/messages",
            {
                "message_id": key + "-complaint",
                "sent_at": state["report_sent_at"],
                "customer_id": "C1",
                "message": "My transfer is pending and the beneficiary has not received it.",
                "transaction_id": state["transaction_id"],
            },
            token="customer1",
        )
        pull_all(session)
        investigation = next(
            i
            for i in r("veriq", "GET", "/v1/investigations")
            if i["data"]["trigger_type"] == "interaction"
        )
        state["investigation_id"] = investigation["id"]
        state["before_reconciliation"] = state.get("before_reconciliation") or r(
            "veriq", "GET", f"/v1/investigations/{investigation['id']}/workspace"
        )
    elif phase == "reconcile":
        txid = state["transaction_id"]
        tx = next(
            t for t in r("cedar", "GET", "/v1/transactions") if t["data"]["transaction_id"] == txid
        )
        if tx["data"]["status"] == "pending":
            r(
                "cedar",
                "POST",
                f"/v1/transactions/{txid}/reconcile",
                {
                    "outcome": "completed",
                    "beneficiary_verified": False,
                    "rationale": "Authorized synthetic staff reconciliation; receipt still unverified",
                },
            )
        pull_all(session)
        workspace = r("veriq", "GET", f"/v1/investigations/{state['investigation_id']}/workspace")
        old = {rev["id"]: rev for rev in state["before_reconciliation"]["revisions"]}
        new = {rev["id"]: rev for rev in workspace["revisions"]}
        assert all(new.get(k) == v for k, v in old.items()), "Historical revision changed"
        assert len(new) > len(old), "Reconciliation did not create a new revision"
        state["historical_revisions_preserved"] = True
        state["after_reconciliation"] = workspace
    write_private(state_file, json.dumps(state, indent=2) + "\n")
    print("Scenario phase completed:", phase)
    return state


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "command",
        choices=[
            "init",
            "up",
            "preflight",
            "prepare",
            "scenario",
            "status",
            "stop",
            "reset",
            "guard",
        ],
    )
    parser.add_argument("--run", required=True)
    parser.add_argument("--storage", choices=["sqlite", "postgres"], default="sqlite")
    parser.add_argument("--veriq-port", type=int, default=8610)
    parser.add_argument("--cedar-port", type=int, default=8611)
    parser.add_argument("--model-port", type=int, default=8181)
    parser.add_argument("--db-port", type=int, default=56320)
    parser.add_argument(
        "--runtime", default=str(ROOT / "var/llama-runtime/llama-b11799/llama-server")
    )
    parser.add_argument(
        "--weights", default=str(ROOT / "var/models/qwen2.5-1.5b-instruct-q4_k_m.gguf")
    )
    parser.add_argument("--model-alias", default="veriq-qwen2.5-1.5b")
    parser.add_argument("--model-version", default="qwen1.5-live-rehearsal-v1")
    parser.add_argument("--external-model")
    parser.add_argument("--allowed-model-hosts", default="127.0.0.1,localhost")
    parser.add_argument("--context", type=int, default=4096)
    parser.add_argument("--tokens", type=int, default=768)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--without-model", action="store_true")
    parser.add_argument("--phase", choices=["anomaly", "customer", "reconcile"], default="anomaly")
    parser.add_argument(
        "--service", choices=["all", "worker", "veriq", "cedar", "model"], default="all"
    )
    args = parser.parse_args()
    os.chdir(ROOT)
    if args.command == "init":
        initialize(args)
        return
    path, config = load(args.run)
    if args.command == "up":
        up(args, path, config)
    elif args.command == "stop":
        stop(path, config, args.service)
    elif args.command == "guard":
        guard(path, config)
    elif args.command == "reset":
        stop(path, config)
        # Archive only the explicitly selected owned run. Nothing is deleted.
        destination = path.with_name(path.name + "-archived-" + uuid4().hex[:8])
        path.rename(destination)
        print(
            "Archived selected run; init a fresh run with the same name and intended configuration"
        )
    else:
        session = Session(path, config)
        try:
            if args.command == "prepare":
                prepare(session)
            elif args.command == "scenario":
                scenario(session, args.phase)
            elif args.command in {"status", "preflight"}:
                for app in ("cedar", "veriq"):
                    session.request(app, "GET", "/ready")
                result = session.request("veriq", "GET", "/v1/setup/readiness")
                print(json.dumps(result, indent=2))
        finally:
            session.close()


if __name__ == "__main__":
    main()
