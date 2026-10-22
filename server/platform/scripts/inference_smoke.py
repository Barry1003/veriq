"""Execute all local model tasks using real HTTP; no mocks or fallback prose."""

import json
from pathlib import Path

from apps.veriq.backend.inference import LocalInference
from shared.contracts import now


def main():
    inference = LocalInference()
    stamp = now()
    evidence = [
        {
            "id": "synthetic-evidence-1",
            "kind": "customer_report",
            "data": {"text": "Transfer is pending", "transaction_id": "TX-SYNTHETIC"},
        }
    ]
    tasks = {
        "extract_knowledge": {
            "evidence_id": "synthetic-document-1",
            "document": {
                "text": f"Synthetic bank inventory, valid from {stamp}. Route with bank identifier R1 (Domestic transfers) uses gateway with bank identifier G1 (Primary gateway)."
            },
        },
        "interpret_interaction": {
            "interaction": {"text": "My transfer is delayed", "transaction_id": "TX-SYNTHETIC"}
        },
        "analyze_investigation": {
            "context": {
                "known": "Customer reported pending transfer; no authoritative bank status supplied"
            },
            "evidence": evidence,
        },
    }
    results = {}
    for task, inputs in tasks.items():
        try:
            result = inference.run(task, inputs)
            results[task] = {
                "state": "validated_candidate",
                "output": result,
                "inference_metadata": inference.execution_metadata(),
            }
        except Exception as exc:
            results[task] = {
                "state": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "untrusted_model_output": getattr(exc, "raw_output", None),
                "validation_error": getattr(exc, "validation_error", None),
            }
    report = {
        "synthetic_inputs": True,
        "model": inference.model,
        "adapter": "local_http_no_test_doubles",
        "tasks": results,
        "all_tasks_passed": all(r["state"] == "validated_candidate" for r in results.values()),
    }
    root = Path(__file__).resolve().parents[1]
    (root / "var").mkdir(exist_ok=True)
    (root / "var/live-inference-result.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["all_tasks_passed"] else 1)


if __name__ == "__main__":
    main()
