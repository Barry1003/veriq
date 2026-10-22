# Veriq + Cedar frontend contract package — v0.4.0

Current APIs: `api/veriq-v0.4.0.openapi.json`, `api/cedar-v0.4.0.openapi.json`. Read `SCREENS-v0.4.0.md`, `CHANGELOG-v0.4.0.md` and `AI-QUALITY-NOTICE.md`. Actual exported responses from the verified PostgreSQL/worker/local-model stack are in `examples-v0.4.0/`. Historical v0.1.0/v0.2.0/v0.3.0 snapshots/examples remain clearly versioned.

Normal processing is automatic after authorized ingestion/material revisions. The frontend observes intents, tasks and outcomes; it should not create individual AI requests for every source event. Manual routes remain for authorized reprocessing.

Use application-specific user credentials with the permissions/clearance described in the screen map. Source/feed/simulator/database/model secrets remain backend-only. Event v1.1, native channel inputs and the flexible row envelope are retained. New authority/policy input schemas are under `schemas/`.

No frontend or Figma integration is claimed by this package. Full architecture, migration, actual deployment/resource evidence, regression/live results and remaining limitations are in `docs/implementation/ticket004/` in the source archive.
