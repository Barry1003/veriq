# Initial frontend contract package for Usaamah — v0.1.0

Everything in `api/` is generated from implemented FastAPI routes. No proposed endpoint is included. Source/AI task JSON schemas are in `events/` and `schemas/`. `examples/*.synthetic.json` are actual responses captured from the real HTTP demonstration, with synthetic banking data and generated identifiers. They are fixture examples, not live connection indicators. Generated secrets are excluded.

Base URLs: Veriq `http://127.0.0.1:8100`; Cedar `http://127.0.0.1:8101`. API paths start `/v1`. Authentication uses `Authorization: Bearer <bank-provisioned-token>`, except ingestion, which uses the source-specific `X-Source-Secret`. Obtain a development token privately from Daniel's `var/runtime.json`; the frontend must never receive a source/feed/simulator token or another application's administrative credential.

Versioned machine contracts:

- `api/veriq-v0.1.0.openapi.json`
- `api/cedar-v0.1.0.openapi.json`
- `events/source-envelope-v1.schema.json`
- `schemas/knowledge-v1.schema.json`, `observation-v1.schema.json`, `interaction-v1.schema.json`, `transaction-v1.schema.json`, `document-v1.schema.json`
- `schemas/extract_knowledge-v1.schema.json`, `interpret_interaction-v1.schema.json`, `analyze_investigation-v1.schema.json`

A domain list returns `RowView[]`: `{id, kind, classification, created_at, data}`. `data` is domain-specific; inspect the schemas and captured examples. The flexible response payload is deliberate for this first contract; domain-specific response types should be tightened before a stable 1.0 SDK. Veriq collection routes support `offset` and `limit` (default 100, max 500). Cedar lists currently return all authorized records. All timestamps are timezone-qualified UTC ISO-8601 strings. Money is integer minor units (NGN kobo). No LLM output is a financial status.

## Implemented Veriq experiences

| Experience | API | Permission |
|---|---|---|
| Liveness and DB readiness | `GET /health`, `/ready` | Public; no institution data |
| Current identity | `GET /v1/access/me` | Authenticated in installation |
| Sources and connectors | `POST /v1/sources`; `GET /v1/sources`, `/v1/connectors` | sources |
| Pull one source page | `POST /v1/connectors/{source_id}/pull` | sources; configured deployment grant |
| Ingestion | `POST /v1/ingest` | Matching source secret, scope, grant, authority and schema |
| Ingestion errors | `GET /v1/ingestion/errors` | sources |
| Institutional context | `GET /v1/knowledge/context?at=...&known_at=...` | knowledge |
| Name resolution | `GET /v1/knowledge/resolve?name=...` | knowledge |
| Assertion processing/review | `GET /v1/knowledge/assertions`, `/v1/knowledge/reviews`; `POST /v1/knowledge/assertions/{id}/review` | knowledge; review to decide |
| Customer records and recurring reports | `GET /v1/interactions`, `/v1/issues` | customer |
| Operational evidence and suspected incidents | `GET /v1/observations`, `/v1/incidents` | operations |
| Queue and workspace | `GET /v1/investigations`, `/v1/investigations/{id}/workspace` | investigation |
| Evidence provenance | `GET /v1/evidence` | investigation |
| State changes | `POST /v1/incidents/{id}/state`, `/v1/investigations/{id}/state` | operations; review for investigations |
| Investigation review | `POST /v1/investigations/{id}/review` | review |
| AI reachability | `GET /v1/inference/status` | investigation |
| Document/interaction AI task | `POST /v1/inference/evidence/{evidence_id}` | knowledge or customer according to type |
| Investigation AI task | `POST /v1/investigations/{id}/analyze` | investigation |
| AI run results and failures | `GET /v1/inference/runs` | investigation |
| Audit trail | `GET /v1/audit` | audit |

`GET /v1/connectors` returns the authorized source registry with observed ingestion state, last reception/error, and pull cursor. `registered` means configured only. `receiving` means records were accepted; it does not assert an always-on network connection. Pull is explicit and returns one page, at most 100 records; repeat until `received == 0`. There is no scheduler pretending to stay connected.

The workspace contains the durable investigation, immutable revisions, source evidence, human review history and model runs. Select the highest revision `number` as current. Revisions retain earlier findings even after a later bank status or knowledge change. Show customer reports, bank-recorded status, contradictory evidence, hypotheses, missing information and recommendations distinctly. `beneficiary_verified=false` means receipt is unverified even when the bank recorded completion.

AI runs have `validated_candidate`, `quarantined`, or `unavailable` state. A validated candidate passed schema/citation checks; semantic support still requires review. Do not render it as accepted fact. Inference status `reachable` verifies runtime/model discovery only; `live_inference_verified` remains false because that endpoint does not execute an inference. Actual run records establish task execution.

## Implemented Cedar experiences

| Experience | API | Boundary |
|---|---|---|
| Account overview | `GET /v1/accounts` | bank; customers see their own account |
| Transfer | `POST /v1/transfers` | bank; account ownership; idempotency key |
| Status/history | `GET /v1/transactions` | bank; customers see their own transactions |
| Status reconciliation | `POST /v1/transactions/{transaction_id}/reconcile` | bank and operations |
| Customer service | `POST`, `GET /v1/interactions` | bank; customer ownership |
| Bank institutional administration | `POST`, `GET /v1/institutional/configurations` | knowledge; bank also needed for writes |
| Authorized integration feed | `GET /v1/feed?source_id=...&after=...&limit=...` | feed; installation and classification |
| Development controls | `POST /v1/simulator/seed`, `/v1/simulator/conditions` | simulator role and explicit development flag |

Cedar is a simulator of outgoing NGN processing, not a complete ledger/payment network. Completed transfers debit the sender; inconclusive transfers reserve funds until authorized reconciliation settles or releases them. It does not independently prove beneficiary credit or implement real interbank settlement. Gateway conditions influence actual processing and emitted evidence; they never write Veriq findings.

## Errors and scope

`401`: missing/invalid credential. `403`: wrong installation, source grant, role or clearance. `404`: unavailable or inaccessible record, or disabled simulator. `409`: immutable record/idempotency conflict, stale pull, conflicting identity, or invalid current state. `422`: schema/domain validation. `502`: pull failed with cursor retained. `503`: database not ready. FastAPI errors use `{"detail": ...}`; 422 schema errors have a detail array. Inference failures return a persisted run with its state, normally HTTP 200, because the task attempt was recorded successfully.

Basic roles are defined in `shared/auth.py`. Classification is enforced for evidence, assertions, projections, derived workspaces, reviews and inference. A workspace assembled using restricted context becomes restricted as a whole. Do not infer total institutional counts from authorized list lengths.

## Planned experiences with no complete contract yet

Installation/SSO configuration UI, credential rotation/revocation, granular source lifecycle operations, automated pull scheduling, separate impact/resolution tracking objects, manual cross-namespace identity merges, and a full intelligence overview projection remain future work. Build the initial experiences against the implemented contracts above. No frontend replacement is included here.
