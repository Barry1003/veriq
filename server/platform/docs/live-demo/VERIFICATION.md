# Live-demo verification and limits

The genuine PostgreSQL core workflow, source/financial/history controls and recovery checks worked. **The complete timing gate did not pass:** the customer adaptive task exceeded its 480-second wait and eventually completed **quarantined**. No model reasoning success, frontend integration or production readiness is claimed.

## Executed checks

- Final regression: **169 passed, 4 opt-in cases deselected, one existing Starlette TestClient/httpx deprecation warning**, 83.87 seconds. Original 153 tests retained; 16 targeted cases added. [JUnit](regression-tests.xml).
- Ruff lint and format: passed, 74 Python files. Offline pinned dependency check: 33 packages checked with `uv sync --frozen --offline --cache-dir /tmp/veriq-publication-uv-cache`.
- Actual separate Cedar API, Veriq API and worker processes plus two isolated PostgreSQL 16 containers and actual Qwen2.5-1.5B Q4_K_M CPU inference. Both databases at Alembic 0002, no metadata differences; cross-database credentials rejected.
- Source grants, ingestion, accepted structured knowledge, actual Cedar anomaly/transfers/report, proactive detection, R1/G1 correlation, automatic model calls, reconciliation, historical revisions and failed-model containment observed. [Actual workflow](postgres-workflow.json).
- Source revocation redacted the actual adaptive trace. Model outage left banking, ingestion and evidence reads working. API/worker restart preserved setup/history; model restart restored the real alias. All nine final [recovery checks](recovery-verification.json) passed.
- A second fresh SQLite setup with no model had no inherited transactions/investigations, accepted real configuration/document evidence and remained visibly limited. Repeated preparation did not duplicate data; named reset preserved its archive and left the other run/global credentials unchanged. All nine [fresh-setup checks](fresh-setup-verification.json) passed.
- API export matches the current backend and preserves all baseline operation contracts. Cedar code/specification, frontend/root shared definitions, adaptive engine/tools/prompts and frozen evaluation datasets are unchanged. [45-action map](../../contracts/live-demo-actions.json) labels 29 operations observed through actual rehearsal HTTP; others are implemented but not independently exercised by this HTTP run.

The regression uses explicit controlled model doubles. Only the separately recorded native HTTP rehearsal is evidence of real inference. The previous Ticket 005 frozen 0/4 result remains historical qualification evidence; it was not regraded into a success or rerun with altered inputs.

## Actual durations and resources

| Measurement | Observed |
|---|---:|
| Prepare twice on the PG run | 2.291 s |
| Anomaly phase twice (replay-safe) | 5.116 s |
| Customer task queued → final quarantined result | **564.643 s** |
| Queue before first customer-task generation | 290.893 s |
| First customer generation → final result (four generations) | 273.750 s |
| Configured verification wait | **480 s — failed** |
| Cedar account read with model stopped | 0.0502 s |
| Veriq workspace read with model stopped | 0.1144 s |
| Genuine Cedar transfer + authorized delivery with model stopped | 0.2557 s |
| API/worker restart without model, including heartbeat readiness | 9.431 s |
| Cached model restart + service readiness check | 14.663 s |
| Repeated SQLite preparation without a model | 0.596 s |

The verified host was Fedora Linux; the supervisor uses Linux `/proc`. Other operating systems were not independently verified. These are actual observations on this execution host, not guaranteed laptop/production timings or isolated performance benchmarks. Background application/test activity and earlier queued work affected the run. Host RAM was approximately 7.44 GiB. One model/one inference slot, four threads, context 4096, 768 output tokens, timeout 180 seconds; no GPU layers. Weight SHA-256 `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e` matches the pinned manifest.

Across 546 two-second samples spanning the workflow and controlled restarts (including idle periods), model RSS peaked at **1840.961 MiB**, model swap at **681.148 MiB**; minimum host available RAM was **686.887 MiB**, full-memory PSI avg10 peaked at **19.36**. No emergency stop occurred. Pressure was substantial and approached the guard threshold of 20; this is not a no-swap or low-latency claim. The guard stops only its owned model below 384 MiB available RAM or PSI >20, retaining the OS safeguards. The separate 9B experiment has not been measured here.

## Failures preserved and repairs verified

- [Initial scenario replay failure](initial-rehearsal-failure.json): a retry let Cedar default a new native timestamp, correctly causing HTTP 409. The operator now persists exact `sent_at`; actual replay leaves eleven transfers/one report.
- [Actual AI deadline failure](initial-ai-deadline-failure.json): no terminal customer result within the configured eight minutes. A checkpoint resume observed the genuine late quarantined result and completed reconciliation/history checks. `complete_workflow_gate=false` remains in [the summary](verification-summary.json); it was not converted to a full pass.
- Initial restart preflight incorrectly treated TIME_WAIT as an occupied live listener; the socket check now uses address reuse while still rejecting a real listener, with a meaningful real-socket regression test.
- [Initial recovery readiness failure](initial-recovery-failure.json): startup returned before the worker's first heartbeat. `up` now waits for a post-start durable heartbeat with consistent API/worker settings. The subsequent real recovery run passed all checks.

The final verifier can continue an interrupted checkpoint with `--resume`, retains deadline failures, and exits 2 when its full gate is partial. The last real workload ran before this exit-code refinement; the recorded JSON remains explicitly partial. No evaluation outcome or raw generation was edited to match the final code.

## Evidence and reproducibility

Use the [runbook](RUNBOOK.md). A normal full attempt is `python -m scripts.verify_rehearsal --run stage --wait-seconds 480` from the provisioned backend venv. Keep that named run dedicated to the verifier; unrelated/manual banking changes invalidate its before/after comparison. Do not reset it to hide a failed generation or deadline.

[HTTP transcript](http-transcript.json) retains 195 actual response transitions/mutations from 691 requests, grouping unchanged GET responses with counts/latency bounds. Every mutation is retained; request bodies containing provisioning secrets are omitted. Full private JSONL and databases remain in the ignored named run. Structured workflow/step results are unchanged source responses. No predetermined AI hypotheses, findings or financial outcomes were inserted into Veriq.

[Cleanup verification](cleanup-verification.json) confirms owned processes stopped, APIs/model ports closed and owned PostgreSQL containers exited, with data preserved. [Verification summary](verification-summary.json) separates core checks, failed timing, model outcome, resource measurements and qualification. No browser build, frontend adapter integration or 9B validation was performed. No cloud AI dependency was introduced.
