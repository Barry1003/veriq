# Ticket 004 — test commands and evidence

## Final non-live regression

```bash
.venv/bin/pytest -q -m 'not live_ai and not full_stack' --junitxml=docs/implementation/ticket004/regression-tests.xml -o faulthandler_timeout=20 --tb=short
```

**123 passed, 4 deselected, 43.32 seconds.** All original 95 cases remain, plus 28 targeted non-live tests. One existing Starlette TestClient/httpx deprecation warning remains. Non-live tests use explicit model doubles; they test scheduling, authorization, deterministic processing and evidence guards, not the factual performance of a language model.

The shared legacy fixture now explicitly grants its intended common identifier authority and opts out of automatic AI to retain the original manual-path tests. Assertions/datasets/live tests were not weakened. Migration verification uses `sys.executable -m alembic`.

| Acceptance | Test/evidence |
|---|---|
| T004-01…15 | Named corresponding functions in `tests/test_ticket004.py`; final JUnit contains all |
| T004-06 lease/restart | Expired lease recovery unit case, original queue concurrency/recovery cases, actual full-stack worker restart |
| T004-07 outage | Core processing unit case and actual model stop/retry/recovery |
| T004-09/10 identity | Independent namespaced collision, accepted mapping evidence/history, type checks |
| T004-11 revoke | Source revoked during actual simulated in-flight model call; no publication |
| T004-13 process status | Fresh API process against same durable records; actual API restart in pipeline/audit |
| T004-15 compatibility | All previous OpenAPI routes/required request fields retained; versioned artifacts preserved |
| T004-16 full pipeline | Opt-in `tests/test_full_stack.py`, actual HTTP with both PostgreSQL databases and real model |

Additional targeted cases cover rollback when outbox staging fails; deferred scheduling at queue capacity; unrelated namespace correlation; private task-snapshot masking; authorized customer-analyst task visibility; exactly one restage on model-profile change; preserving stored legacy UUID/revision via actual seeded Alembic upgrade; unambiguous namespace delimiters; opaque canonical/native selectors; financial-reference type isolation; maximum source-ID namespace length; and restricted namespace grant clearance. The final regression includes them all; `targeted-tests.xml` is an earlier 23-test checkpoint, not the final 28-test total.

## Real complete deployment test

```bash
VERIQ_FULL_STACK=1 VERIQ_STACK_PROJECT=veriq-ticket004-final .venv/bin/pytest -q -s -m full_stack --junitxml=docs/implementation/ticket004/full-stack-tests.xml --tb=short
VERIQ_STACK_PROJECT=veriq-ticket004-final .venv/bin/python -m scripts.verify_stack
```

**1 passed, 124 deselected, 344.49 seconds at that checkpoint.** It recorded 573 actual HTTP requests and twelve successful assertions. It used separate PostgreSQL 16.15 databases, actual Cedar records/feed polling, automatic tasks and the private real llama.cpp runtime. No manual AI requests or fabricated investigation inserts. This script requires a fresh isolated stack; follow `RUNBOOK.md` to reproduce rather than rerunning against existing evidence.

Final core refinements after this complete pipeline were rebuilt and source-hash audited in the same deployment; final 123 regression cases passed. The whole full-stack scenario was not repeated after those compatible refinements. Both pipeline-time and final deployment audits remain available.

An initial harness run failed by sending the wrong reconciliation field; corrected to Cedar's existing `outcome` plus rationale. Its failed JUnit/transcript/resources are preserved separately. It was a harness error, not a model qualification run. No failed live-model test was deleted to obtain the passing result.

## Real live-model smoke suite

The unchanged three live cases ran in an ephemeral test container attached to `veriq-ticket004-final_bank`, using the same private model endpoint and application image. Exact dependency staging and full command are in `RUNBOOK.md`.

**3 passed, 20.25 seconds** in `live-model-tests.xml`. They use actual HTTP generation and SQLite test fixtures; this is not a PostgreSQL/full-bank scenario. The full-stack test supplies that distinct coverage. An initial test-runner dependency import failed before tests started; adding the missing pure Python `py` shim allowed the actual suite to run.

The historical v0.3.0 suite remains **2 passed/1 failed extraction**, and both earlier model gates remain **4/10 original, 6/12 held-out**. No Ticket 004 qualification rerun was performed; current smoke passes do not qualify the model. Pipeline quarantines remain reported separately from test pass counts and schema validity.

## Static and delivery checks

```bash
.venv/bin/ruff check apps shared migrations scripts tests
.venv/bin/ruff format --check apps shared migrations scripts tests
.venv/bin/python -m scripts.export_contracts
.venv/bin/python -m scripts.package
```

Ruff lint passes and all 64 Python files are formatted. Contract exports include versioned APIs and new policy/identity schemas. Packaging excludes private runtime/model/database data, scans every source file for generated application/feed/source secrets, writes SHA-256/byte counts, and the final archives are integrity-tested. Historical archives/reports are retained. No production-scale or real bank data testing is claimed.
