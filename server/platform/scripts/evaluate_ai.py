"""Run the frozen synthetic cases against real local HTTP inference, saving all results."""

import argparse
import json
import re
import time
from pathlib import Path

from apps.veriq.backend.inference import LocalInference
from shared.contracts import now

ROOT = Path(__file__).resolve().parents[1]


def score(case, result):
    expected = case["expected"]
    checks = {}
    if case["task"] == "extract_knowledge":
        actual_entities = {e["native_id"] for e in result["entities"]}
        actual_edges = {
            tuple(e[k] for k in ("subject", "predicate", "object")) for e in result["relationships"]
        }
        expected_edges = {tuple(e) for e in expected["edges"]}
        checks.update(
            entity_set=actual_entities == set(expected["entities"]),
            supported_edges=actual_edges <= expected_edges,
            required_edges=expected_edges <= actual_edges,
        )
        if "entity_types" in expected:
            checks["entity_types"] = {
                e["native_id"]: e["kind"] for e in result["entities"]
            } == expected["entity_types"]
    elif case["task"] == "interpret_interaction":
        checks.update(
            category=result["category"] == expected["category"],
            reference=result["transaction_reference"] == expected["transaction_reference"],
        )
    else:
        allowed = {e["id"] for e in case["inputs"]["evidence"]}
        statements = result["hypotheses"] + result["recommendations"]
        checks.update(
            citations=all(set(s["evidence_ids"]) <= allowed for s in statements),
            epistemic_status=all(
                s["epistemic_status"] == "hypothesis" for s in result["hypotheses"]
            )
            and all(s["epistemic_status"] == "recommendation" for s in result["recommendations"]),
            substantive=bool(statements),
        )
    if expected.get("uncertainty"):
        unknowns = result.get("unknowns", result.get("missing_information", []))
        checks["explicit_uncertainty"] = bool(unknowns) and bool(
            re.search(
                r"unknown|uncertain|status|outcome|receipt|verif|confirm|pending|clarif|transaction|missing|not provided",
                " ".join(unknowns),
                re.I,
            )
        )
    if expected.get("conflict"):
        checks["conflict_acknowledged"] = bool(
            re.search(
                r"conflict|contradict|disagree|discrepan|inconsisten", json.dumps(result), re.I
            )
        )
    if expected.get("forbid_financial_assertion"):
        texts = " ".join(s["text"] for s in result["hypotheses"] + result["recommendations"])
        checks["no_unqualified_financial_assertion"] = not bool(
            re.search(
                r"(?:transfer|payment) (?:has |is )?(?:definitely |confirmed |successfully )(?:failed|completed|succeeded)|(?:automatic|immediate) refund",
                texts,
                re.I,
            )
        )
    return checks


def evaluate(inference, dataset, output):
    report = {
        "dataset_version": dataset["dataset_version"],
        "synthetic": True,
        "model": inference.model,
        "started_at": now(),
        "transport": "real_local_http",
        "cases": [],
    }
    for case in dataset["cases"]:
        started = time.monotonic()
        entry = {
            "id": case["id"],
            "task": case["task"],
            "inputs": case["inputs"],
            "expected": case["expected"],
        }
        try:
            result = inference.run(case["task"], case["inputs"])
            checks = score(case, result)
            entry.update(
                state="validated_candidate",
                output=result,
                checks=checks,
                quality_passed=all(checks.values()),
                inference_metadata=inference.execution_metadata(),
            )
        except Exception as exc:
            entry.update(
                state="failed",
                error=str(exc),
                error_type=type(exc).__name__,
                quality_passed=False,
                untrusted_model_output=getattr(exc, "raw_output", None),
                validation_error=getattr(exc, "validation_error", None),
            )
        entry["elapsed_seconds"] = round(time.monotonic() - started, 3)
        report["cases"].append(entry)
        report["summary"] = {
            "total": len(dataset["cases"]),
            "attempted": len(report["cases"]),
            "schema_valid": sum(e["state"] == "validated_candidate" for e in report["cases"]),
            "quality_passed": sum(e["quality_passed"] for e in report["cases"]),
        }
        output.write_text(json.dumps(report, indent=2) + "\n")
        print(
            case["id"],
            entry["state"],
            "quality:",
            entry["quality_passed"],
            entry["elapsed_seconds"],
            "seconds",
            flush=True,
        )
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output", type=Path, default=ROOT / "var/reports/ticket002/quality-results.json"
    )
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    dataset = json.loads((ROOT / "evaluations/cases.json").read_text())
    result = evaluate(LocalInference(), dataset, args.output)
    print(json.dumps(result["summary"]))
    # Evaluation failures remain in the report and are never silently removed/retried.
    raise SystemExit(0 if result["summary"]["quality_passed"] == len(dataset["cases"]) else 1)


if __name__ == "__main__":
    main()
