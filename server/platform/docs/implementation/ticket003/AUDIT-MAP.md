# Code and evidence map

| Responsibility | Implementation | Verification |
|---|---|---|
| Native model/runtime provisioning | `scripts/setup_local_ai.py`, pinned manifests | Published model/runtime hashes; measured load reports |
| Deterministic task projection | `evidence_support.prepare`, `extraction_support`, `analysis_catalog` | Bounded input, authority, timestamp/version, conflict and prompt-injection tests |
| Exact support checks | `evidence_support.verify` | Entity/type/name/alias bindings, positive relationship spans, exact references, category anchors, statement/citation pairs |
| No unsafe publication | `ai_tasks.model_result/publish`, `knowledge.review_assertion` | Atomic quarantine, legacy-candidate review rejection, no overwrite of original or deterministic view |
| Durable scheduling | `orchestration`, `scripts/ai_worker.py` | SQL filters/counts, scope lock, attempt budget, leases, retry/backoff, authorization, stale-worker rejection |
| API and UI boundary | `apps/veriq/backend/api.py`, current OpenAPI and screen map | Authorized 202/GET/retry routes; no private task inputs/lease tokens in browser responses |
| Model-independent invocation | `LocalInference` HTTP adapter | Real llama.cpp and Ollama receipts using the same application methods |
| Financial authority | Existing Cedar service + deterministic Veriq investigations | Real HTTP before/after Cedar comparison; source authority outside the model |
| Hardware/factual measurements | `qualify_low_resource`, frozen evaluator and final captured-output verification | All attempts retained; no inference claimed for aborted loads; raw schema/rubric/support metrics separated |

This is AI-assisted engineering. Inference doubles are explicit in unit/PostgreSQL queue tests; the live model reports and HTTP transcript use actual local runtime requests. No other agent authored hidden changes. No Git commit/push/PR is fabricated; this repository has no configured remote or initial commit.
