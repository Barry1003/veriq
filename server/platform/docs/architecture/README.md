# Domain architecture

Cedar owns synthetic bank truth and produces a transactional source feed. Veriq independently acquires authorized records. There are no cross-database queries or Veriq banking mutations.

1. **Contracts and ingestion:** schema-validated, institution/environment-scoped envelopes enter under a source-specific grant. Source identities are immutable, reception times are persisted, and page cursors commit atomically with evidence processing.
2. **Knowledge:** authenticated structured inventory creates accepted snapshots; model extraction creates reviewable assertions. Typed entity relationships, provenance, effective time, knowledge time and competing claims remain explicit.
3. **Operational intelligence:** route/gateway timeout samples feed deterministic detectors. Measurements can trigger suspected incidents and investigations without customer reports.
4. **Customer intelligence:** channel-normalized reports retain original text and optional verified references. Rules identify reported categories and recurring patterns; they do not infer common technical causes from similar language.
5. **Institutional correlation and investigation:** actual transaction identity/ownership, route, gateway, time and accepted historical context bound correlation. Bounded outgoing structural traversal also retrieves relevant gateway/service dependencies, including their evidence and permissions. Findings, contradictions, hypotheses, unknowns, recommendations and timelines are persisted as immutable revisions.
6. **Inference:** an independent local-model adapter processes explicitly authorized task inputs. Schema, reference, citation and semantic validations bound its output. Candidates cannot mutate authoritative financial records or reserve institutional identities ahead of review.
7. **Review and access:** bank-controlled roles and classifications apply through retrieval, context, workspace construction and inference. Reviews pin specific revisions and changes are audited. A new revision requires fresh review.

The detailed decisions and practical limits are in `docs/decisions/001-foundation.md`. Module responsibilities are visible directly under `apps/veriq/backend/` and `apps/cedar/backend/`; HTTP routing is separated from domain services and model invocation.
