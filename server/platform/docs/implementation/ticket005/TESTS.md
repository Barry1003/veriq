# Ticket 005 tests and evidence map

## Final regression

```bash
.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack' --junitxml=docs/implementation/ticket005/regression-tests.xml -o faulthandler_timeout=20 --tb=short
.venv/bin/ruff check apps shared scripts tests
.venv/bin/ruff format --check apps shared scripts tests
```

**153 passed, four existing opt-in cases deselected, 62.94 seconds.** Includes all 123 prior non-live cases and 30 Ticket 005 cases. One existing Starlette/httpx TestClient deprecation warning remains. The prior 15 test files and both original evaluation datasets are byte-identical to v0.4.0. New tests use explicit model doubles, not substituted live output.

| Coverage | New tests |
|---|---|
| Route/authority/time | obsolete first record; configured G2/actual G3; per-source version counters; future effective time; reconciliation time versus execution configuration; reconciliation route cannot move a report; execution proof survives financial reconciliation |
| Adaptive retrieval and open output | evidence absent from seed; five real persisted tool paths; different discovered gateway produces a different next query; open competing hypotheses; source facts read by server |
| Durability | persisted checkpoint with fresh API/model object; expired lease recovery; replaced worker cannot publish; exactly one committed final run/step sequence |
| Lifecycle/security | revocation before/inside generation; stale revision; actor removal; cancellation and forbidden retry; content redaction after visibility loss |
| Publication/budgets | unsupported facts quarantined; future/independent-authority premises rejected; truncated text not certified as a full field; zero tool budget; missing/error tool result; unavailable inference; automatic outbox mode; no recursive successor |
| Runtime | generation success/failure durable before final assessment; receipt summaries do not expose tool content; injected-client metadata never proves real HTTP inference |

The current contradiction message distinguishes conflicts across authorities from equal-version disagreement within one source; existing same-version behaviour remains intact. Ruff verifies final formatting. `regression-initial.xml` preserves an earlier 135-pass development checkpoint; it is not the final count.

## Actual model evaluation

Exact runnable commands are in `RUNBOOK.md`. Final frozen profile:

```bash
LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=768 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.evaluate_adaptive --output docs/implementation/ticket005/actual-model-evaluation-1.5b.json
.venv/bin/python -m scripts.grade_adaptive --report docs/implementation/ticket005/actual-model-evaluation-1.5b.json --prefix docs/implementation/ticket005/adaptive-gate-1.5b
```

**18 actual HTTP generations, 17 schema-valid, eight tool requests, zero reviewable assessments; 0/4 reasoning prerequisites.** Gate XML records four failed reasoning checks, two passing lifecycle checks and one bounded containment check. The grader inspects recorded actual results; it does not execute a new model run or certify general semantics. Injection distracted model attention; closed capability enforcement is not a claim of general prompt-injection immunity.

Initial/prototype/interrupted 0.5B and 1.5B transcripts remain separate. No original quality gate or historical live failure was overwritten. The older three-case live suite was preserved, not rerun and relabelled as a Ticket 005 pass.

## Actual HTTP integration and restart

```bash
LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=1024 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.ticket005_demo
```

**Six functional checks passed**, 121 actual HTTP requests, independent Cedar/Veriq/worker processes and SQLite databases; model result inconclusive. Existing Cedar APIs generated the source evidence. No manual AI request or fabricated conclusion was inserted. Both databases reached migration 0002 with zero metadata differences. A fresh API after model/service shutdown still reported durable real inference and correctly reported the endpoint unavailable/unqualified.

This is not a fresh PostgreSQL full-stack pass. Prior v0.4 PostgreSQL evidence remains historical. Final routing/status refinements were covered by regression and a persisted-demo status check; the whole actual-model suite was not rerun after those final controls. Rejected model evidence remains rejected.

## Contracts and archive checks

```bash
.venv/bin/python -m scripts.export_contracts
.venv/bin/python -m scripts.export_adaptive_examples
.venv/bin/python -m scripts.package
```

The examples exporter uses a clearly labelled model double with actual SQLite tool reads for positive contract examples. It separately exports recorded real 1.5B outcomes. It does not fabricate successful real-model tool use. Compatibility verification retained 42 old operations without new required old parameters/request fields; Cedar source/OpenAPI remain byte-identical. Packaging excludes private runtime/model/database files and scans generated credentials; ZIP integrity, content and SHA-256 are checked separately before handoff.
