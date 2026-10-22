# Ticket 002 handoff — Veriq v0.2.0

**Real local AI, workflow integration and PostgreSQL deployment are verified. Model quality is not acceptable: the quality gate failed at 3/10 cases.** This release continues the approved repository and architecture. It is not a qualified production intelligence model.

## Delivered and actually executed

- **Model/runtime:** [Qwen2.5-0.5B-Instruct Q4_K_M](https://ollama.com/library/qwen2.5:0.5b) from Ollama's official registry, executed by [llama.cpp b11799](https://github.com/ggml-org/llama.cpp/releases/tag/b11799) / 0.7.0-dev, commit `0756e83fc`, on CPU. The full published model and runtime-package SHA-256 hashes verified before execution. No hosted model API, mocked transport or deterministic classifier substituted for a live model response. The initially attempted 1.5B download was incomplete and is not claimed as an executed model.
- **Three real tasks:** document extraction produced a source-linked candidate; a synthetic authorized review accepted the checked route/gateway assertion. Customer interpretation persisted alongside the original interaction with a durable inference-run ID. Investigation analysis cited authorized evidence, stayed a candidate and pinned its revision. `live-task-executions.json` contains the actual successful PostgreSQL-backed API run outputs and metadata; native smoke results and failed initial attempts are retained separately.
- **Financial boundary:** the full HTTP workflow compared Cedar's state before and after AI. It remained unchanged. Only the later authorized Cedar reconciliation changed the recorded financial status; Veriq then created a new investigation revision and preserved prior findings/reviews. The AI's wrong customer category remained visible and did not replace the deterministic category or source reference.
- **Channels:** in-app message, email message, contact-centre transcript and branch visit have distinct native request schemas, adapter identities, immutable native records, normalized provenance and source/cursor/activity. They share the authorized Cedar HTTP feed transport. They do not claim real SMTP, telephone or external branch-system connectivity. Ordinary customers cannot impersonate the bank-operated native recorders.
- **Deployment:** executed the supplied Compose topology with Podman Compose, PostgreSQL 16.15, independent DB credentials and actual migrations. Both DBs reported migration `0001` and zero metadata differences. Cross-database credentials were rejected. The model ran inside the internal bank network with no host-published model port. All three model tasks succeeded there. Source-secret, feed/account and customer/channel permission probes passed. Docker Engine itself was not used.
- **Tests:** 63 regression tests and 3 separate real-model integration tests passed. The original 56 tests remain in the suite. JUnit files record exact results. Ruff lint/format checks passed. Tests with doubles remain explicitly separate from the opt-in live-model tests.
- **Contracts:** current versioned OpenAPI, normalized/native/task schemas, real synthetic responses and concise route-to-screen mapping are in `contracts/`. v0.1.0 API paths and required request fields remain. New native-channel events explicitly use source schema v1.1; old v0.1.0 consumers must be upgraded before enabling them. Existing shared customer-service behavior remains available. Source registration is backend-only until browser-safe secret provisioning exists.

## Actual quality result

The frozen ten-case evaluation produced 9 structurally valid/policy-validated outputs but only 3 quality passes. The initial run was 0/10 and remains available. Failures include invented relationships, a successful document-injection attack on candidate extraction, missing references, misclassification and missed status conflicts. The longer workspace initially hit its output budget and was quarantined; bounded response generation fixed workflow completion without accepting truncation. Read `QUALITY.md` and every raw output before assessing model capability.

Passing schema/citation checks is not factual correctness. The code protects authority and lineage; it does not make this small model's reasoning trustworthy. Model qualification remains a critical next action.

## Files to inspect

| Required handoff | Artifact |
|---|---|
| Updated source | Existing `veriq-platform` repository and `veriq-platform-source-v0.2.0.zip` |
| Actual model/runtime | `deploy/local-ai-small-manifest.json`, `deployment-results.json`, `RUNBOOK.md` |
| Three live task executions | `live-task-executions.json`; current `contracts/examples-v0.2.0/*-run.synthetic.json` |
| Quality dataset/results | `evaluations/cases.json`, `quality-results.json`, `QUALITY.md`, preserved earlier evaluations |
| Tests | `regression-tests.xml`, `live-model-tests.xml`, `tests/test_live_ai.py`, additional channel/lineage/compatibility tests |
| Real HTTP transcript | `http-transcript.json`; retained failed attempts clearly named separately |
| Actual deployment checks | `deployment-results.json`; `postgres-demo-result.json` for the earlier deterministic PG demonstration |
| Frontend package | `veriq-frontend-contracts-v0.2.0.zip`, `contracts/README.md`, `SCREENS-v0.2.0.md`, `CHANGELOG-v0.2.0.md`, quality notice |
| Code ownership/map | `AUDIT-MAP.md`; implementation is disclosed as AI-assisted |

The current running stack exposes Cedar at `http://127.0.0.1:8201` and Veriq at `http://127.0.0.1:8200`. The exact commands to provision, reproduce all three tasks, run the dataset, execute Compose, verify source/database/application isolation and package artifacts are in `RUNBOOK.md`. Private generated credentials, runtime DBs, weights and downloaded binaries are excluded from distributable archives.

## Precise next actions and limits

1. Qualify a more capable bank-approved local model using the supplied pinned alternative procedure and the unchanged evaluation cases, then expand held-out semantic/source-entailment testing. No unexecuted model is represented as passing. Keep candidate-only acceptance and human review.
2. Give Usaamah the contract package and an appropriate **application-specific user credential privately**. Never give the browser source-ingestion, feed, simulator or database secrets. Implement server-side secret provisioning before a browser onboarding action.
3. Connect actual institution-approved channel transports when available; current adapters and channel feeds are synthetic and operational, not external email/telephony integrations.
4. Complete production identity/credential lifecycle, finer-grained policy, TLS/retention and deployment hardening, resource/load testing and image pinning. Separate richer impact/resolution and cross-namespace identity workflows remain as identified in the foundation handoff. No production security certification or event-rule approval is claimed.

Synthetic review actions in the transcript were automated fixture checks under an authorized development credential, not a claim that a human approved real bank knowledge. The source, actual execution records, model weaknesses and AI-assisted development provenance are preserved for honest audit/disclosure.
