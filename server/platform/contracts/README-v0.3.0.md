# Frontend handoff — v0.3.0

Current APIs: `api/veriq-v0.3.0.openapi.json`, `api/cedar-v0.3.0.openapi.json`. Historical v0.1.0/v0.2.0 snapshots are preserved. Current event schema remains v1.1; task result schema shapes remain v1.

Read `SCREENS-v0.3.0.md`, `CHANGELOG-v0.3.0.md` and `AI-QUALITY-NOTICE.md` before implementing inference screens. New asynchronous responses are actual task rows; `completed` can have outcome `quarantined`. Never present task completion or schema validity as verified intelligence.

The backend uses bank-provisioned, application-specific user credentials. Source ingestion, feed, database, simulator and runtime secrets remain backend-only. Source-secret provisioning still needs a server-side onboarding flow before a browser can register sources.

Current real synthetic HTTP examples are in `examples-v0.3.0/`. v0.2.0 examples are historical and may contain outputs that the stricter verifier now quarantines. Source authority and exact evidence support are evaluated outside the model.
