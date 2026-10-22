"""Apply the current support guard to saved actual outputs; never claim new inference."""

import hashlib
import json
from pathlib import Path

from apps.veriq.backend.evidence_support import prepare, verify

ROOT = Path(__file__).resolve().parents[1]


def main():
    folder = ROOT / "var/reports/ticket003"
    codehash = hashlib.sha256(
        (ROOT / "apps/veriq/backend/evidence_support.py").read_bytes()
    ).hexdigest()
    for model in ("0.5b", "1.5b-relaxed"):
        report = {
            "source_execution": "Previously captured real llama.cpp HTTP outputs, no additional inference calls",
            "verification_code_sha256": codehash,
            "datasets": {},
        }
        for kind in ("frozen", "heldout"):
            path = folder / f"resource-{model}-{kind}.json"
            raw = json.loads(path.read_text())
            entries = []
            for entry in raw["cases"]:
                row = {
                    "id": entry["id"],
                    "raw_quality_passed": entry["raw_quality_passed"],
                    "schema_valid": entry["schema_valid"],
                    "accepted": False,
                }
                if entry.get("output"):
                    try:
                        prepare(entry["task"], entry["inputs"])
                        row["receipt"] = verify(entry["task"], entry["inputs"], entry["output"])
                        row["accepted"] = True
                    except Exception as exc:
                        row["error"] = str(exc)
                else:
                    row["error"] = entry.get("error")
                entries.append(row)
            report["datasets"][kind] = {
                "source_report": path.name,
                "cases": entries,
                "summary": {
                    "total": len(entries),
                    "schema_valid": sum(e["schema_valid"] for e in entries),
                    "raw_quality_passed": sum(e["raw_quality_passed"] for e in entries),
                    "supported_candidates": sum(e["accepted"] for e in entries),
                    "supported_and_rubric_correct": sum(
                        e["accepted"] and e["raw_quality_passed"] for e in entries
                    ),
                },
            }
        (folder / f"resource-{model}-final-verification.json").write_text(
            json.dumps(report, indent=2) + "\n"
        )
        print(model, {k: v["summary"] for k, v in report["datasets"].items()})


if __name__ == "__main__":
    main()
