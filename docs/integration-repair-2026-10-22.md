# Veriq + Cedar integration repair — 22 October 2026

The complete product is **not ready for a secure end-to-end demonstration**. This change repairs Cedar transfer recovery and origin validation, implements six Veriq read adapters, verifies real isolated Cedar→Veriq evidence propagation, and adds frontend CI. It does not implement the missing authenticated browser session boundary, ten remaining Veriq service mappings, operational/investigation screens, or a qualified local model. No backend implementation, migration, canonical contract or AI mechanism was changed.

## A. Git status and consolidation

Authoritative remote: `git@github.com:Barry1003/veriq.git`. Initial working tree was clean on local `main` at `6fe7910d8cea5604b5c20095b50f160952a1056b`. Fetch verified remote main `f05eba84f055516c69f1e1f54bc2e57cfe40d7df`; the repair branch `codex/integration-repair` was created from it without rewriting local main.

During this session an external commit/push advanced the active branch and remote main to **`c0427ce9787e5522c7e823c1ce9d84b12b7bf213`**. That commit contains the initial transfer cookie/route/page changes before the complementary client and TypeScript fixes were complete. It was preserved. This agent did not create or push that main commit. Subsequent work remains on the repair branch for review.

| Remote branch | SHA | Relation to verified main | Unique content / decision |
|---|---|---|---|
| main | c0427ce9787e5522c7e823c1ce9d84b12b7bf213 | Integration target | Contains the externally committed partial transfer change; review the completing repair |
| feat/import-veriq-platform-v0.5.0 | 2935bc67d761dabc692936d327a1e31c9afee93e | Ancestor, 7 commits behind | Fully incorporated through PR #1; no outstanding unique commits |
| feat/live-demo-backend-readiness | 0307bc9594bbb012c128bd4f642c6a13730d12e1 | Ancestor, 4 commits behind | Fully incorporated through PR #2; no outstanding unique commits |
| codex/frontend-restructure | bcb54464964d37cf586bb4c5435f99626af31b62 | 1 ahead / 23 behind | Older scaffold replacing former gitlinks; superseded by current applications; obsolete, do not merge |

`git cherry origin/main origin/codex/frontend-restructure` reports its single commit as unique, not a squash-equivalent patch. That does not indicate missing product functionality: the branch has blank application home pages and old scaffolds. A read-only `git merge-tree --write-tree` simulation reports **32 conflicts**. It would regress the existing application designs and services. No stale branch was merged or deleted. Tests were run on the repair worktree, not falsely attributed to this obsolete branch.

GitHub returned exactly PRs [#1](https://github.com/Barry1003/veriq/pull/1) and [#2](https://github.com/Barry1003/veriq/pull/2) before creating the repair PR: both merged/closed, no pending review requests, and no submitted reviews returned. The initial `f05eba8` status API returned two successful Vercel statuses; its PR-triggered workflow lookup returned no runs. This repository had no checked-in GitHub Actions workflow. That does not establish backend or integration CI success, and the workflow lookup does not prove absence of every historical event type. Final repair PR/check status is recorded in its GitHub conversation; no merge is authorized by these local results.

## B. Screen and integration matrix

`PARTIALLY_INTEGRATED` means a real adapter/API exists but the whole authenticated browser journey is incomplete. HTTP 200 alone is not integration verification. Veriq route smoke checks below exercised **mock mode**. Authorization entries name backend permissions, not guarantees supplied by the current shared UI gate.

| Screen | Service | Actual backend endpoint(s) | Authorization | Data source | State | Verified result |
|---|---|---|---|---|---|---|
| Cedar account/activity | bankGet | GET /v1/accounts, /v1/transactions | bank; customer-bound principal | Cedar DB | PARTIALLY_INTEGRATED | Real SSR data; login rejection verified; shared identity gate unresolved |
| Cedar transfer/recovery | POST /api/cedar → dedicated actions | POST /v1/transfers | bank; account ownership | Cedar DB + sealed request cookie | PARTIALLY_INTEGRATED | Real request/replay retained same transaction and reservation; identity/cross-device limits remain |
| Cedar support/history | banking client / bankGet | POST /v1/channels/in-app/messages; GET /v1/interactions | bank; customer-bound principal | Native Cedar interaction rows | PARTIALLY_INTEGRATED | Real report ingested by Veriq; renamed Support history; no invented case state |
| Cedar staff overview | bankGet, bankGetRecentOperationalFeed | GET /v1/transactions, /v1/interactions, /v1/feed | bank / customer / feed | Cedar DB and scoped feed | PARTIALLY_INTEGRATED | Real route/time/count data; missing samples remain unavailable; UI role isolation fails |
| Cedar payment routes | bankGetRecentOperationalFeed | GET /v1/feed?source_id=cedar-operations | feed | Scoped observations | PARTIALLY_INTEGRATED | Pagination regression checks pass; original windows preserved |
| Cedar transaction inquiries | bankGet | GET /v1/transactions | bank | Cedar DB | PARTIALLY_INTEGRATED | Pending status remains uncertain; real reconciliation tested separately |
| Cedar support channels/detail | bankGet | GET /v1/interactions, /v1/channels, /v1/transactions | customer/bank/channel scope | Cedar DB | PARTIALLY_INTEGRATED | Original statements retained; no dedicated complaint case API |
| Cedar source registry | bankGet | GET /v1/institutional/configurations, /documents | knowledge | Cedar DB | PARTIALLY_INTEGRATED | Source documents/configurations read from bank, not Veriq fixtures |
| Cedar authorizations | existing source-category page | No Cedar staff grant-list API | Decision needed | Category information | BACKEND_DEPENDENCY | Does not prove live grant authorization |
| Cedar operator/reconciliation | operator controls → action allowlist | POST /v1/simulator/seed, /conditions; /v1/transfers; /v1/transactions/{id}/reconcile; institutional and native channel endpoints | simulator; bank+operations for reconciliation | Cedar DB | PARTIALLY_INTEGRATED | Customer action key cannot reconcile; operator transfer path now stages recovery too; old static scenario captions remain preview assumptions |
| Veriq overview | getIntelligenceOverview / live adapter | GET /v1/incidents, /interactions, /issues, /investigations, /inference/status, /knowledge/context, /knowledge/assertions, /knowledge/reviews | operations/customer/investigation/knowledge | Veriq DB | PARTIALLY_INTEGRATED | Adapter exercised over real HTTP; missing baseline remains null; no automatic AI finding fabricated; route has no session reader |
| Veriq legacy summary service | dashboardService | GET /v1/knowledge/context, /investigations, /evidence | knowledge/investigation | Veriq DB | PARTIALLY_INTEGRATED | Fake dashboard endpoint removed; real composition tested; no current screen consumes this legacy service |
| Knowledge Explorer | getInstitutionalKnowledge | GET /v1/knowledge/context, /evidence, /knowledge/assertions | knowledge/investigation | Accepted source-backed projection | PARTIALLY_INTEGRATED | Native route/gateway/process kinds, canonical identities, citations, full edge timestamps and contested/identity states mapped; session reader missing |
| Knowledge Sources | getKnowledgeSources | GET /v1/sources | sources | Source registry, delivery counters | PARTIALLY_INTEGRATED | Registration, received evidence, polling errors and revocation remain separate; source_id is not row UUID |
| Knowledge Processing | getKnowledgeProcessing | GET /v1/knowledge/assertions, /knowledge/reviews | knowledge | Assertions + latest review decisions | PARTIALLY_INTEGRATED | Accepted/rejected assertions excluded from candidates; review controls still clearly local drafts |
| Temporal / expanded dependency graph | getTemporalProvenance / getDependencyGraph | GET /v1/evidence; /knowledge/context?at=&known_at= could support future adapter | knowledge/investigation | Existing fixture-specific timeline | MOCK_ONLY | Live mapping absent; fixture IDs/dates remain; no live time-travel claim |
| Extraction evidence | getKnowledgeExtractionTask | GET /v1/inference/tasks/{id}, /steps; /v1/processing/evidence/{id} | investigation; evidence-specific checks | Existing completed-example view | MOCK_ONLY | Backend reader supports task/trace reads; status-rich extraction view adapter absent |
| Customer Interactions | getCustomerInteractions | GET /v1/interactions, /issues | customer | Persisted normalized contacts | PARTIALLY_INTEGRATED | Real HTTP tested; email supported; exact original statements; no invented case, unique-customer total or incident link |
| Emerging Issues / evidence | getEmergingIssues | GET /v1/issues, /interactions | customer | Existing fixture views | MOCK_ONLY | Live grouping/detail mapping absent |
| Connector registry/detail/variants | getConnectorRegistry / Detail / Variant | GET /v1/sources, /evidence; /processing/intents | sources/investigation | Existing fixture views | MOCK_ONLY | Real read transport exists; existing screen mappings absent |
| Connector create/validation | connector workflow service | Provisioning/pull/authorization APIs in LIVE-DEMO.md | identity/sources; secrets operator-only | Local drafts and examples | MOCK_ONLY | No live source-secret form implemented |
| Access/policies | getAccessPolicies | GET /v1/access/me | authenticated principal | Existing role examples | MOCK_ONLY | Real self-access transport exists; no policy-directory API or identity provider |
| Local AI | getLocalAiRuntime | GET /v1/inference/status, /tasks, /tasks/{id}/steps | investigation | Existing runtime example | MOCK_ONLY | Real status read verified outside this screen; task-state UI mapping absent |
| System Health | getSystemHealth | GET /v1/setup/readiness, /inference/status, /sources | admin/sources/investigation | Existing example | MOCK_ONLY | Model unavailable reported by real APIs; screen not wired |
| Onboarding + source acquisition | onboarding wizard / readiness helper | GET /v1/access/me, /setup, /setup/readiness; approved setup mutations | admin, development setup gate | Local wizard | MOCK_ONLY | Real setup/readiness APIs read in rehearsal; wizard is not live activation |
| Operational Intelligence | generic [section] route | GET /v1/observations, /incidents | operations | Placeholder | BLOCKED | Returns “not available yet”; no operational screen integration |
| Investigations | generic [section] route | GET /v1/investigations, /{id}/workspace; /inference/tasks and /steps | investigation/review | Placeholder | BLOCKED | Real workspace reader tested; no investigation/task polling/review browser experience |

No Veriq screen is classified `LIVE_AND_VERIFIED`. Six reads are now implemented and exercised as adapters; their authenticated route integration remains blocked. Ten specialized service modules still throw in API mode: connectors (registry/detail/workflow/variants), temporal provenance, extraction, emerging issues, access, local AI and health. The original audit's 15-placeholder finding was correct at baseline; the dashboard service was an additional incorrect endpoint.

The backend `investigator` role lacks `sources` permission. Knowledge pages currently compose the source-registry service as well as knowledge reads. Decouple the investigator's knowledge page from admin-only source management when wiring sessions; do not give investigators admin credentials to make a composite page work.

## C. Issue register

Line references describe the repair worktree. “Fixed” is bounded by the verification stated here.

| ID / severity | Exact location | Confirmed behavior / root cause | Expected behavior / solution | Owner | Regression evidence / status |
|---|---|---|---|---|---|
| F01 Critical | client/cedar/src/app/banking/banking-client.tsx:28 | Original ref vanished on refresh; edits silently replaced identity | Stage exact sealed instruction before backend call; lock changed payload; acknowledge only after validated response | Frontend | 9 recovery/security tests + real HTTP same-ID/balance replay; fixed for retained same-browser cookie |
| F02 High | client/cedar/src/app/api/cedar/route.ts:44 | Internal Next hostname differed from public browser origin, rejecting valid mutations | Compare Origin to deployment-owned CEDAR_UI_ORIGIN; reject missing config | Frontend | Real HTTP stage now 200; cross-origin 403, missing config 503; fixed |
| F03 Critical | client/cedar/src/proxy.ts:5 | One Basic login protects customer, staff and operator routes; same login reaches staff SSR data using staff bearer | Approve distinct session→principal mapping, then enforce server-side per route and action | Daniel policy; frontend implementation | Real HTTP confirms staff exposure through shared login; unresolved |
| F04 Critical | client/veriq/src/services/api/veriq.ts:124 | No authenticated browser session resolver exists | Server session resolves fixed per-user principal; never accept browser-selected tokens/customer/institution | Daniel policy; frontend implementation | requireVeriqApi fails closed; adapter tests pass; blocked |
| F05 High | client/veriq/src/app/[section]/page.tsx:21 | Operations and investigations are placeholder routes | Implement actual observations/workspace/task states with approved designs and session context | Frontend | HTTP 200 is only placeholder smoke; unresolved |
| F06 High | client/veriq/src/services/connector-registry.ts:8; connector-detail.ts:10; connector-workflow.ts:11; connector-variants.ts:8 | Existing API branches throw despite available backend reads | Build supported live view models; keep unsupported provisioning disabled and secrets server-only | Frontend | Reader paths match OpenAPI; screen mappings unresolved |
| F07 High | client/veriq/src/services/knowledge-extraction.ts:7; local-ai-runtime.ts:8; system-health.ts:8 | Example-only models omit actual asynchronous/failure states | Map real status, task outcome, runtime qualification and readiness independently | Frontend; Daniel owns model/runtime policy | Backend failure tests pass; screen mappings unresolved |
| F08 High | client/veriq/src/services/emerging-issues.ts:7; temporal-provenance.ts:8 | Fixture-centric issue/timeline implementations | Map actual group membership and bitemporal context; no hardcoded native IDs | Frontend | Live API branches still blocked/unimplemented |
| F09 High | client/veriq/src/features/institutional-knowledge/expanded-dependency-graph.tsx:17 | Timeline uses fixed dates and REL-008/OPS-00128 IDs | Real temporal queries plus request ordering/known-time handling | Frontend | Remains mock-only; no false live graph |
| F10 High | client/cedar/src/app/banking/banking-client.tsx:96 | Support message ID/time only survive current render session; editing resets identity | Durable exact message body/time recovery tied to approved session; add backend request lookup if required | Frontend + Daniel contract | Native replay tested by backend verifier; reload recovery unresolved |
| F11 Medium | client/cedar/src/app/banking/banking-client.tsx:101 | “My Cases” suggested formal tracked complaints | Label actual interaction history truthfully | Frontend | Renamed Support history; no fabricated resolved cases; fixed |
| F12 High | client/veriq/src/types/customer-interactions.ts:1 | Three-channel/example-case-only model cannot represent native email or absence of a case | Include email, unclassified reports, null case/incident IDs and live source kind | Frontend | Channel/no-fabricated-case test + real HTTP; fixed in contact adapter/view |
| F13 High | client/veriq/src/types/institutional-knowledge.ts:1 | Example kinds excluded native route/gateway/process/procedure; fixture IDs hid real graph relationships | Map canonical IDs, actual predicates and source-qualified relationship states | Frontend | Real context adapter test; generic relationship selection; fixed within read adapter |
| F14 High | client/veriq/src/services/api/dashboard.ts:4 | Unimplemented dashboard URL treated as API | Compose contract-authorized lists/context; keep unprovided trends null | Frontend | Real HTTP adapter test; invented endpoint removed |
| F15 Medium | client/veriq/src/app/knowledge/dependencies/page.tsx:12; eslint.config.mjs:4 | Existing JSX-in-try lint failure; nested generated .next artifacts linted | Fetch in try then render outside; ignore generated build outputs; CJS tests use scoped CJS rules | Frontend | Full ESLint passes without suppressing application rules; fixed |
| F16 High | client/cedar/src/lib/transfer-recovery.ts:42 | Cookie-only recovery cannot survive removal/expiry/different devices; concurrent tab staging lacks durable serialization | Durable session-owned request registry and recover-by-client-request lookup; do not promise exactly-once across devices | Daniel contract + frontend session implementation | Same-browser scope documented; unresolved broader guarantee |
| F17 High | client/veriq/src/app/knowledge/page.tsx:24 | Investigator knowledge page also needs sources-admin permission | Derive investigator source context from visible evidence; reserve grant management for admin | Frontend; Daniel confirms least-privilege policy | Backend ROLE_PERMISSIONS confirms mismatch; unresolved route integration |
| F18 Critical | server/platform/apps/veriq/backend/runtime_status.py:87 | Runtime explicitly says model unqualified; actual model is absent here | Reproduce unchanged frozen evaluation using approved runtime/model; do not lower gates | Daniel accountable under current AGENTS.md; consult Habeeb | No new qualification run; 0/4 remains unqualified |

The current root AGENTS.md assigns backend and AI ownership to Daniel. The brief mentions Habeeb too; no AI internals were changed or independently reassigned.

## D. Changes performed

The exact reviewable file list is the repair PR diff. The external main commit `c0427ce` owns the initial `transfer-request.ts`, `transfer-recovery.ts`, banking-page recovery and route staging additions; this PR completes and corrects that work without amending its history.

- Cedar: complete client prepare→submit→acknowledge flow; exact-instruction locking; immediate duplicate-click guard; safe request/result checks; matching operator transfer handling; explicit trusted Origin configuration; server-only API boundary; truthful failed-transaction and support-history labels; visible support submission errors; banking preview transactions moved into the owning data directory and exposed through an adapter.
- Veriq: server-only allowlisted read client; six typed adapters; explicit unavailable/permission/conflict errors; actual native source IDs; real relationship predicates and uncertainty; exact customer statements and email; ingested counts distinguished from accepted knowledge; no invented baseline, trend, case or AI review. Session-free live calls fail closed.
- Tests/CI: package test commands, nine Cedar regressions plus existing contract/pagination smoke, nine Veriq default tests plus an opt-in real HTTP case; frontend GitHub Actions matrix. The workflow installs frozen pnpm locks, then checks TypeScript, ESLint, tests and production builds. Backend CI was not changed.
- Documentation: actual environment examples, architecture/integration guidance, this requested report and sanitized evidence. No CSS, theme, design token, asset, navigation capability, backend contract or backend source was rewritten.

Repair commits:

- `3985ba67b5fb7eae65155a3f3dd5e316acd80869` — Complete Cedar transfer recovery and validate browser origin
- `b9bd7e6af0e7bac01670a83b864aac6140962217` — Add contract-verified Veriq intelligence read adapters
- `22c11bba06957066648190b205886ad8867da937` — Check both frontend applications on pull requests

The documentation/evidence commit follows these changes. The sanitized JSON includes the exact changed-file inventory. Only owned rehearsal and Next production processes were stopped after verification; isolated databases and artifacts remain intact.

## E. Executed verification and limitations

| Command / environment | Result |
|---|---|
| `git status --short`; `git fetch origin`; `git branch -avv`; `git ls-remote --heads origin`; ancestry/cherry/merge-tree checks | Clean baseline; all four original remote branches inventoried; obsolete scaffold conflicts identified |
| `pnpm install --frozen-lockfile` in both client apps | Passed using existing installs |
| Fresh `/tmp/veriq-integration-clean-install-20261022/{cedar,veriq}`: frozen-lock install | Cedar installed 354 packages cleanly. Veriq first failed with registry ETIMEDOUT; `pnpm install --frozen-lockfile --offline` then installed all 354 from the completed cache |
| `uv sync --frozen` in server/platform | Passed; fresh Python 3.12 environment with 33 pinned packages |
| `.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack'` | **169 passed, 4 deselected**, one existing Starlette/httpx deprecation warning |
| Both clients: `pnpm type-check`; `pnpm lint`; `pnpm build` | Passed. Cedar also built with CEDAR_DATA_SOURCE=api and private server configuration |
| Cedar: `pnpm test` | **9 passed**, plus existing banking contract/pagination smoke passed |
| Veriq: `pnpm test` | **9 passed, 1 opt-in HTTP test skipped** by default |
| Veriq: `VERIQ_TEST_RUNTIME_FILE=<isolated-run>/runtime.json VERIQ_TEST_API_URL=http://127.0.0.1:18610 node --test tests/live-adapters.test.cjs` | **10 passed** against real HTTP (repeated successfully against the second isolated run at port 18620): sources, contacts, candidates, context, overview, summary and workspaces; no browser credentials involved |
| `.venv/bin/python -m scripts.rehearsal init --run frontend-audit-20261022 --storage sqlite --veriq-port 18610 --cedar-port 18611 --model-port 18181 --db-port 56330` then `up --without-model`, `prepare`, `scenario --phase anomaly`, `scenario --phase customer` | Real separate APIs/databases/worker; knowledge/document delivery, 10 genuine transfers, proactive incident, native report and persisted investigation context |
| Fresh second run `frontend-check-20261022`, ports 18620/18621/18191/56340; `verify_rehearsal --wait-seconds 5` | **11/13 checks true, exit 2**. Model deadline and actual model-generation checks failed. Unavailable/retryable AI was retained; core aggregate is false because actual model transport is part of that aggregate |
| Next production servers: Cedar 18630, Veriq 18631; `.venv/bin/python /tmp/verify-frontend-http.py` | 26 HTTP route probes; Cedar root redirects, remaining routes return 200. Veriq probes are preview/placeholder smoke. Nine recorded assertions include eight expected functional checks and one confirmed shared-login vulnerability |
| Real HTTP recovery | Prepared sealed cookie before bank call; deliberately withheld acknowledgement; replayed exact instruction; same transaction returned; accounts/reservations unchanged by replay; account switching 409; SSR reload contains original identity and recovery action |
| `PYTHONPATH=. .venv/bin/python /tmp/verify-owned-restart.py` in server/platform | **3/3 checks passed**: worker restart preserves financial state, banking renders backend outage, API restart preserves accounts/reservations |
| Browser discovery/open | CUA inventory empty; opening iab returned “Browser is not available”. No click-through, keyboard, responsive layout, screenshot or browser-cookie behavior claim |
| `git diff --check`; diff under server/ | Passed; no backend modifications |

The local HTTP harness explicitly replays the sealed Cookie header because production `Secure` cookies require HTTPS. It verifies the Next handler, bank behavior and SSR recovery, not a browser's HTTPS/cookie handling. Production same-site/session behavior still needs browser verification.

The full raw transcripts, runtime configuration, separate SQLite databases and scenario checkpoints are preserved in ignored `server/platform/var/rehearsals/frontend-audit-20261022/` and `frontend-check-20261022/`. Credentials were never printed or copied into committed artifacts. [Sanitized results and native identifiers](integration-repair-2026-10-22.json) include actual response excerpts. The temporary HTTP harness is recorded by exact executed path above; durable regression coverage is in the client test files and backend verifier.

An initial verifier invocation mistakenly used `--resume` without an existing checkpoint and failed with FileNotFoundError. It was replaced by the fresh named run above. No failed result was erased or relabeled. Early TypeScript/lint failures were corrected; no model output or gate was replaced.

PostgreSQL/Podman and an approved local runtime/weights were unavailable. No PostgreSQL full-stack test, live inference, model benchmark or model qualification was executed. Current failed runtime status is not proof of an AI implementation defect. The five-second verifier budget was an explicitly bounded outage test, not a claim about CPU inference latency.

### Failure/security coverage

| Failure | Evidence and safe result | Limit |
|---|---|---|
| Missing credentials | Both APIs reject unauthenticated HTTP; Cedar UI returns 401; reader requires server context | Browser session resolver absent |
| Invalid role / wrong customer / wrong institution | Existing authorization and Cedar ownership/isolation tests passed; customer action key reconciliation returns 403 over real frontend HTTP | Shared UI role separation still fails |
| Revoked source | Fresh verifier's empty source pull rejects 403; existing in-flight revocation/publication tests pass; reader discards redacted steps | No nonempty-source browser-cache lifecycle test |
| Invalid schema / partial ingestion | Existing connector tests reject invalid envelopes and roll back failed pages/cursors | Real malformed-feed outage not injected in HTTP run |
| Backend offline / timeout | Reader rejects unreachable/timeout without fixtures; Cedar returns uncertain 502 and keeps instruction | See lifecycle evidence; no live network proxy fault injection |
| AI offline / disabled | Real runtime unavailable; queue/outcome remains unavailable/retryable; automatic backend processing continues; existing disabled/unavailable tests pass | Local-AI screen still mock-only |
| Worker stopped/restarted | Real owned worker restart preserved financial state; Cedar API outage rendered an explicit unreachable error; API restart preserved accounts/reservations; existing durable lease tests passed | Isolated SQLite environment only |
| Duplicate request/event | Real transfer/report replay counts, repeat prepare and frontend same-ID replay; backend outbox/idempotency tests | Cookie deletion/cross-device not covered |
| Stale response / investigation revision | Backend stale-revision and expired-worker publication tests pass; workspace reader preserves revisions | Browser polling/request ordering not implemented |
| Failed connector polling / empty sources | Source adapter preserves last_error/no-records states; rollback/cursor tests pass; empty-list tests pass | No complete live source administration screen |
| Invalid/quarantined/inconclusive/superseded AI | Existing backend task/evidence-support tests pass; reader preserves native states and redacts revoked traces | Extraction/task browser state machine still missing |
| Attempt to change financial truth from Veriq | Backend financial-boundary tests and real verifier show AI processing leaves Cedar state unchanged; staff reconciliation is explicit | Approved browser per-role mapping still required |

## F. Owner-ready handoffs

### Daniel: browser identity policy; frontend implements after confirmation

Confirm the session provider, stable subject, app/institution/environment scope, allowed backend principal roles, clearance, customer binding, session lifetime/revocation and role-switch rules. Proposed server resolver output is internal only:

```ts
type ApprovedSessionContext = {
  subject: string;
  application: "cedar" | "veriq";
  principalReference: string; // server registry reference, never a browser bearer
  scope: string;
  roles: readonly string[];
  clearance: "internal" | "restricted";
  customerId: string | null;
  expiresAt: string;
};
```

The browser should carry only an opaque Secure/HttpOnly/SameSite session cookie. Next validates it on every read/mutation and selects the fixed server-side application credential. The browser must not choose customer, institution, clearance or credential. Backend enforcement remains unchanged. Customer routes must not invoke staff/feed/simulator credentials. Origin/CSRF checks, method/path allowlists and typed body validation remain mandatory. This is a proposal, not an implemented login or security guarantee.

### Daniel: request recovery beyond one retained browser cookie

Propose an authenticated, customer-owned request registry keyed by client request identity, scoped to the existing installation/principal. Preserve `{account_id, route_id, amount_minor, idempotency_key}` and the original resulting transaction ID. Required semantics: conflicting payload→409; cross-customer visibility→404/403 per agreed policy; ambiguous response remains queryable; duplicate calls return original transaction; no financial mutation from a recovery query. An endpoint name/schema must be agreed before implementation. Frontend-only cookie recovery cannot guarantee cross-device or concurrently staged-tab recovery. Coordinate a similar exact-body/native-ID/timestamp registry for support messages.

### Daniel: proposed complaint/case API, currently absent

Current interaction recording is implemented and must retain that meaning. If formal case tracking is required, the following is a proposed contract, not a claim that these routes exist:

```json
POST /v1/support/cases
{"interaction_ids":["source-interaction-id"],"transaction_id":null,"summary":"Customer report"}

201
{"case_id":"server-generated-id","customer_id":"server-bound-customer","state":"open","interaction_ids":["source-interaction-id"],"transaction_id":null,"created_at":"ISO-8601","updated_at":"ISO-8601","resolution":null}

GET /v1/support/cases
[{"case_id":"...","customer_id":"...","state":"open","interaction_ids":["..."],"transaction_id":null,"created_at":"...","updated_at":"...","resolution":null}]

GET /v1/support/cases/{case_id}
{"case_id":"...","customer_id":"...","state":"open","interaction_ids":["..."],"transaction_id":null,"created_at":"...","updated_at":"...","resolution":null}
```

Confirm state enum/transitions, permissions, history, idempotency, pagination and retention. A case resolution must not settle a transfer. The customer identity comes from the principal, not a submitted customer ID. Until approved, Support history remains interaction history.

### Frontend: remaining implementation

After identity policy is confirmed, supply `VeriqApi` from the server session into route loaders; decouple investigator knowledge from admin-only source registry reads. Implement the ten remaining live view models and the real operations/investigations views. Add bounded task polling, stale/request ordering, revision changes, revocation cache clearing and authorized review mutations. Existing drafts/examples must never be treated as persisted work. Operator scenario metadata still references historical design IDs/windows and needs separate live captions grounded in actual source registrations. Preserve the design system and all three pillars.

### Daniel / Habeeb: AI

Daniel is accountable under current repository instructions; consult Habeeb on the qualification decision. Run the unchanged frozen adaptive evaluation with an approved compatible runtime/model. Preserve 0/4 until actual evidence supersedes it. No claim of a reproducible model implementation bug is made from this model-free environment. Reproduction of the observed limitation is `GET /v1/inference/status` plus the retained task/worker history: runtime unreachable, task outcome unavailable, no HTTP-generation receipt. Expected behavior in outage is safe unavailable/retryable state, not a generated finding; the backend exhibited that behavior.

## G. Final readiness verdict

| Area | Verdict |
|---|---|
| Cedar customer banking | PARTIALLY_INTEGRATED — genuine backend state and bounded recovery verified; identity boundary and broader durable recovery remain |
| Cedar operations | PARTIALLY_INTEGRATED — bank-owned data visible; shared-login staff exposure blocks secure use |
| Veriq knowledge intelligence | PARTIALLY_INTEGRATED — live read mappings exercised; browser session/temporal/review integration incomplete |
| Veriq operational intelligence | BLOCKED — backend detection verified; operational screen is a placeholder |
| Veriq customer-experience intelligence | PARTIALLY_INTEGRATED — contact adapter verified; browser session and live emerging-issue mapping missing |
| Investigation engine | PARTIALLY_INTEGRATED — backend persisted workspaces/history verified; investigation browser experience absent |
| Local AI integration | BLOCKED — model absent here and existing model remains unqualified; runtime screen not connected |
| Cedar–Veriq synchronization | PARTIALLY_INTEGRATED — real isolated SQLite source→feed→worker→evidence→investigation propagation verified; full frontend presentation/model/PostgreSQL gates not met |
| Authentication/security | FAILED — shared Cedar gate exposes staff routes; no approved per-user BFF sessions |
| Full demonstration readiness | BLOCKED — leave repair PR unmerged pending review; no main consolidation or full-product success claim |

Do not merge obsolete scaffolds or use Vercel success as integration approval. Required owners/reviews/security gates remain outstanding. The report intentionally distinguishes successful bounded tests from the still-incomplete product.
