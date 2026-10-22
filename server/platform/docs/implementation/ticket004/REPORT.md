# Veriq v0.4.0 — Ticket 004 handoff

Recorded 22 October 2026 on the actual development execution host. This extends the existing v0.3.0 repository and modular Cedar/Veriq architecture. No frontend implementation or production bank/model approval is claimed.

## Delivered behaviour

Authorized document ingestion, customer interaction ingestion and material investigation revisions now create transactional processing intents. The existing durable worker dispatches narrowly scoped extraction, interpretation and analysis jobs automatically. Structured configuration acceptance and deterministic monitoring continue independently of inference. No individual manual inference endpoint was called by the full-stack demonstration.

Source-aware identity prevents unrelated native identifiers from merging. Authorized namespace grants and evidence-backed mappings permit explicit reconciliation. Migration 0002 preserves stored legacy UUIDs and historical references, marking ambiguous legacy combinations for administrator review. Source authorization, grant versions, evidence digests, actor authority, task leases and current investigation revision are checked before execution and publication. AI output remains candidate-only or quarantined.

See [architecture and requirement map](ARCHITECTURE.md), [identity/migration contract](IDENTITY-MIGRATION.md), [runbook](RUNBOOK.md) and [tests](TESTS.md). The frontend handoff is indexed by `contracts/README.md` and `contracts/SCREENS-v0.4.0.md`.

## Actual execution and acceptance

| Verification | Actual result | Evidence |
|---|---|---|
| Non-live regression | **123 passed**, 4 deselected; 43.32 seconds | `regression-tests.xml` |
| Complete real HTTP/PostgreSQL/worker/model pipeline | **1 passed**; 344.49 seconds | `full-stack-tests.xml`, `http-transcript.json` |
| Existing live model smoke suite | **3 passed**; 20.25 seconds | `live-model-tests.xml` |
| Deployment/credential/source audit | All ten checks true; both databases at migration 0002, no metadata differences | `deployment-results.json` |
| Static checks | Ruff lint and formatting checks passed for all 64 Python files | Commands in `TESTS.md` |

The 95-test v0.3.0 baseline remains present; 28 additional non-live tests cover this release. Test fixture setup explicitly approves the original shared identifier authority and disables automatic jobs for legacy manual-path assertions; assertions were not removed or weakened. Non-live inference clients are explicit doubles. The full-stack and live suites made actual HTTP calls to the same private local model.

The complete pipeline was run before final compatible status/namespace-hardening refinements. The refined core was rebuilt into the same deployment, audited by file hashes against the final source, and passed the final 123-test regression. `deployment-results-pipeline.json` preserves the immediate pipeline audit; `deployment-results.json` records the final deployment. A second entire full-stack pipeline was not run after those refinements.

## Actual Cedar → Veriq demonstration

Project `veriq-ticket004-final` ran independent Cedar and Veriq APIs, independent PostgreSQL databases, the existing AI worker and one private local model. The transcript records **573 actual HTTP requests**, source/evidence IDs, task IDs, current/historical workspaces, runtime actions and all twelve acceptance checks.

1. An explicit administrator grant established Cedar's verified master identifier namespace for the relevant sources. Actual authorized polling ingested Cedar configuration; structured knowledge became accepted without model extraction. A document independently produced automatic candidate extraction.
2. Cedar generated ten synthetic transfers and route measurements. Deterministic Veriq monitoring created an incident before any complaint.
3. Native in-app and email records reported an affected customer transaction; branch reported the unrelated route. A contact-centre record arrived during inference downtime. Channel identities, exact transaction references and original text were retained.
4. Route/processing/time/identity evidence linked the affected transaction. The unrelated transaction was not added to the affected incident's correlation evidence.
5. Material investigations automatically scheduled revision-pinned analysis. Real HTTP generation receipts exist for extraction, interpretation and analysis. Cedar financial state did not change while AI tasks drained.
6. The API restarted and still reported worker-produced successful inference from durable records. During an intentional model outage, approved polling, accepted knowledge, operational monitoring and investigation access continued. An actual unavailable attempt/retry was recorded; no fabricated output appeared. Worker restart preserved tasks; restarting the model recovered eligible work.
7. An authorized Cedar reconciliation recorded `outcome=completed`, with rationale and no beneficiary-confirmed receipt. Veriq created a new investigation revision, retained the prior revision unchanged, exposed the customer/status contradiction and review requirement, and automatically scheduled new analysis. Publication did not recursively schedule itself.

Representative recorded IDs (complete provenance in the transcript):

| Object | ID |
|---|---|
| Document native source ID | `8f78d925-5f6c-4fcf-8ced-434a65306a28` |
| Completed automatic extraction task | `288a7532-27bc-4d67-8681-ab25c11da474` |
| Completed automatic interaction task | `63b52e5e-bea5-49d7-a1c1-3cc37344ecda` |
| Completed automatic analysis task | `788c31f6-e3de-4851-acc6-486e7e91fbbd` |
| Its pinned investigation revision | `69502d5a-817a-480d-b6ac-83376af2c673` |
| Example supported report evidence | `ea045375-02ea-437a-b31a-537fa13a28f0` |

**Outcomes are not all green model answers.** There were 29 intents: 18 scheduled and 11 blocked because their revisions were superseded. Of 18 automatic tasks, 16 completed and two failed as stale revisions, preventing publication. Seventeen persisted runs record 12 validated candidates, four quarantines and one unavailable attempt. One stale task retains the unavailable attempt; the other failed without publishing a run. These are audit-visible outcomes, not accepted findings or a factual accuracy score.

## Actual runtime and resources

The execution host has 7.44 GiB RAM and an Intel Core i5-1135G7 (8 logical CPUs). Inference used CPU only, one loaded Qwen2.5-0.5B-Instruct Q4_K_M model, one inference slot, four threads, a 4096-token context, 512 maximum output tokens, batch 64 and microbatch 32. No larger model was required. OS protections were retained; the sampler could stop only this isolated model on severe host pressure.

| Component/configuration | Observed |
|---|---|
| Database | PostgreSQL 16.15; separate database users/volumes, migration 0002 |
| Application images | Python 3.12.15, FastAPI 0.158.1, SQLAlchemy 2.0.55 |
| Model runtime | llama.cpp b11799 / 0.7.0-dev / commit `0756e83fc` |
| Model SHA-256 | `c5396e06af294bd101b30dce59131a76d2b773e76950acc870eda801d3ab0515` |
| Resource sampling | 187 samples during the complete workflow |
| Minimum host available RAM | 3.12 GiB |
| Maximum full-memory PSI avg10 | 0.0; emergency stop not triggered |
| Model process RSS / PSS snapshot | 639.02 / 634.89 MiB |
| Model process swap snapshot | 0 bytes |
| Positive HTTP generations | 16; latency 3.836–31.703 seconds, median 20.392 seconds |

The RSS high-water mark is 639.02 MiB for the current process since the intentional outage restart, **not** a measurement of both model-process lifetimes or an isolated cold-load peak. Endpoint latency includes request/prompt/generation work; it excludes queue waiting. These smoke workload timings are not a production throughput benchmark.

Peak container accounting was Cedar DB 28.35 MiB, Veriq DB 35.33 MiB, Cedar API 69.51 MiB, Veriq API 82.29 MiB, worker 77.05 MiB and model 247.96 MiB; simultaneous aggregate peak 522.79 MiB. This is cgroup accounting, **not process RSS or total model memory**: file-backed/shared weight pages may be charged elsewhere. Use the separate process snapshot when interpreting model memory; do not add these metrics as exclusive totals.

Host swap was already in use before this workflow: 1,198,616,576 bytes before and 1,198,145,536 after. Host counters changed by 170 swap-in pages and 61 swap-out pages across all processes. Consequently, no claim of zero host swapping is made. Actual raw measurements, phase caveats and derived metrics are in `stack-resources.json`, `model-process-memory.json` and `summary.json`.

Database credentials were cross-tested and rejected outside their own database; Cedar customer/operator/feed and Veriq application authority remained separate. The model had no published host port and communicated over the internal bank network. Runtime snapshots do not ship secrets. Demonstration services are stopped after verification to release laptop memory; database volumes are preserved (see `cleanup.json`).

## AI quality and retained failures

**The model remains unqualified for institutional reasoning.** The prior 0.5B and 1.5B evaluations each scored 4/10 on the unchanged original gate and 6/12 on the separately frozen held-out set. The historical v0.3.0 live suite had two passes and one extraction failure. Historical data/reports remain intact. Ticket 004 does not rerun or replace those qualification gates.

The current three-pass live smoke suite shows that three narrow operations executed and passed those particular checks against this runtime. It does not establish broad factual correctness, fix the historical failure, or authorize accepting AI-extracted knowledge. Schema validity, citation existence, narrow support verification, candidate status, reviewed acceptance and factual qualification remain separate concepts. Four outputs were quarantined in the larger pipeline itself.

Support verification is a bounded deterministic grammar/catalog, not general semantic entailment. Small-model prompts cannot compensate for unsupported grammars. Unsupported relationships, missing references and financial contradictions remain rejected/quarantined or explicitly reviewable. Accepted structured configuration and authoritative status come from deterministic authorized source rules; AI cannot alter Cedar banking state or approve institutional knowledge.

An initial full-stack harness failure is retained in `http-transcript-initial.json` and `full-stack-tests-initial.xml`: the harness used the wrong reconciliation field before being corrected to Cedar's existing `outcome` and required rationale. Its resource samples are also retained. Initial worker readiness/shutdown issues were fixed by the existing API health dependency and graceful worker termination. Passing runs do not erase the failed run.

## Identity compatibility and limitations

Migration preserves stored UUIDs, source payloads/digests, evidence IDs, review decisions and historical investigation revision JSON. Real seeded Alembic 0001→0002 verification includes a non-derived stored legacy UUID. Fresh PostgreSQL deployment and metadata checks passed. A nonempty production PostgreSQL upgrade was not performed or certified.

Independent namespaces isolate new equal native strings. Shared namespaces need approved identifier authority; accepted mappings require bound, type-compatible identities and evidence from both sides. Ambiguous legacy merged identities remain review-marked. Splitting old shared UUIDs, reassigning an existing source namespace, provisioning orphan operational bindings and cross-namespace transaction/customer reconciliation require administrator-reviewed migration; they are not automatic screen actions. No model similarity merge is allowed.

## Frontend delivery and remaining boundaries

The v0.4.0 contract ZIP contains both OpenAPI documents, preserved versioned events/old contracts, new authority/policy schemas, 26 actual synthetic response examples, role/screen mappings, async polling guidance, change notes and the explicit quality notice. Existing v0.3.0 API routes and required fields are preserved. Automatic work is the normal path; authorized manual reprocessing remains available. Completed, candidate, quarantined and reviewed/accepted states are distinct.

Remaining limitations:

- Institutional extraction accepts the existing narrow evidence grammar; arbitrary prose, OCR, PDFs and multilingual institutional semantics are not generally supported. Source assertion truth still requires approved authority/review.
- Actor credentials remain static deployment configuration; SSO, hot actor revocation, managed secret rotation, TLS/retention/privacy controls and complete enterprise policy administration remain deployment work. Source authorization is dynamic and rechecked.
- Long-history status scans, pagination, production load/retention tests, bank HA and nonempty production migration are unqualified. Multiple workers share leases/concurrency control but do not imply multiple models must be loaded.
- No browser secret provisioning, ambiguous identity repair UI, SSE/WebSocket status stream, production email/telephone connector or actual frontend/Figma integration is supplied.
- Automatic triggers cover authorized persisted documents/interactions and material investigation revisions, including deterministic operational/reconciliation changes. Unregistered external feeds, unsupported source grammars, legacy opt-out sources and policies explicitly disabled by an administrator do not auto-process. Same-bucket low-level measurements intentionally do not each create an AI analysis. Full required contradiction sets that exceed the budget are explicitly blocked.
- Model unavailability can produce retryable/unavailable or exhausted failed tasks; stale/revoked inputs require new eligible work or authorized reprocessing. External inference can execute again after a crash; atomic domain publication prevents duplicate committed effects, not exactly-once model execution.
- Production can select another bank-approved local runtime/model through the existing task interface and endpoint/model/allowlist configuration, with a new model configuration version and independent qualification. It must preserve the structured contracts and authority checks. No cloud AI dependency is mandatory; see the existing Ticket 003 runtime portability evidence and the current runbook.

All required Ticket 004 acceptance tests passed within these stated boundaries. This is a verified development release, not bank production readiness or model certification.
