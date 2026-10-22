# Route-to-screen handoff for Usaamah

Use `api/*-v0.2.0.openapi.json` for current integration, `schemas/` for native/task payloads, and `examples-v0.2.0/` for genuine captured responses. Historical v0.1.0 examples remain labelled separately. Local Compose verification binds Veriq to 8200 and Cedar to 8201; standard local runners/default Compose use 8100 and 8101.

| Screen | Implemented API actions | Still requires backend work |
|---|---|---|
| Deployment/system health | Both apps: `GET /health`, `/ready`; Veriq `GET /v1/access/me` | Installation wizard, SSO provisioning |
| Local AI settings/status | `GET /v1/inference/status`, `/v1/inference/runs`; task run records include model and execution metadata | Browser-based model install/configuration, runtime credential lifecycle |
| Integration registry/detail | `GET /v1/connectors`, `/v1/sources`; `POST /v1/connectors/{source_id}/pull`; `GET /v1/ingestion/errors` | Browser onboarding with server-side secret provisioning; scheduling, secret rotation and full connector edit/delete lifecycle |
| Knowledge sources/review | Cedar document intake and source feed; Veriq assertion/review lists, AI task and acceptance/rejection endpoints | Rich document editing, arbitrary file-format parsers |
| Knowledge explorer | `GET /v1/knowledge/context?at=&known_at=`, `/v1/knowledge/resolve?name=` | Reviewed cross-namespace identity merge UI/actions |
| Customer channel operations | Cedar four distinct native intake endpoints plus `GET /v1/channels`; Veriq source-specific activity and normalized `/v1/interactions` | Real SMTP/helpdesk/telephony/branch-system connectors |
| Customer interaction detail | Original text/channel/source/native ID/origin; `POST /v1/inference/evidence/{evidence_id}`; AI interpretation and inference-run lineage | Case assignment, outbound customer messaging |
| Emerging issues | `GET /v1/issues`; recurring reports labelled deterministic and no asserted common cause | Configurable issue lifecycle and SLA handling |
| Operational monitoring/incidents | `GET /v1/observations`, `/v1/incidents`; incident state changes | Service-specific detector configuration and alerts |
| Investigation queue/workspace | Queue, revisioned workspace/evidence, AI analysis, review and state changes | Assignment, richer evidence access policies and separate impact/resolution records |
| Audit | `GET /v1/audit`; investigation review history | Retention/export policy management |
| Cedar accounts/transfers | Account list, transfer initiation with idempotency, transaction list | Beneficiary management and real bank settlement network |
| Cedar support | Legacy `/v1/interactions` and native channel intake | Real external channel transport integration |
| Cedar transaction operations | Authorized reconciliation; financial writes remain exclusively Cedar | Real reconciliation provider integration |
| Cedar institution/integration | Configuration history/write, documents, read-only feed, channel activity | Source authorization lifecycle UI |

Channel status is evidence-based: `configured`/`registered` means no accepted records yet; `receiving` means actual records have been normalized/ingested. Each channel adapter has its own native schema, source ID, grant, evidence lineage and Veriq cursor. They share Cedar's approved HTTP feed transport. No email server, telephone network or branch platform is claimed connected.

Browser authentication uses a token provisioned for **that application** with the appropriate role/customer identity. Private development tokens are in the Git-ignored owner-only `var/runtime.json`. Never expose source secrets, the feed token, database passwords or simulator credentials in frontend assets. Simulator and source-ingestion endpoints belong to controlled backend/test processes, not customer screen actions. Do not put administrative tokens in a public frontend build; use institution-controlled identity/session provisioning for deployment.

Render `validated_candidate` model outputs separately from accepted knowledge and bank-recorded outcomes. A hypothesis remains a hypothesis even when the model cited a real evidence ID. Display unknown/conflicting states, pending statuses and unverified beneficiary receipt. The separate quality report measures behavior beyond JSON schema validity.

Only in-app native intake accepts an ordinary bound customer credential. Email, contact-centre and branch native recorders require Cedar's bank-authorized customer-operations permission; a customer browser cannot impersonate those adapters.

`POST /v1/sources` is implemented as a backend provisioning API and requires an ingestion secret. Do not call it from a browser or send that secret to the frontend. A browser-safe onboarding endpoint backed by bank secret storage is still required.
