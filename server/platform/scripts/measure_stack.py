"""Sample actual full-stack memory/CPU accounting; preserve OS protections.

A severe host-stall/low-headroom emergency stops only this isolated model service.
Container memory accounting is not exclusive process RSS/PSS.
"""

import argparse
import json
import subprocess
import time
from pathlib import Path

from scripts.qualify_low_resource import sample
from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default="veriq-ticket004")
    parser.add_argument("--stop-file", type=Path, default=ROOT / "var/ticket004-measure.stop")
    args = parser.parse_args()
    if not args.project.startswith("veriq-ticket004"):
        raise SystemExit("Only explicitly isolated Ticket 004 stacks may be controlled")
    output = ROOT / "var/reports/ticket004/stack-resources.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    names = [
        args.project + "_" + service + "_1"
        for service in ("cedar-db", "veriq-db", "cedar", "veriq", "ai-worker", "local-ai")
    ]
    report = {
        "started_at": now(),
        "scope": "Actual execution host; not assumed resources of another laptop",
        "metric": "Podman container memory accounting, host available RAM/swap/PSI; not peak process RSS",
        "baseline": sample(),
        "samples": [],
        "emergency_stop_triggered": False,
    }
    while not args.stop_file.exists():
        host = sample()
        proc = subprocess.run(
            ["podman", "stats", "--no-stream", "--format", "json", *names],
            capture_output=True,
            text=True,
            timeout=15,
        )
        report["samples"].append(
            {
                "host": host,
                "containers": json.loads(proc.stdout) if proc.returncode == 0 else [],
                "stats_error": proc.returncode != 0,
            }
        )
        if host["mem_available_bytes"] < 256 * 1024**2 or host["memory_full_psi_avg10"] > 20:
            subprocess.run(
                ["podman", "stop", names[-1]],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30,
            )
            report["emergency_stop_triggered"] = True
            break
        output.write_text(json.dumps(report, indent=2) + "\n")
        time.sleep(2)
    report["completed_at"] = now()
    report["after"] = sample()
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(
        "Full-stack resource samples:",
        len(report["samples"]),
        "emergency stop:",
        report["emergency_stop_triggered"],
    )


if __name__ == "__main__":
    main()
