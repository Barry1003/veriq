"""Frozen Ticket 005 cases: SQLite/ASGI evidence fixtures + ACTUAL local HTTP model.

No model doubles, no fabricated successful outputs. Lifecycle mutations are explicit
controlled harness actions. JSON/transport checks are not a factual quality oracle.
"""

import argparse
import hashlib
import json
import os
import tempfile
import time
from pathlib import Path

from pytest import MonkeyPatch

from apps.veriq.backend import orchestration
from apps.veriq.backend.inference import LocalInference
from scripts.qualify_low_resource import sample
from shared.db import get, rows, view
from tests.conftest import SCOPE, header, knowledge, observation, report, system, transaction

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "docs/implementation/ticket005/actual-model-evaluation.json",
    )
    args = parser.parse_args()
    dataset = ROOT / "evaluations/adaptive-v1.json"
    cases = json.loads(dataset.read_text())["cases"]
    output = args.output
    result = {
        "dataset_sha256": hashlib.sha256(dataset.read_bytes()).hexdigest(),
        "infrastructure": "Actual local HTTP inference; authorized SQLite/ASGI evidence fixtures, not PostgreSQL full stack",
        "scope": "Synthetic unfamiliar cases; no conclusions injected; frozen before first execution",
        "model": os.getenv("LOCAL_AI_MODEL"),
        "qualification": "unqualified",
        "context": 4096,
        "output_token_limit": os.getenv("LOCAL_AI_MAX_OUTPUT_TOKENS", "768"),
        "baseline_resources": sample(),
        "cases": [],
    }
    for case in cases:
        monkeypatch = MonkeyPatch()
        with tempfile.TemporaryDirectory(prefix="veriq-ticket005-") as tmp:
            fixture = system.__wrapped__(Path(tmp), monkeypatch)
            bank = next(fixture)
            try:
                for sid, kind, authority in [
                    ("k", "knowledge", "structure"),
                    ("t", "transaction", "status"),
                    ("o", "observation", "measurement"),
                    ("c", "interaction", "report"),
                    ("d", "document", "document"),
                ]:
                    bank["register"](sid, kind, authority)
                bank["send"](knowledge(gateway="G2"), source="k")
                doc = bank["send"]({"text": case["document"]}, "document", "d").json()[
                    "evidence_id"
                ]
                bank["send"](
                    transaction(gateway=case["gateway"], status=case["status"]), "transaction", "t"
                )
                bank["send"](observation(gateway="G2"), "observation", "o")
                bank["send"](report(text=case["customer"]), "interaction", "c")
                inv = next(
                    r
                    for r in bank["v"].get("/v1/investigations", headers=header()).json()
                    if r["data"]["trigger_type"] == "interaction"
                )
                task = (
                    bank["v"]
                    .post(f"/v1/investigations/{inv['id']}/adaptive", headers=header())
                    .json()
                )
                engine = LocalInference()

                class RecordedLive:
                    endpoint = engine.endpoint
                    model = engine.model
                    changed = False
                    calls = []

                    def run(self, kind, inputs):
                        entry = {"generation_task": kind, "input": inputs}
                        self.calls.append(entry)
                        try:
                            answer = engine.run(kind, inputs)
                            entry["raw_validated_decision"] = answer
                            return answer
                        except Exception as exc:
                            entry.update(
                                error=type(exc).__name__,
                                raw_output=getattr(exc, "raw_output", None),
                            )
                            raise
                        finally:
                            entry["metadata"] = engine.execution_metadata()
                            if not self.changed and case["id"].startswith("E-"):
                                if case["id"] == "E-revocation":
                                    bank["v"].post(
                                        "/v1/sources/t/authorization",
                                        headers=header(),
                                        json={
                                            "state": "revoked",
                                            "rationale": "Controlled revocation during actual inference",
                                        },
                                    )
                                else:
                                    bank["send"](
                                        transaction(
                                            gateway=case["gateway"], status="completed", version=2
                                        ),
                                        "transaction",
                                        "t",
                                    )
                                self.changed = True

                    def execution_metadata(self):
                        return engine.execution_metadata()

                live = RecordedLive()
                started = time.monotonic()
                for _ in range(8):
                    state = orchestration.run_one(
                        bank["vdb"], SCOPE, live, bank["auth"], task["id"]
                    )
                    if not state or state["data"]["state"] not in {"queued", "running"}:
                        break
                with bank["vdb"].session() as s:
                    stored = get(s, SCOPE, "ai_task", task["id"])
                    trace = [
                        view(r)
                        for r in rows(s, SCOPE, "investigative_step")
                        if r.data["task_id"] == task["id"]
                    ]
                    runs = [
                        view(r)
                        for r in rows(s, SCOPE, "inference_run")
                        if r.data.get("task_id") == task["id"]
                    ]
                discovered = {
                    e["id"]
                    for step in trace
                    for e in step["data"].get("tool_result", {}).get("evidence", [])
                }
                initial = (
                    set(live.calls[0]["input"]["initial_evidence_ids"]) if live.calls else set()
                )
                assessment = runs[-1]["data"].get("result") if runs else None
                metrics = {
                    "actual_http_generations": sum(
                        c["metadata"].get("transport") == "http"
                        and c["metadata"].get("usage", {}).get("completion_tokens", 0) > 0
                        for c in live.calls
                    ),
                    "schema_valid_decisions": sum(
                        "raw_validated_decision" in c for c in live.calls
                    ),
                    "executed_tools": sum("tool_result" in st["data"] for st in trace),
                    "new_evidence_retrieved": bool(discovered - initial),
                    "document_discovered": doc in discovered,
                    "assessment_published": assessment is not None,
                    "safety_lifecycle_invalidated": stored.data.get("outcome") == "invalidated"
                    if case["id"].startswith("E-")
                    else None,
                    "competing_hypothesis_count": len(assessment.get("hypotheses", []))
                    if assessment
                    else 0,
                    "reasoning_quality": "requires manual rubric inspection; schema is not factual correctness",
                }
                result["cases"].append(
                    {
                        "id": case["id"],
                        "requirement": case["require"],
                        "elapsed_seconds": round(time.monotonic() - started, 3),
                        "task": orchestration.public(stored),
                        "calls": live.calls,
                        "steps": trace,
                        "runs": runs,
                        "metrics": metrics,
                        "resources_after": sample(),
                    }
                )
                output.write_text(json.dumps(result, indent=2) + "\n")
                print(case["id"], stored.data.get("outcome"), json.dumps(metrics), flush=True)
            finally:
                try:
                    next(fixture)
                except StopIteration:
                    pass
                monkeypatch.undo()
    result["after_resources"] = sample()
    output.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
