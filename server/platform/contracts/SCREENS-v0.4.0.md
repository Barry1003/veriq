# Usaamah integration map — v0.4.0

Cedar and Veriq remain separate applications with separate application credentials. Current schema files are `api/cedar-v0.4.0.openapi.json` and `api/veriq-v0.4.0.openapi.json`. Row `data` remains a flexible domain envelope; actual nested shapes are in `examples-v0.4.0/`. No Figma screen is claimed integrated by this backend work.

| Screen / action | Endpoint | Required Veriq permission / behaviour |
|---|---|---|
| Source/connector activity and policy | GET `/v1/sources`, `/v1/connectors` | sources; namespace, grant state, ingestion count/cursor, last pull/error and automatic intent counts; no secrets |
| Automatic processing ledger | GET `/v1/processing/intents` | investigation; pending/deferred/scheduled/blocked, source/revision references, linked task ID/reason |
| Document/interaction processing | GET `/v1/processing/evidence/{id}` | knowledge for document, customer for interaction; original source identity, eligible intents/tasks/runs |
| Task list/poll | GET `/v1/inference/tasks`, `/v1/inference/tasks/{id}` | own permitted manual work or permitted automatic task kind; investigators can read cleared tasks |
| Retry | POST `/v1/inference/tasks/{id}/retry` | authorized own manual task or permitted automatic work; finite attempts, policy/grant/revision revalidation |
| Accepted/candidate knowledge | GET `/v1/knowledge/context`, `/v1/knowledge/assertions`, `/v1/knowledge/reviews` | knowledge; accepted context separately from candidates and review history |
| Quarantined extraction | GET `/v1/processing/evidence/{id}`; GET `/v1/inference/runs` | source/evidence role or investigation; quarantine can have no assertion |
| Customer experience | GET `/v1/interactions`, `/v1/issues` | customer; preserve native channel/reference; join evidence-processing/task state for automatic interpretation |
| Operations | GET `/v1/observations`, `/v1/incidents` | operations; independent deterministic detector, even with no AI/complaint |
| Correlation/history/current analysis | GET `/v1/investigations`, `/v1/investigations/{id}/workspace` | investigation; exact evidence, correlations, revisions and pinned run revision IDs |
| Runtime/qualification | GET `/v1/inference/status` | investigation; reachability separately from durable runs/backlog/running/quarantine/worker state and qualification |
| Institutional identity | GET `/v1/identity/bindings`, `/v1/identity/mappings`; GET `/v1/knowledge/resolve?name=...&namespace=...` | knowledge; opaque canonical IDs, namespaces, native IDs, aliases/evidence; ambiguous results stay ambiguous |
| Identity administration | POST `/v1/identity/namespaces`, POST `/v1/identity/mappings`, GET `/v1/identity/reconciliation` | identity administration plus clearance; explicit authority/evidence/rationale, candidate/accepted mapping distinction |
| Source access/policy administration | POST `/v1/sources/{id}/authorization`, `/v1/sources/{id}/processing-policy` | sources plus clearance; versioned revocation/activation or automatic-policy enable/disable |
| Existing manual reprocessing | POST `/v1/inference/tasks/evidence/{id}`, `/v1/inference/tasks/investigations/{id}`; legacy synchronous AI paths | required evidence/task role; normal ingestion does not need these calls |

## State distinctions to render

- Source transport state/cursor is ingestion activity. Automatic policy enablement is separate. Structured configuration can be processed without a model extraction task.
- An intent is required work: pending/deferred means not yet dispatched; scheduled means a durable task exists, not that it completed. Blocked has an explicit reason (including superseded revisions or input budget).
- Task states: queued, running, retryable, unavailable, failed, completed. `initiation` is automatic/manual; `reprocessing_of` identifies explicit later reprocessing. Repeated active requests can return the same task.
- A completed task's `outcome` can be validated_candidate or quarantined. Neither completed nor validated_candidate means reviewed/accepted knowledge or verified root cause. Quarantine may have no domain assertion; show it through the processing/run view.
- Only accepted knowledge review/source authority puts an assertion into accepted context. Display `method`, support receipts, source evidence and review history.
- Show original interaction text, deterministic category, source/native identity and exact customer-supplied reference independently of any candidate. Failed model interpretation must not replace these fields.
- Compare each analysis run's `revision_id` with the investigation's `latest_revision_id`; preserve old runs as history. Stale jobs can be failed even when the model generated text. Use the new revision's job, not a blind retry of the obsolete one.
- Render `Inference available — model unqualified.` as a valid state. Endpoint reachability, durable verified executions, candidate support and production qualification are different facts.

Poll the authorized task/detail endpoint every few seconds; no SSE/WebSocket endpoint exists. The API can be restarted without losing worker-produced task/run status. Worker heartbeat is a recent observation with a 60-second expiry, not a guarantee of process health.

## Authentication and supported boundaries

Use GET `/v1/access/me` in the selected application to discover the actual subject/roles/clearance. Veriq roles typically include investigator (read knowledge/operations/customer/investigation), customer_analyst (customer processing), operations, reviewer (review/knowledge/investigation), institution_admin (sources/knowledge/audit/identity), and admin. Classification still constrains every view. A read permission is not an approval permission.

Cedar customer credentials are bound to that customer. In-app messages can be customer submitted; email/contact-centre/branch native recorders require a bank-operated credential. Simulator and feed roles are server/test-only. Never give the browser connector/source ingestion secrets, feed credentials, simulator credentials, database URLs/passwords or model-service credentials. Source registration remains backend-only until server-side secret provisioning is implemented. Configure exact approved frontend origins in backend `CORS_ORIGINS`; do not use a universal shared credential across both apps.

The namespace/mapping administration APIs support explicit verified bindings, not automatic legacy splits, source-namespace reassignment or name-similarity merging. Empty identity-mapping/reconciliation example arrays are actual fresh-stack results, not missing fabricated fixtures.

Unsupported actions: banking/refunds/reconciliation from Veriq or AI, automatic approval of model knowledge, browser source-secret provisioning, automatic ambiguous identity repair, live SMTP/telephone connectivity, cloud AI requirement, full actor/secret rotation UI, and any claim that Usaamah's frontend/Figma is already connected. Source grants and processing policies should be edited through a trusted server/admin integration, not by exposing backend secrets.
