"""Unchanged frozen rubric plus separately reported support/abstention outcomes.

No expected values are passed to prepare(), model or verify(). Analysis authority
is explicitly granted by this synthetic harness, never inferred in production.
"""

import argparse
import hashlib
import json
import time
from copy import deepcopy
from pathlib import Path

from apps.veriq.backend.evidence_support import prepare, verify
from apps.veriq.backend.inference import InferenceUnavailable, LocalInference
from scripts.evaluate_ai import score
from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def evaluate(inference, path, output, abort_on_unavailable=False):
    dataset = json.loads(path.read_text())
    report = {
        "dataset_version": dataset["dataset_version"],
        "dataset_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "started_at": now(),
        "synthetic": True,
        "transport": "real_local_http",
        "model": inference.model,
        "authority_fixture": "Harness explicitly grants report/status/measurement authority to analysis evidence. Production uses authenticated registrations.",
        "contributions": "Identity, timestamps, support grammar, status conflicts and analysis catalog are deterministic. Model chooses candidates; these are not independent reasoning successes.",
        "cases": [],
    }
    for case in dataset["cases"]:
        inputs = deepcopy(case["inputs"])
        for e in inputs.get("evidence", []):
            e["authority"] = {
                "interaction": ["report"],
                "transaction": ["status"],
                "observation": ["measurement"],
            }.get(e["record_type"], [])
        entry = {
            "id": case["id"],
            "task": case["task"],
            "inputs": inputs,
            "expected": case["expected"],
            "model_attempted": False,
            "schema_valid": False,
            "raw_quality_passed": False,
            "accepted_quality_passed": False,
        }
        started = time.monotonic()
        try:
            bounded = prepare(case["task"], inputs)
            entry["model_attempted"] = True
            result = inference.run(case["task"], bounded)
            checks = score(case, result)
            entry.update(
                schema_valid=True,
                output=result,
                checks=checks,
                raw_quality_passed=all(checks.values()),
                inference_metadata=inference.execution_metadata(),
            )
            entry["support_verification"] = verify(case["task"], inputs, result)
            entry.update(state="supported_candidate", accepted_quality_passed=all(checks.values()))
        except Exception as exc:
            entry.update(
                state="abstained" if not entry["model_attempted"] else "quarantined",
                error=str(exc),
                error_type=type(exc).__name__,
                untrusted_model_output=getattr(exc, "raw_output", None),
                validation_error=getattr(exc, "validation_error", None),
            )
        stop_trial = (
            abort_on_unavailable and entry.get("error_type") == InferenceUnavailable.__name__
        )
        entry["elapsed_seconds"] = round(time.monotonic() - started, 3)
        report["cases"].append(entry)
        report["summary"] = {
            "total": len(dataset["cases"]),
            "attempted_cases": len(report["cases"]),
            "model_calls": sum(x["model_attempted"] for x in report["cases"]),
            "schema_valid": sum(x["schema_valid"] for x in report["cases"]),
            "raw_quality_passed": sum(x["raw_quality_passed"] for x in report["cases"]),
            "supported_candidates": sum(
                x["state"] == "supported_candidate" for x in report["cases"]
            ),
            "accepted_quality_passed": sum(x["accepted_quality_passed"] for x in report["cases"]),
            "abstentions_or_quarantines": sum(
                x["state"] != "supported_candidate" for x in report["cases"]
            ),
        }
        output.write_text(json.dumps(report, indent=2) + "\n")
        if stop_trial:
            raise RuntimeError("Runtime unavailable or request timed out; stopping resource trial")
        print(
            case["id"],
            entry["state"],
            "raw quality:",
            entry["raw_quality_passed"],
            entry["elapsed_seconds"],
            flush=True,
        )
    report["model_qualified"] = False
    report["qualification_note"] = (
        "A ten-case lexical rubric cannot qualify a production model; essential failures and narrow coverage remain explicit. Catalog selection is not autonomous diagnosis."
    )
    output.write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=ROOT / "evaluations/cases.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    report = evaluate(LocalInference(), args.dataset, args.output)
    print(json.dumps(report["summary"]))
    raise SystemExit(
        0 if report["summary"]["accepted_quality_passed"] == report["summary"]["total"] else 1
    )


if __name__ == "__main__":
    main()
