"""Measure only our isolated native inference process; retain OS protections."""

import argparse
import json
import os
import signal
import time
from pathlib import Path

from scripts.qualify_low_resource import sample

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output", type=Path, default=ROOT / "var/reports/ticket005/native-resources.json"
    )
    args = parser.parse_args()
    pid = int((ROOT / "var/ticket005-model.pid").read_text())
    command = Path(f"/proc/{pid}/cmdline").read_bytes()
    if b"llama-server" not in command or b"--port\x008181" not in command:
        raise SystemExit("Refusing to monitor an unrelated process")
    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "pid": pid,
        "scope": "Actual execution host and only this local model",
        "samples": [],
        "emergency_stop": False,
    }
    while not (ROOT / "var/ticket005-measure.stop").exists():
        try:
            observation = sample(pid)
        except ProcessLookupError:
            break
        report["samples"].append(observation)
        if (
            observation["mem_available_bytes"] < 384 * 1024**2
            or observation["memory_full_psi_avg10"] > 20
        ):
            os.kill(pid, signal.SIGTERM)
            report["emergency_stop"] = True
        output.write_text(json.dumps(report, indent=2) + "\n")
        if report["emergency_stop"]:
            break
        time.sleep(2)
    output.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
