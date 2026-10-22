# Engineering execution log — 2026-10-21

## Completed

- Read the supplied master directive and independently created `veriq-platform`; initialized a new Git repository with no remote. No previous business logic was copied. There are no fabricated commits or timestamps; source is in the working tree.
- Selected Python, FastAPI/Pydantic, SQLAlchemy 2/Alembic, uv, pytest and PostgreSQL deployment configuration. Installed dependencies and wrote `uv.lock`.
- Built separately runnable Cedar and Veriq applications, independent databases, migrations, health/readiness endpoints, server-side roles, classification checks and separate generated development credentials.
- Implemented source registration, authenticated envelopes, contextual source authority, immutable provenance, duplicate/mutation checks, push ingestion, actual Cedar HTTP pull and atomic durable cursor updates with error reporting.
- Implemented accepted structured knowledge, candidate AI extraction, authorized review, typed relationships, stable bank identifiers, ambiguous-name handling, same-time/source conflicts and bitemporal projection queries.
- Implemented Cedar balances, reservations, transfer idempotency, recorded processing paths, pending timeout semantics, authorized settlement/release reconciliation, four customer channels and a source feed. Restricted development controls create actual bank records, not investigation conclusions.
- Implemented independent operational detection, labelled customer classification, recurring report detection, ownership/time/route/gateway/context-based correlation, bounded service-dependency retrieval, immutable investigation revisions, human review and state audit.
- Implemented a real local-model adapter for extraction, interaction interpretation and bounded investigation reasoning. Model outputs are validated; failures persist honestly. Calls occur outside database write transactions.
- Generated versioned OpenAPI and task/event schemas; captured real synthetic HTTP responses and prepared Usaamah's contract guide.
- Wrote independent runners, private bootstrap, real HTTP demo, live inference smoke command, container/Compose configuration and explicit deployment limitations.

## Running and verified

The final Cedar and Veriq processes were started on loopback ports 8101 and 8100. Both use independently migrated SQLite developer databases. The real HTTP demonstration exercises Cedar feed -> Veriq ingestion -> all three intelligence pillars -> investigation -> later authorized reconciliation -> retained historical revision. The precise final results are saved under `contracts/examples/demo-result.synthetic.json`. `docs/implementation/verification.md` and `pytest-results.xml` record the executed tests.

## Decisions

Source snapshots are complete inventories per structured source. Document-derived claims are independently reviewable. Bank-assigned IDs, not names, reconcile identity. Contested functional relationships and conflicting bank-status versions block unwarranted correlation. Investigation classification inherits contributing evidence. Detector and classification rules are labelled deterministic. Model candidates have no financial write authority. PostgreSQL scope locks protect projection/sequence ordering; SQLite is an explicitly serialized developer fallback. Details: ADR-001.

## Remaining and blocked

- **Environment:** local Ollama server not running; no live model success is claimed. The smoke command records configuration/runtime failure. Real model task evaluation awaits an available bank-approved local runtime/model.
- **Environment:** Docker/PostgreSQL executables unavailable here; Compose deployment and PostgreSQL-specific locking are not claimed executed. SQLite concurrency, migrations and HTTP behavior were tested.
- **Production integration:** institutional SSO and credential rotation/revocation, finer-grained policy labels, TLS and deployment hardening, retention/privacy workflows, scalable ingestion scheduling/backpressure/replay and domain-specific relational optimization.
- **Product expansion:** reviewed cross-namespace identity merge/binding, service-specific measurement detectors, separate impact/resolution records, complete installation/overview experiences and Usaamah's frontend integration.
- **Model correctness:** validated citations are necessary but insufficient for semantic truth. Live task evaluation and authorized review remain required for generated reasoning.

AI-assisted implementation is disclosed here to support accurate hackathon-rule reporting. No claim is made about organizer approval or production security certification.


## Ticket 002 — v0.2.0 continuation

Continued this repository without rebuilding/replacing the application architecture. Added distinct native channel adapters and v1.1 provenance, AI-run/assertion/interaction lineage, bounded local inference prompts/schema policy and actual evaluation. Provisioned and hash-verified llama.cpp b11799 plus Qwen2.5-0.5B Q4_K_M, ran all three real tasks, and executed the PostgreSQL 16.15 + private-model Compose deployment using Podman. Final regression and real-model test results are 63 and 3 passes respectively. The actual semantic quality gate failed at 3/10, with all failures preserved. The final real HTTP workflow and permission/schema/deployment probes passed; AI misclassification stayed visible and did not rewrite the deterministic category or Cedar financial state. See `ticket002/REPORT.md`, `QUALITY.md`, raw transcripts and JUnit reports for current status. The earlier runtime-blocker notes above describe the historical v0.1.0 execution, not the current verified deployment.

## Ticket 003 — v0.3.0

Extended the existing repository with conservative evidence-support verification, deterministic task projections and a persisted leased queue. Actual 0.5B and 1.5B Q4_K_M models executed the unchanged ten cases and twelve separately frozen held-out cases. Initial conservative 1.5B load attempts stopped; the user then explicitly requested removing memory/swap cutoffs. The successful 1.5B retry peaked at 1.87 GiB RSS, used one request and completed without triggering the emergency stall watchdog. Both models remain unqualified. Final useful support plus frozen rubric correctness is 4/10 for each; schema validity is separate.

95 non-live tests passed; the actual live-model suite had 2 passed/1 failed (extraction) and is preserved. Real PostgreSQL 16.15 verified queue contention/recovery with explicitly labelled inference doubles. Real Ollama 0.31.1 HTTP requests verified runtime portability, worker restarts and continued core operation during inference failure. All temporary services were stopped. Full details and limitations are in `ticket003/REPORT.md`; earlier execution entries remain historical.

## Ticket 004 — v0.4.0

Extended v0.3.0 with transactional automatic processing intents, stable dispatch identities, explicit service authority, current-revision/grant checks and durable cross-process runtime reporting. Added source namespaces, evidence-backed mapping and migration 0002 preserving legacy UUID/history with ambiguous cases marked for administrator reconciliation. Existing structured acceptance/deterministic monitoring remain independent of inference; material revision fingerprints prevent recursive/model storms.

Final 123 non-live tests passed (95 baseline plus 28 new), one actual complete Cedar→approved polling→two PostgreSQL databases→worker→private Qwen0.5B HTTP pipeline passed, and the existing three live smoke checks passed on the same private model. Four pipeline outputs remained quarantined and two obsolete tasks failed safely as stale revisions. An initial harness reconciliation failure remains preserved. The full pipeline preceded compatible final status/namespace refinements; the rebuilt final core passed source-hash deployment audit and final regression. See `ticket004/REPORT.md`, raw transcripts, JUnit, deployment and resource reports.

Both prior model qualification failures remain unresolved: 4/10 original and 6/12 held-out each, plus the historical 2-pass/1-fail live suite. No quality gate was replaced. Final six-component workflow sampling retained at least 3.12 GiB available host RAM; a separate current model-process snapshot measured 639.02 MiB RSS with no model swap, with explicit accounting caveats. Temporary demonstration services were stopped with database volumes preserved. No production/front-end integration claim is made.

## Ticket 005 — v0.5.0 candidate

Extended the existing outbox/leased worker with resumable model-directed read-only investigation steps, separate choice/assessment generations, open hypotheses and evidence-governed publication. Source facts select exact fields; server code reads values. Added five bounded persisted-evidence tools and current grant/revision/lease validation. Stabilized transaction-specific execution routing independently of reconciliation status/time, per-source version counters and historical configuration. Cedar's five source files and OpenAPI remain byte-identical to v0.4.0; no banking feature was added.

153 non-live regressions passed, including all 123 prior cases plus 30 new cases. The requested 1.5B Q4_K_M ran 18 actual HTTP generations, 17 schema-valid, and eight tool requests over the unchanged seven-case Ticket 005 dataset. New transaction evidence was retrieved in A/C/D, but all four reasoning prerequisites failed and no reviewable assessment was published. Actual independent Cedar/Veriq/worker HTTP integration passed six functional checks; the model ended inconclusive. No new v0.5 PostgreSQL full-stack pass is claimed. Fresh API status against preserved demo data retained real generation receipts after shutdown.

The model remains unqualified; original/held-out gates and the earlier live extraction failure are preserved. Final session measurement reached 1.87 GiB RSS and 923 MiB model swap, with at least 1.27 GiB host available RAM and no emergency-threshold stop. Model/demo processes were stopped; private databases remain. Earlier failed, prototype and interrupted trials are preserved. Full Ticket 005 acceptance remains unmet; see `ticket005/REPORT.md`, raw model/HTTP records, gate XML, regression JUnit, resource and compatibility evidence.
