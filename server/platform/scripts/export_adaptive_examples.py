"""Labelled frontend examples from actual API reads over persisted synthetic fixtures.

Model decisions here are an EXPLICIT CONTRACT DOUBLE. Tool returns are actual
server reads. This export never claims real model reasoning success.
"""

import json
import tempfile
from pathlib import Path

from pytest import MonkeyPatch

from apps.veriq.backend.adaptive_contracts import PublishedAssessment
from tests.conftest import header, system
from tests.test_ticket005 import ExploringModel, advance, setup

ROOT = Path(__file__).resolve().parents[1]


def main():
    output = ROOT / "var/reports/examples-v0.5.0"
    output.mkdir(parents=True, exist_ok=True)
    monkeypatch = MonkeyPatch()
    with tempfile.TemporaryDirectory(prefix="veriq-contract-example-") as tmp:
        fixture = system.__wrapped__(Path(tmp), monkeypatch)
        bank = next(fixture)
        try:
            task = setup(bank)
            (output / "controlled-task-queued.synthetic.json").write_text(
                json.dumps(task, indent=2) + "\n"
            )
            for _ in range(3):
                result = advance(bank, task, ExploringModel())
            trace = (
                bank["v"].get(f"/v1/inference/tasks/{task['id']}/steps", headers=header()).json()
            )
            runs = bank["v"].get("/v1/inference/runs", headers=header()).json()
            run = next(r for r in runs if r["id"] == result["data"]["run_id"])
            PublishedAssessment.model_validate(run["data"]["result"])
            (output / "controlled-steps.synthetic.json").write_text(
                json.dumps(trace, indent=2) + "\n"
            )
            (output / "controlled-reviewable-assessment.synthetic.json").write_text(
                json.dumps(run, indent=2) + "\n"
            )
        finally:
            try:
                next(fixture)
            except StopIteration:
                pass
            monkeypatch.undo()
    report = ROOT / "var/reports/ticket005/actual-model-evaluation-1.5b.json"
    if report.exists():
        actual = json.loads(report.read_text())
        for case in actual["cases"]:
            (output / ("actual-1.5b-" + case["id"] + ".synthetic.json")).write_text(
                json.dumps(
                    {"task": case["task"], "steps": case["steps"], "runs": case["runs"]}, indent=2
                )
                + "\n"
            )
    demo = ROOT / "var/reports/ticket005/http-demo.json"
    if demo.exists():
        actual = json.loads(demo.read_text())
        (output / "actual-http-demo.synthetic.json").write_text(
            json.dumps(
                {k: actual[k] for k in ["task", "trace", "workspace"] if k in actual}, indent=2
            )
            + "\n"
        )
    print("Exported explicitly labelled controlled and actual-model examples")


if __name__ == "__main__":
    main()
