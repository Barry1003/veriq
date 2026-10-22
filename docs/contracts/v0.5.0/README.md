# v0.5.0 frontend integration contracts

For the live-demo setup extensions, use [LIVE-DEMO.md](../../../server/platform/contracts/LIVE-DEMO.md) and its current additive OpenAPI; the original v0.5.0 specification below remains a compatibility baseline.

The single authoritative contract set is versioned with the backend in [`server/platform/contracts/`](../../../server/platform/contracts/README.md). This directory is a discoverability index, not a duplicate copy.

- [Veriq v0.5.0 OpenAPI](../../../server/platform/contracts/api/veriq-v0.5.0.openapi.json)
- [Unchanged Cedar v0.4.0 OpenAPI](../../../server/platform/contracts/api/cedar-v0.4.0.openapi.json)
- [Adaptive screen/API mapping and permissions](../../../server/platform/contracts/SCREENS-v0.5.0.md)
- [Schema index](../../../server/platform/contracts/schemas/), including choice, assessment input and published assessment contracts
- [Adaptive examples with explicit real-model versus controlled-double provenance](../../../server/platform/contracts/examples-v0.5.0/README.md)
- [Changes](../../../server/platform/contracts/CHANGELOG-v0.5.0.md) and [AI qualification notice](../../../server/platform/contracts/AI-QUALITY-NOTICE.md)
- [Backend startup and authentication](../../../server/README.md)

Use the real `/v1/...` paths and separate application user credentials. Source/feed/simulator/database/model secrets remain server-only. Browser CORS configuration does not grant authorization. The previous frontend placeholder `/api/dashboard/summary` is not implemented by this backend; existing frontend types/adapters remain unchanged and need a separately scoped integration. Keep `NEXT_PUBLIC_DATA_SOURCE=mock` until that mapping is implemented. Do not invent a compatible backend endpoint.

Default backend ports are Veriq 8100 and Cedar 8101; model 8181. Automatic adaptive investigation requires explicit `AI_INVESTIGATION_MODE=adaptive` in API and worker. A completed task, valid JSON or a controlled example does not establish factual correctness or qualification.
