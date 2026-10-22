# Ticket 003 route-to-screen changes

Use the v0.3.0 OpenAPI snapshot. All v0.2.0 paths and required request fields remain. Existing synchronous inference endpoints now share durable queue capacity and return 409 with a task ID when busy; prefer the new asynchronous routes.

| Screen/action | Route | Behaviour |
|---|---|---|
| Queue document/message interpretation | POST `/v1/inference/tasks/evidence/{evidence_id}` | 202; knowledge/customer permission and evidence clearance checked before snapshot |
| Queue investigation analysis | POST `/v1/inference/tasks/investigations/{investigation_id}` | 202; investigation permission; frozen revision/evidence |
| Task list | GET `/v1/inference/tasks?offset=0&limit=100` | Bounded pages; own permitted tasks or investigator access, filtered by clearance |
| Task details/poll | GET `/v1/inference/tasks/{task_id}` | Current state, attempt count, history, outcome and run ID; no frozen private inputs, lease token or principal serialization |
| Retry own task | POST `/v1/inference/tasks/{task_id}/retry` | Only unavailable/retryable/failed tasks within finite attempt budget; no permission escalation |
| Candidate/run details | GET `/v1/inference/runs` | Authorized investigators; support receipts or quarantine reason and untrusted output |
| Workspace | GET `/v1/investigations/{id}/workspace` | Pinned revisions, evidence, candidate runs and review history |
| Availability | GET `/v1/inference/status`; GET `/ready` | Model availability separately from core/database readiness |

States: queued, running, completed, unavailable, failed, retryable. Render `outcome` separately. A completed quarantined task has no supported candidate. Retryable has bounded backoff; unavailable is operator-retry only; failed does not imply infinite automatic retries. Polling every few seconds is sufficient for a development demo; there is no WebSocket/SSE endpoint.

Display original customer text and deterministic category beside candidate interpretation. A category mismatch or missing/extraneous transaction reference quarantines the model result. Do not replace original identifiers or financial status with model output.

Display source-span/authority receipts as support checks with their limitations, never as independent proof that a source is true. Institutional extraction still requires an authorized review; acceptance rechecks support. Quarantined runs cannot be accepted through the assertion-review route. Previously accepted knowledge remains available when inference is down.

Analysis is model selection from a deterministic supported statement/check catalog. It provides no autonomous root-cause diagnosis or financial action. Financial status and beneficiary receipt remain separate. Both model configurations are unqualified.
