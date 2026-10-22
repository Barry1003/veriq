"""One measured CPU model load, sequential bounded requests, then unload.

Stops on low host headroom, active swapping, pressure, startup or request timeout.
Samples global memory and per-runtime RSS/PSS/swap; does not equate RSS with
exclusive allocation. Host background activity can affect global measurements.
"""

import argparse
import hashlib
import json
import os
import platform
import subprocess
import threading
import time
from pathlib import Path

import httpx

from apps.veriq.backend.inference import LocalInference
from scripts.evaluate_reliability import evaluate
from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def fields(path):
    result = {}
    try:
        for line in Path(path).read_text().splitlines():
            key, _, value = line.partition(":")
            if (
                key.replace("_", "").isalpha()
                and value.strip().split()
                and value.strip().split()[0].isdigit()
            ):
                result[key] = int(value.strip().split()[0]) * 1024
    except (OSError, ProcessLookupError):
        pass
    return result


def sample(pid=None):
    mem = fields("/proc/meminfo")
    vm = dict(line.split() for line in Path("/proc/vmstat").read_text().splitlines())
    pressure = Path("/proc/pressure/memory").read_text()
    full = next(line for line in pressure.splitlines() if line.startswith("full "))
    avg = float(dict(x.split("=") for x in full.split()[1:])["avg10"])
    process = fields(f"/proc/{pid}/smaps_rollup") if pid else {}
    driver = fields(f"/proc/{os.getpid()}/smaps_rollup")
    return {
        "at": now(),
        "monotonic": time.monotonic(),
        "mem_total_bytes": mem["MemTotal"],
        "mem_available_bytes": mem["MemAvailable"],
        "swap_used_bytes": mem["SwapTotal"] - mem["SwapFree"],
        "pswpin_pages": int(vm["pswpin"]),
        "pswpout_pages": int(vm["pswpout"]),
        "memory_full_psi_avg10": avg,
        "driver_rss_bytes": driver.get("Rss", 0),
        "driver_pss_bytes": driver.get("Pss", 0),
        "runtime_rss_bytes": process.get("Rss", 0),
        "runtime_pss_bytes": process.get("Pss", 0),
        "runtime_swap_bytes": process.get("Swap", 0),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest", type=Path, default=ROOT / "deploy/local-ai-small-manifest.json"
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8183)
    parser.add_argument("--evaluate", action="store_true")
    parser.add_argument("--context", type=int, choices=[2048, 4096], default=4096)
    parser.add_argument("--output-tokens", type=int, choices=[384, 512], default=512)
    parser.add_argument("--no-warmup", action="store_true")
    parser.add_argument(
        "--relaxed-resource-guards",
        action="store_true",
        help="Explicit operator override: no swap/headroom cutoffs, emergency stall watchdog only",
    )
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(args.manifest.read_text())
    weight = manifest["model_files"][0]
    model = ROOT / "var/models" / weight["rfilename"]
    with model.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != weight["lfs"]["sha256"]:
        raise SystemExit("Model checksum mismatch; no inference attempted")
    runtime = ROOT / "var/llama-runtime/llama-b11799/llama-server"
    baseline = sample()
    report = {
        "started_at": now(),
        "execution_environment": platform.platform(),
        "cpu_count": os.cpu_count(),
        "cpu": next(
            (
                x.partition(":")[2].strip()
                for x in Path("/proc/cpuinfo").read_text().splitlines()
                if x.startswith("model name")
            ),
            None,
        ),
        "scope": "Measured current execution host only; not a claim about a different personal laptop",
        "model_file": model.name,
        "model_sha256": digest,
        "baseline": baseline,
        "limits": {
            "context_tokens": args.context,
            "parallel": 1,
            "threads": 4,
            "max_output_tokens": args.output_tokens,
            "request_timeout_seconds": 90,
            "minimum_available_bytes": None if args.relaxed_resource_guards else 805306368,
            "max_swap_io_bytes": None if args.relaxed_resource_guards else 67108864,
            "max_full_psi_avg10": 20 if args.relaxed_resource_guards else 5,
        },
        "samples": [],
        "state": "not_started",
    }
    if not args.relaxed_resource_guards and baseline["mem_available_bytes"] < 2 * 1024**3:
        report.update(
            state="skipped", reason="Less than 2 GiB available before load; stop size escalation"
        )
        args.output.write_text(json.dumps(report, indent=2) + "\n")
        raise SystemExit(2)
    alias = "veriq-resource-trial"
    command = [
        str(runtime),
        "--model",
        str(model),
        "--alias",
        alias,
        "--host",
        "127.0.0.1",
        "--port",
        str(args.port),
        "--ctx-size",
        str(args.context),
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
    ]
    if args.no_warmup:
        command.append("--no-warmup")
    report["runtime_command"] = command
    stop, violation = threading.Event(), []
    log = (ROOT / "var/ticket003-runtime.log").open("w")
    started = time.monotonic()
    process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)

    def monitor():
        while not stop.wait(0.25):
            current = sample(process.pid)
            report["samples"].append(current)
            swap_io = (
                (current["pswpin_pages"] - baseline["pswpin_pages"])
                + (current["pswpout_pages"] - baseline["pswpout_pages"])
            ) * os.sysconf("SC_PAGE_SIZE")
            unsafe = current["memory_full_psi_avg10"] > (20 if args.relaxed_resource_guards else 5)
            if not args.relaxed_resource_guards:
                unsafe = unsafe or current["mem_available_bytes"] < 805306368 or swap_io > 67108864
            if unsafe:
                violation.append(
                    "System stall watchdog exceeded; stopped model"
                    if args.relaxed_resource_guards
                    else "Memory headroom, swap-I/O or pressure guard exceeded; stopped model"
                )
                process.terminate()
                return

    monitor_thread = threading.Thread(target=monitor, daemon=True)
    monitor_thread.start()
    try:
        with httpx.Client(timeout=2, trust_env=False) as client:
            while True:
                if violation or process.poll() is not None:
                    raise RuntimeError(violation[0] if violation else "Runtime exited during load")
                try:
                    response = client.get(f"http://127.0.0.1:{args.port}/health")
                    if response.status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                if time.monotonic() - started > 90:
                    raise RuntimeError("Model load exceeded 90 seconds; stop size escalation")
                time.sleep(0.2)
        report["load_seconds"] = round(time.monotonic() - started, 3)
        report["loaded_idle"] = sample(process.pid)
        os.environ["LOCAL_AI_MAX_OUTPUT_TOKENS"] = str(args.output_tokens)
        os.environ["LOCAL_AI_TIMEOUT_SECONDS"] = "90"
        inference = LocalInference(f"http://127.0.0.1:{args.port}/v1", alias)
        request_start = time.monotonic()
        probe_input = {
            "interaction": {
                "text": "My transfer is pending and delayed",
                "transaction_id": "RESOURCE-TX",
            },
            "allowed_unknowns": [
                "Bank-recorded transaction status is unknown",
                "Beneficiary receipt is unverified",
            ],
        }
        report["probe_output"] = inference.run("interpret_interaction", probe_input)
        report["probe_latency_seconds"] = round(time.monotonic() - request_start, 3)
        report["probe_metadata"] = inference.execution_metadata()
        report["state"] = "controlled_trial_completed"
        if args.evaluate and not violation:
            for name, path in (
                ("frozen", ROOT / "evaluations/cases.json"),
                ("heldout", ROOT / "evaluations/heldout-ticket003.json"),
            ):
                result = evaluate(
                    inference,
                    path,
                    args.output.parent / f"{args.output.stem}-{name}.json",
                    abort_on_unavailable=True,
                )
                report[name + "_summary"] = result["summary"]
        if violation:
            raise RuntimeError(violation[0])
    except Exception as exc:
        report.update(state="stopped_or_failed", error=str(exc), stop_size_escalation=True)
    finally:
        stop.set()
        monitor_thread.join(timeout=2)
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        log.close()
        samples = report["samples"]
        report["peak_runtime_rss_bytes"] = max((x["runtime_rss_bytes"] for x in samples), default=0)
        report["peak_runtime_pss_bytes"] = max((x["runtime_pss_bytes"] for x in samples), default=0)
        report["minimum_host_available_bytes"] = min(
            (x["mem_available_bytes"] for x in samples), default=baseline["mem_available_bytes"]
        )
        report["after_unload"] = sample()
        report["completed_at"] = now()
        args.output.write_text(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {k: v for k, v in report.items() if k not in {"samples", "runtime_command"}},
                indent=2,
            )
        )

    if report["state"] != "controlled_trial_completed":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
