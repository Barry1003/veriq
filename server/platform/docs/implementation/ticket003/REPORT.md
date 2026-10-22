# Ticket 003 handoff — Veriq v0.3.0

**Qwen2.5-1.5B-Instruct Q4_K_M actually completed CPU inference and both evaluations. It remains unqualified.** The existing v0.2.0 repository was extended in place with evidence-support verification and durable asynchronous inference. No rebuild, mandatory cloud AI, 3B model or financial authority change was introduced.

## Actual hardware and inference measurements

The measured execution host is Linux, Intel i5-1135G7, four cores/eight logical CPUs, 7.44 GiB physical RAM and approximately 7.44 GiB zram swap. CPU inference used four threads and no GPU offload. These measurements do not establish the resources of another personal laptop. Baseline available RAM varied between approximately 3.05 and 3.26 GiB across the successful trials because other desktop applications were running.

| Measured configuration | 0.5B Q4_K_M | 1.5B Q4_K_M |
|---|---:|---:|
| Context / generated-token cap | 4,096 / 512 | 2,048 / 384 |
| Concurrent inference requests | 1 | 1 |
| Model load to health | 1.50 s | 2.31 s |
| Short actual interpretation probe | 4.26 s | 7.34 s |
| Evaluation request latency, median | 4.52 s | 9.72 s |
| Evaluation request latency, range | 1.76–14.03 s | 4.14–28.30 s |
| Peak runtime RSS | 604 MiB | 1,919 MiB (1.87 GiB) |
| Peak runtime PSS | 599 MiB | 1,913 MiB |
| Peak benchmark-driver RSS | 84.7 MiB | 84.9 MiB |
| Minimum host available RAM | 2.97 GiB | 2.47 GiB |
| Runtime process swap observed | 0 | 0 |
| Host-wide swap-out during trial | 54.9 MiB | 128.0 MiB |
| Peak full-memory-stall PSI avg10 | 3.03 | 0.55 |

Model-loading RSS includes weights and runtime allocations; RSS is not exclusive allocation when file-backed mappings/libraries are shared. PSS apportions shared memory. Host-wide swap is not attributable exclusively to the model. The independent HTTP demo sampled Cedar/Veriq API RSS around 78/81 MiB; these are snapshots, not process peaks. Container accounting sampled Ollama around 606 MB and PostgreSQL around 44 MB in a separate verification phase; these are not interchangeable with per-process RSS/PSS.

Two initial 1.5B trials hit the deliberately conservative 64 MiB global swap-I/O guard during loading. No generation, latency or quality success is claimed for those attempts. Following the user's explicit instruction to remove swap/memory cutoffs, the successful retry used `--relaxed-resource-guards`, a 2,048-token context, 384-token output cap, 64/32 batch/microbatch, one request and no startup warmup. Its emergency system-stall watchdog did not trigger; no halt was observed during the run. This is not a guarantee against a future laptop freeze. System swap itself was not disabled. Every attempt and sample is retained.

`resource-1.5b-relaxed.json` is the successful larger-model measurement. `resource-1.5b.json` and `resource-1.5b-retry.json` are stopped attempts. The published SHA-256 matched before every model execution. Runtime: actual llama.cpp b11799 / commit `0756e83fc`. Both verified weight files and runtime binaries remain in ignored `var/`; they are excluded from source ZIPs.

## Reliability changes

- Deterministic retrieval, canonical identity, original transaction references, source grants, effective time/version checks, status conflicts and financial rules remain outside the model. AI receives bounded task projections rather than a full open-ended investigation workspace.
- Institutional extraction must bind exact IDs/types, display names/aliases and positive typed relations to source spans and a supported timestamp. Co-occurrence, negation, unsupported direction and invented attributes quarantine the run. Directive-bearing institutional prose abstains for manual review. Unsupported/complex English is intentionally outside this conservative grammar.
- Customer interpretation preserves original text, customer identity/reference and deterministic classification. An unsupported category, missing/extraneous reference or invented unknown detail is quarantined; no silent deterministic repair is reported as model output.
- Analysis selects exact supported statement/check pairs from a deterministic, source-authorized catalog. Citation relevance is checked as a text/ID/status pair, not merely membership in an ID set. Future/superseded status records are filtered; same-version contradictions remain unresolved. Freeform financial conclusions and autonomous root-cause diagnosis are outside this model role.
- Support receipts are candidates, not independent proof that a source is true. Institutional candidates still require authorized review, which rechecks support. A quarantined run creates no accept-able assertion. A legacy unsupported unaccepted assertion cannot bypass the new check by calling review. Existing accepted knowledge remains operational.

## Durable asynchronous behaviour

The existing database stores queued, running, completed, unavailable, failed and retryable AI tasks with immutable input/revision snapshots, owner/classification, attempt history, finite backoff and leases. Default concurrency is one, cap two. SQL-side filtering/counting and bounded queue/input limits avoid loading all historic task payloads into memory. One remote runtime is sufficient; workers contain no model weights.

API and worker roles use the same durable capacity. Legacy synchronous endpoints keep their result shape; if busy they return a task ID in 409. New submission endpoints return 202, with polling and owned-task retry routes. `completed` is processing completion; `outcome=quarantined` is not a useful/verified answer. Core readiness does not depend on inference. Veriq/worker Compose startup no longer requires model health.

Unit checks cover finite attempts/backoff, unconfigured availability, authorization/revocation checks, cross-role task access, SQL queue limits, concurrent claims, crash/lease recovery, stale-worker output rejection and continued ingestion/monitoring/accepted knowledge. Real PostgreSQL 16.15 also verified two competing workers produced one claim, expired leases recovered and tasks survived database reopening. PostgreSQL checks explicitly used an inference double; they are not live-model claims. External inference is at-least-once after a crash; stale leases cannot publish, and publication/task completion are atomic.

## Honest model qualification

The unchanged ten-case dataset was checked against the v0.2.0 ZIP byte-for-byte. Twelve additional held-out cases were frozen before execution. Expected labels never enter task preparation, model inputs or verification.

| Configuration | Frozen schema-valid | Raw rubric pass | Final support + rubric pass | Held-out raw pass | Held-out support + rubric pass |
|---|---:|---:|---:|---:|---:|
| 0.5B | 9/10 | 7/10 | 4/10 | 8/12 | 6/12 |
| 1.5B | 9/10 | 6/10 | 4/10 | 8/12 | 6/12 |

Each dataset includes one deterministic pre-model abstention; no success is credited for it. The stricter final verifier was also applied offline to captured outputs, with a source hash, without pretending to run a new model request. Original reports remain available. Raw scoring is the unchanged narrow rubric, not comprehensive semantic correctness. Both models still omit references, misclassify reports or fail essential extraction cases. One 1.5B supported candidate is incomplete under the rubric. The configurations differ in context/output budgets, so this is not a controlled ranking of model sizes.

The full real HTTP/Ollama workflow showed extraction returning a reversed route/gateway edge; the verifier quarantined it while interpretation and catalog analysis produced supported candidates. The three existing live-model tests had **2 passes and 1 extraction failure**. No test was weakened to make that failure green. No model is qualified for production autonomous extraction, diagnosis or financial conclusions. See `QUALITY.md` for every case, deterministic contributions and limits.

## Model-independent demonstration

The same `LocalInference` interface performed actual requests against llama.cpp b11799 and Ollama 0.31.1. Only endpoint/model configuration changed; institutional knowledge and investigation logic were unchanged. The Ollama run used the already verified 0.5B GGUF, one loaded model and one request, isolated in a temporary Podman container with no cloud features. `runtime-portability.json` contains actual version, model and task receipts.

`async-http-demo.json` records real HTTP submissions, polling, worker-process restarts and model runs against fresh persisted SQLite databases. After deliberately pointing a worker at an unavailable local endpoint, ingestion, accepted structured knowledge, deterministic monitoring and readiness continued. Cedar's actual before/after synthetic account/transaction state was unchanged. This is separate from the actual PostgreSQL queue verification; it is not claimed as a full v0.3.0 bank Compose deployment.

Production banks may point the same interface at more capable approved internal CPU/GPU infrastructure and qualify that configuration. A constrained development host can keep 0.5B or run without AI. There is no required cloud inference service or requirement to load multiple models. All temporary test API/model/PostgreSQL processes were stopped after measurement to return memory to the host.

## Regression results and handoff

- **95 non-live tests passed**, 3 live tests deselected, in 23.30 seconds. No tests were removed. Earlier candidate-positive AI fixtures now contain explicitly supported source text/names, and a supported catalog statement, because v0.3.0 intentionally rejects the old unsupported fixtures. All original invariants remain covered.
- **Live suite: 2 passed, 1 failed**, 95 deselected, in 23.36 seconds. The extraction failure is retained in `live-model-tests.xml`; the model remains unqualified.
- Ruff lint and formatting passed. PostgreSQL 16.15 migration `0001` matches metadata with zero differences. Current contracts export only implemented routes; prior API/event snapshots are preserved.

| Required deliverable | Artifact |
|---|---|
| Actual memory/load/inference data | `resource-*.json`, raw runtime logs, `runtime-portability.json`, HTTP API memory snapshots |
| Model qualification, unchanged and held-out cases | `QUALITY.md`, `evaluations/cases.json`, `evaluations/heldout-ticket003.json`, hashes and raw outputs |
| Evidence checks and authority | `tests/test_evidence_support.py`, final support receipts, `AUDIT-MAP.md` |
| Orchestration behaviour | `tests/test_orchestration.py`, `postgres-queue.json`, actual `async-http-demo.json` |
| Regressions | Both JUnit XML files and source tests |
| Low-resource reproduction/runtime switching | `RUNBOOK.md`, manifests, `qualify_low_resource`, optional async Compose overlay |
| Updated source / frontend package | `veriq-platform-source-v0.3.0.zip`, `veriq-frontend-contracts-v0.3.0.zip`, delivery manifest |

The source archive excludes private environment files, credentials, databases, model weights and binaries. The contract archive includes v0.3.0 OpenAPI, preserved previous snapshots, actual current synthetic examples and explicit queue/quality UI guidance. Browser source-secret onboarding and real external SMTP/phone/branch connectivity remain unfinished from Ticket 002. Full v0.3.0 Compose deployment was not revalidated; Docker Engine was not used.

The next useful work is broader independently reviewed support/identity/language coverage and bounded document/workspace splitting, plus qualification on bank-approved data. A more capable model may be tested on more capable bank hardware, but its size alone is not a reliability result and is not required to use the developer system.
