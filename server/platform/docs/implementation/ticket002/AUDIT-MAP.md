# Ticket 002 audit map

This continues the approved v0.1.0 repository and architecture. All implementation is AI-assisted; the original v0.1.0 report and contracts are retained as historical records. Event-rule compliance/disclosure remains Daniel's responsibility; no organizer approval or human-only authorship is claimed.

| Responsibility | Code and actual authority |
|---|---|
| Knowledge extraction | `apps/veriq/backend/prompts.py` defines bounded extraction instructions. `inference.py::LocalInference.run` makes the actual local HTTP completion request and validates Knowledge output. `ai_tasks.py::execute` persists a candidate assertion linked to the document and inference run. |
| Customer interaction analysis | Cedar `channels.py` normalizes four native input schemas and emits independent source identities/provenance. Veriq `intelligence.py::process_interaction` retains the labelled deterministic category. `ai_tasks.py::execute` attaches the real model interpretation plus its durable run ID without replacing original text or bank identifiers. |
| Deterministic anomaly detection | `intelligence.py::detect_observation` evaluates received source/route/gateway measurements against explicit sample/rate/baseline thresholds. It runs independently of customer reports and records why the rule fired. |
| Evidence correlation | `investigations.py::refresh_investigations` checks bank transaction/customer identity, recorded route/gateway, report/observation time, accepted historical institutional context, and unresolved conflicts. `knowledge.py::path_context` retrieves bounded source-backed service relationships. Text similarity is not causal evidence. |
| Investigation assembly | `investigations.py` persists immutable revisions with source evidence IDs, timelines, recorded findings, contradictions, hypotheses, unknowns and recommendations. Reviews bind a specific revision; later evidence requires fresh review. |
| AI reasoning/validation | `inference.py` invokes local inference, validates task schemas, binds analytical citation decoding to the authorized evidence IDs, rejects invented identifiers/citations and labels results as candidates. `ai_tasks.py::analyze` captures the original authorized revision, calls the model outside write transactions, and stores a revision-linked run. Successful runs include actual model, timing/token metadata and prompt/schema hashes. |
| Authority and access policy | `shared/auth.py` maps application-specific credentials to server-controlled scope/roles/clearance/customer ownership. API dependencies enforce scope and permissions. `ingestion.py` enforces source credentials, schema, contextual authority, channel binding and idempotency. `knowledge.py` implements candidate/accepted/rejected history and explicit review. Classified evidence propagates through context, workspace and inference. |
| Financial truth | Only `apps/cedar/backend/service.py` mutates synthetic balances/reservations and recorded status through ordinary bank authorization. Veriq AI task code has no banking mutation interface. The live demo compares Cedar state before/after AI and reconciles only through an authorized Cedar action. |

## Execution artifacts

- `regression-tests.xml`: executed deterministic/domain/adapter/authorization/compatibility tests. Model replies inside `tests/test_inference.py` and imported helpers are explicitly test doubles.
- `tests/test_live_ai.py`: opt-in real HTTP model integration with no doubles. Run separately with `VERIQ_LIVE_AI=1`; its actual outcome is saved in the live-model JUnit report when executed.
- `evaluations/cases.json`: frozen synthetic cases with expected relationships/types, symptoms, unknowns, conflicts and embedded-instruction attacks. `scripts/evaluate_ai.py` saves every output/failure and distinguishes schema/citation checks from quality checks.
- `scripts/ticket002_demo.py`: real application HTTP transcript with mandatory live results, candidate review, original-record lineage, four native channels, evidence-scoped analysis, unchanged bank state under AI, later authorized reconciliation and preserved revision history.
- `scripts/verify_deployment.py`: inspects actual PostgreSQL version/schema/migration, database-credential rejection, internal container network, model exposure and actual inference task status. It does not infer verification merely from configuration.

These reports demonstrate behavior on synthetic examples. JSON validity, allowed citations and a small evaluation set do not prove semantic truth or production readiness. Raw evaluation outputs and the recorded failures are part of the handoff.
