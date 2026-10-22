# Architecture reconciliation — v0.4.0

This release extends the existing FastAPI/SQLAlchemy applications and shared PostgreSQL record model. Cedar remains an independent financial simulator. No broker, vector store, new frontend, cloud AI dependency or additional application service was introduced.

| Ticket requirement | Implementation | Verification |
|---|---|---|
| §2 automatic institutional/customer lifecycle | `ingestion.ingest` -> deterministic processing -> `lifecycle.stage_evidence`; structured knowledge bypasses model extraction | T004-01/02/04; actual polling/HTTP transcript |
| §2 proactive operations and material investigations | Existing detector; `refresh_investigations` links actual processing records without complaints, fingerprints material state, stages a pinned analysis intent | T004-03/05/14/16 |
| §3 durable scheduling | Transactional `processing_intent` rows share the source/revision transaction; dispatcher creates existing `ai_task` records | Outbox rollback, queue deferral and duplicate-delivery tests |
| §3 stable identities | SHA-256 of structured scope/task/target/revision/policy/task-schema/model-profile/grant inputs; existing `(scope,kind,key)` unique constraint and scope lock | Duplicate/competing worker and profile-change tests |
| §3 recovery/publication | Existing leases, finite attempts/backoff; current lease, source grants, actor, evidence digest and latest investigation revision checked before execution and publication | Original baseline; T004-06/08/11; actual worker restart/outage |
| §4 source-aware identity | `identity.py`, namespaced bindings, source-native IDs, typed relationships, explicit namespace grants and reviewed mappings | T004-09/10; delimiter, reference-kind and clearance regressions |
| §4 legacy compatibility | Alembic `0002`, preserved stored UUIDs, source binding aliases, reconciliation flags; historical revision JSON unchanged | Actual seeded legacy Alembic upgrade and migration tests |
| §5 consistent status | `runtime_status.py`: endpoint probe separately from durable runs/tasks/heartbeats/qualification; legacy `verified_tasks` now also durable | T004-13; actual API restart and final deployment audit |
| §6 authority | Scheduling/dispatch/execute/publish validation, source authorization/grant versions, least-authority `ai_service` role | Revocation during inference, classification, role and credential-boundary checks |
| §7 full lifecycle | Approved Cedar feed polling in existing worker maintenance thread, independently of inference calls | Full-stack T004-16, actual two PostgreSQL databases, four native channels, reconciliation |
| §8 frontend | v0.4.0 APIs, examples, screen/role map, compatibility and unsupported actions | Contract regression and actual response exports |
| §9 modest hardware | One 0.5B CPU runtime, one inference slot, bounded selection and tokens; host pressure monitor | Actual six-component resource samples and model RSS/PSS snapshot |
| §10 portability | Migration tests invoke `sys.executable -m alembic` | Fresh migration roundtrip and seeded 0001->0002 upgrade |

## Scheduling and failure contract

A successful source transaction persists required work before it can commit. Dispatch/model availability is not part of that transaction. A full queue leaves a durable deferred intent; a crashed dispatcher leaves pending work. Unique keys and scope locks prevent duplicate automatic active work. Explicit manual reprocessing reuses active work; completed work may be reprocessed with a new task linked by `reprocessing_of`.

The dispatcher coalesces obsolete investigation intents by rejecting revisions that are no longer current. Material state includes new reports, transaction versions/status/receipt flags, relevant accepted structural/identity changes, classification, detector rule and severity bucket. Routine same-bucket measurement updates remain in the incident/evidence ledger without producing an investigation revision/model request for every sample. Raw evidence is never erased to reduce model work.

Model packages select current status groups, preserve all same-version contradictions, prioritize reports, include a representative measurement, and bound ordinary evidence to six records. Contradictions may use the existing twelve-record ceiling; excess mandatory contradictions block processing explicitly. Complete revision references remain durable and authorized, including evidence omitted from the model input. Package selection metadata is inspectable in run records. This is deterministic retrieval, not a model inference of source authority.

AI interpretation/analysis publication does not invoke revision refresh. It cannot recursively schedule itself. Accepted human knowledge review, source data, and authorized identity mappings can materially change deterministic context and legitimately schedule new analysis.

## Execution and authorization

Automatic work uses a backend service principal with knowledge/customer/investigation permissions only. It cannot approve knowledge, administer identity/source grants, or perform banking. All evidence grants, classification, actor permissions, digest references and current investigation revision are rechecked. Source revocation or grant-version change blocks queued/in-flight publication. Manual jobs also revalidate the currently configured actor and source grant. Legacy queued jobs lacking authority snapshots require authorized reprocessing.

A stale worker cannot publish after lease replacement/expiry. Domain publication and task completion share a database transaction. External model execution can repeat after a crash; exactly-once external inference is not claimed. Stale-revision failures are retained as failed tasks and do not become current findings. A completed task can have a quarantined outcome; a supported candidate is still not reviewed/accepted knowledge.

## Processes and readiness

The existing worker has a maintenance thread for heartbeat and optional approved connector polling. Model I/O runs outside database locks. Feed polling can continue while inference is slow/unavailable. `AUTO_CONNECTOR_POLL_ENABLED=true` is enabled in the Compose worker; individual `--once` workers do not run a continuous poll loop. Worker startup depends on database/API schema readiness, never model readiness. SIGTERM stops new work; leases recover forced interruption.

The status API separates endpoint reachability, configured model, latest persisted successful/failed run, failed processing, backlog/running/quarantine counts, recent worker heartbeat and qualification. A recent heartbeat expires after 60 seconds; it is a liveness observation, not an enterprise service registry. `Inference available — model unqualified.` is an intentional supported state.

## Deliberate limits

This remains the approved modular application, not a complete enterprise IAM, secret-management or identity-mastering product. Static actor credentials require deployment reload/restart to reflect changes; source authorization is checked dynamically in the database. Identifier authority/equivalence is explicitly attested by an authorized administrator with evidence, not proven by fuzzy names or a model. Legacy ambiguous identities need review as described in `IDENTITY-MIGRATION.md`. Long histories still need more SQL aggregation/pagination and production-scale migration/load testing.
