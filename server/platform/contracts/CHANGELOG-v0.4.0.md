# v0.3.0 -> v0.4.0

All prior paths/methods and required request fields remain. Versioned v0.3.0 API snapshots and examples are preserved; event v1.1 and existing native/task JSON shapes remain.

New optional source fields: `identity_namespace`, `identity_authority_ref`, `ai_enabled`. New sources default to their own namespace and eligible automatic processing under the deployment policy. Existing legacy sources are not silently opted into AI. An approved shared identifier domain is required before treating IDs from different sources as equivalent; the old global raw-ID assumption is intentionally removed. Clients must use returned canonical IDs, not calculate them.

Adds identity authority/mapping/reconciliation views, dynamic source authorization and processing policy, automatic intent ledger and per-evidence processing views. Existing task APIs now expose origin, scheduling identity, policy/model versions and reprocessing lineage. Active duplicate processing is reused; authorized reprocessing after completion may create a new linked task.

Ingestion/material revisions create durable intents atomically. Normal lifecycle processing does not require frontend calls to manual AI endpoints. A queue-full condition defers the intent instead of losing the source. The worker can poll deployment-approved feeds independently of inference. Source revocation, grant changes and stale investigation revisions block publication.

Runtime status adds durable worker/task/run state and an explicit unqualified model state. The legacy `verified_tasks` summary now also comes from persisted HTTP generation receipts rather than API-local activity. Success, completion, supported candidate, quarantine and reviewed acceptance are not interchangeable.

Legacy UUIDs and stored revision references are preserved by migration 0002. Ambiguous old global identities are flagged; automatic splitting/reassignment and unbound operational-reference reconciliation remain administrator work. Read the identity migration report in the source package before upgrading populated databases.

Live integration passed three narrow checks in this run. The earlier live extraction failure and frozen 4/10, held-out 6/12 support/correctness gates remain historical evidence and are not relabeled as fixed or rerun qualification. Both evaluated model configurations remain unqualified.
