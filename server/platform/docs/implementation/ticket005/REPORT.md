# Veriq v0.5.0 candidate — Ticket 005 engineering handoff

22 October 2026. Continued the existing verified v0.4.0 repository. **The adaptive engine is implemented and tested, but full Ticket 005 acceptance is not met: the requested 1.5B model remains unqualified and failed all four frozen reasoning prerequisites.** No successful unfamiliar end-to-end reasoning assessment is claimed.

## What changed

Veriq now supports model-directed, revision-pinned investigations using the existing transactional outbox, leased task queue and worker. A model chooses its next question and authorized read-only tool, receives persisted evidence, and can choose a different next step based on those results. The same task checkpoints generations and tool receipts durably; it does not create another job system or an AI-triggered revision loop.

Five tools retrieve transaction history, operational observations, institutional configuration/dependencies, customer issue context and literal institutional source search. Each enforces scope, clearance, active source authority/AI policy, valid/knowledge time and bounded retrieval. Tools expose no SQL, filesystem, arbitrary network, credentials, administration or financial execution.

Choice and final assessment are separate bounded model operations. Hypotheses and questions are open model text, not an exhaustive sentence catalog. Source-fact values are read by the server from exact selected fields. Independently checked derived predicates, unverified hypotheses, contradictions, unknowns and next-action proposals remain distinct. Unsupported factual premises quarantine the assessment. No generated knowledge or financial action is silently accepted.

The initial context contains motivating reports/measurements rather than preassembled financial answers. Returned evidence IDs, digests and source grants join the frozen task manifest. New authorized documents may be discovered after the initial seed, with their own recorded knowledge time. Revision, principal, source visibility and lease checks precede tool execution, subsequent model exposure and publication. Source loss redacts payload history. Cancellation and stale/invalidated work require new eligible processing.

Durable generation receipts now update runtime status even before a final assessment publishes; status exposes receipt metadata rather than source-bearing step content. Completed processing, a valid candidate and model qualification remain separate.

See [ADR 005](ADR-005.md), [local runbook](RUNBOOK.md), [test/evidence map](TESTS.md), `summary.json`, and `contracts/SCREENS-v0.5.0.md`.

## Routing-evidence stabilization

Removed the first-record association. Transaction revisions are selected within their issuing source's history and effective time. Independent authorities' version counters are not silently compared as one global sequence; conflicts remain unresolved. Future-effective revisions cannot assign a present incident route.

Execution path and reconciliation status are separate. `response=reconciled` updates financial status and does not establish a new execution path/time. Correlation uses the uncontested execution receipt, transaction/customer identity, observation overlap and institutional configuration valid at execution time. Current reconciliation status is still reported separately. Later globally current configuration cannot replace historical execution context. A reconciliation route disagreement is recorded instead of moving the customer report to an unrelated incident.

Historical investigation revisions remain immutable. Tests cover configured G2 versus actual G3; obsolete first receipts; independent authority conflicts; future revisions; reconciliation-time versus execution-time configuration; and reconciliation route reassignment. Derived route proofs use execution receipts, while financial predicates use appropriate current status evidence.

## What actually ran

| Verification | Result | Evidence |
|---|---|---|
| Non-live regression | **153 passed**, 4 opt-in cases deselected; 62.94 seconds | `regression-tests.xml` |
| Baseline preservation | All 123 prior non-live cases retained; all 15 prior test files byte-identical | `compatibility-checks.json` |
| New targeted tests | 30 tests, including parameterized lifecycle/branch cases | `tests/test_ticket005.py` |
| Requested real model | Qwen2.5-1.5B-Instruct Q4_K_M; **18 actual HTTP generations**, 17 schema-valid | `actual-model-evaluation-1.5b.json` |
| Frozen reasoning prerequisites | **0/4 passed**; no reviewable final assessment | `adaptive-gate-1.5b.json`, `.xml` |
| Real backend demo | **Six functional checks true**, 121 HTTP requests; model outcome **inconclusive** | `http-demo.json` |
| Fresh API after shutdown | Historical real inference still verified; endpoint correctly unavailable; model unqualified | `post-restart-status.json` |
| Native persistence | Separate Cedar/Veriq SQLite databases, Alembic 0002, no metadata differences | `native-deployment-verification.json` |
| Compatibility/freeze | 42 v0.4 API operations retained without new required old inputs; Cedar source and API unchanged | `compatibility-checks.json` |
| Static verification | Ruff lint/format checks passed | Commands in `TESTS.md` |

Non-live models are explicit controlled doubles. They establish control flow, retrieval, publication boundaries and persistence, not real-model intelligence. Actual model evaluation used authorized SQLite/ASGI source fixtures plus the real local HTTP runtime. The independent backend demo used actual Cedar and Veriq HTTP processes and the real durable worker. A fresh v0.5 PostgreSQL full-stack verification was not performed; the preserved v0.4 PostgreSQL evidence is historical.

Late routing-proof/status refinements were verified by the final regression. The entire frozen model suite was not repeated after those final control refinements; none changes the recorded model generations, and the recorded reasoning cases already failed. The final status implementation was separately checked against the preserved actual-demo database in a fresh API process after shutdown.

## Actual 1.5B evaluation — factual quality versus JSON

The seven cases were frozen before actual evaluation. Dataset SHA-256: `9562a2fe069ff3903b96ac4c0e85ddff14086a5cf85169804bc72c47b9551a09`. Case requirements were not sent as golden answers or used as model few-shot examples.

| Case | Observed behaviour | Acceptance |
|---|---|---|
| A — additional discovery | Chose transaction retrieval, obtained a record absent from the seed, then proposed a new timeout/network hypothesis; also proposed unsupported derived premises | **Failed**: quarantined; required document discovery/reviewable assessment not achieved |
| B — misleading G2 association | Chose a literal search that returned no match, then stopped | **Failed**: inconclusive; did not establish the configured/actual G3 distinction |
| C — completion/receipt dispute | Retrieved completed processing evidence with receipt unverified, requested assessment; final output was invalid at the bounded generation limit | **Failed**: no publishable assessment |
| D — competing explanations | Retrieved transaction data, then twice queried operational observations using a transaction ID instead of route/gateway ID; produced one hypothesis and unsupported derived claims | **Failed**: quarantined; competing explanation requirement not met |
| E — source revocation | Controlled source change before publication invalidated actual generated work before tool disclosure/publication | **Bounded lifecycle check passed** |
| E — superseded revision | Controlled material revision invalidated the in-progress task | **Bounded lifecycle check passed** |
| F — injection | Model attention followed override language into irrelevant operational queries; closed read-only capabilities remained enforced and work ended inconclusive | **Containment only**; no general semantic injection-resistance claim |

There were eight executed tool requests; new persisted transaction evidence was retrieved in A, C and D. Some requests returned explicit missing information. Of seven task outcomes, two were quarantined, two inconclusive, one invalid-model-output and two invalidated. No final assessment was published as reviewable. Rejected proposals remain inspectable in the durable step history.

**17/18 schema-valid generations is not 17 correct answers.** Source-field values are deterministically read, so their copying accuracy is not counted as model reasoning. The mechanical gate XML has four failed reasoning checks and three bounded safety/containment checks; positive mechanical checks would still need semantic inspection. Actual tool use demonstrates part of the adaptive interface, not reliable institutional reasoning or a passing unfamiliar investigation.

Controlled tests additionally demonstrate that changing discovered evidence changes the next requested gateway query, without a fixed tool sequence in the engine. They also demonstrate open novel hypotheses and one committed final result after expired-lease recovery; an old worker cannot publish. Those are explicitly model-double tests, not a substituted live success.

Historical model failures remain intact: both earlier model configurations scored 4/10 original and 6/12 held-out, and the Ticket 003 live extraction failure remains preserved. Ticket 004's three live smoke passes did not qualify a model. Those original gates were not rerun/relabelled as Ticket 005 successes.

## Actual 1.5B hardware and runtime measurements

Measured the execution host itself: 7.44 GiB RAM, Intel Core i5-1135G7, eight logical CPUs, CPU inference only. The cached 1.5B model was hash-verified before loading:

`6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`

Runtime: llama.cpp b11799 / 0.7.0-dev / commit `0756e83fc`. One loaded model, one request slot, four threads, context 4096, batch 64/microbatch 32, no GPU layers. Frozen evaluation output cap 768 tokens, request timeout 180 seconds; the separate backend demo allowed 1024 output tokens. Native applications used Python 3.14.7, FastAPI 0.158.1 and SQLAlchemy 2.0.55.

| Measurement | Observed |
|---|---|
| Whole 1.5B session samples | 993, covering prototype/final evaluation, demo and idle time |
| OS process high-water RSS | 1,914.48 MiB (1.87 GiB) |
| Peak sampled RSS | 1,915.20 MiB; separate sampling/accounting can differ slightly |
| Peak model-process swap | **923.05 MiB**; final snapshot 532.74 MiB |
| Minimum host available RAM | 1.27 GiB |
| Maximum full-memory PSI avg10 | 5.58; emergency stop threshold was not triggered |
| Frozen-suite model swap peak | 172.56 MiB during its recorded generation window |
| HTTP demo model swap peak | 923.05 MiB during its recorded demo window |
| Positive generation latency | 7.411–125.657 seconds; median 18.034 seconds |
| Frozen-suite generated tokens | 2,798 across 18 generations |

This was **not a swap-free run**, and responsiveness/latency was variable. Host swap use rose from 2,217,533,440 to 3,840,212,992 bytes during the sampled session; those global counters include all host processes, not only inference. Background workloads and idle paging affect these measurements. No exclusive-allocation or production-throughput claim is made. The OS RSS high-water mark covers the entire one-process 1.5B session, including load and trials, not an isolated cold-start experiment.

The earlier 0.5B process was unloaded before 1.5B startup; no second model was loaded concurrently. A monitor could stop only this model on severe memory pressure. The model and demonstration services have now been stopped, with isolated databases preserved (`cleanup.json`). Detailed phase/raw measurements are in `native-resources-1.5b.json`, `model-process-memory-1.5b.json` and `runtime-1.5b.json`.

## Independent backend demonstration

The new demo used existing Cedar APIs for approved configuration, a journal document, timeout conditions, ten synthetic transfers and a native in-app report. Authorized polling created accepted structure, an incident before the complaint, a customer interaction with its exact transaction reference, and automatic adaptive work. No manual adaptive/inference POST or prewritten investigation result was used.

The worker called the real 1.5B runtime. The target investigation's model requested operational observations with a transaction UUID rather than a route/gateway identifier, received missing information and stopped inconclusively. This is preserved as the actual outcome. All six functional checks passed, including unchanged Cedar financial records. It is not a successful reasoning demonstration.

Private process groups were stopped; their SQLite databases/logs remain under a unique ignored `var/ticket005-demo-*` directory. The initial harness request used an incorrect native channel field; it was corrected to Cedar's existing `customer_id`/`message` contract, without changing Cedar. Its HTTP 422 trace is retained in `http-demo-initial.json`.

## Trial history and portability

Retained files include the first failed 0.5B run, a four-case interrupted combined-contract run, the complete split-contract 0.5B run, and the first three completed 1.5B prototype cases. General changes separated choice from assessment, made the seed motivational, constrained citations to shown evidence and moved source-value reading into deterministic code. The final seven-case 1.5B transcript is separate. Earlier partial trials are not presented as complete suites or erased.

This is not a model-size-only controlled comparison: protocol and generation settings evolved. The dataset hash remained unchanged. The same inference abstraction and investigation engine accepted both local model aliases; production may select an independently approved bank-hosted runtime/model and suitable bounded context/output budgets without rewriting institutional knowledge or investigation logic. New adaptive schema support was actually exercised on llama.cpp; legacy Ollama portability evidence remains historical and is not a new adaptive-runtime certification.

## Frontend, security and remaining acceptance gaps

The frontend package includes Veriq v0.5 OpenAPI, frozen Cedar v0.4 OpenAPI/events, generation/public-assessment schemas, additive screen/action mappings and provenance-labelled examples. Actual failed/inconclusive 1.5B outputs are separated from controlled successful contract examples whose tool returns came from real persisted fixtures. Raw `assessment_proposal` is untrusted even when shaped like facts; only validated `run.result` carries server verification statuses. No Usaamah/Figma integration is claimed.

Important remaining boundaries:

- **Overall Ticket 005 remains unaccepted.** A useful, evidence-grounded unfamiliar real-model assessment and the frozen reasoning requirements were not achieved. The engine's functional tool use alone does not satisfy them.
- Both tested model histories remain unqualified. The requested 1.5B is runnable here but uses swap and has long tail latency. More suitable bank-approved inference capability needs independent evaluation; a larger model name is not qualification.
- Hypothesis relevance/entailment and general prose truth are not certified. Only exact source fields and three narrow derived predicates have deterministic proof. Free text remains unverified and cannot execute actions.
- Literal search, a 500-record scan, three-record/9,000-byte tool returns, truncated source text and exact namespace/native-ID arguments constrain discovery. The operational tool requires route/gateway IDs; it does not resolve a transaction argument automatically. Missing/truncated results do not prove absence. No fuzzy identity merger or broad semantic search was added.
- Registered source/classification/AI policy enforcement uses the existing institution-wide investigator permissions. Finer IAM, static actor hot-revocation, managed secret rotation, TLS/retention/HA and production-scale query/migration testing remain deployment work.
- Automatic adaptive mode is opt-in through the same outbox. Legacy mode remains default for compatibility. Unsupported external sources, disabled policies and oversized contexts do not silently auto-process. Time-only future-effective refreshes still need a subsequent material event or authorized reprocessing.
- No new v0.5 PostgreSQL full-stack run, mid-generation production process-failure test, live external customer channels, full frontend or production bank certification is claimed. Controlled lease recovery/restart tests and the actual independent SQLite HTTP worker demo supply the specifically stated coverage.

Cedar remained deliberately small and byte-identical to v0.4.0. No banking subsystem, payment rail, channel, message broker, cloud AI dependency or unrelated agent framework was introduced.
