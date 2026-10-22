# API integration

Use `NEXT_PUBLIC_DATA_SOURCE=mock` for local development. The authoritative implemented backend paths, schemas, authentication and limitations are indexed in [v0.5.0 contracts](contracts/v0.5.0/README.md). Backend setup is in [server/README.md](../server/README.md).

The existing frontend service adapters and types have not been changed by the backend import. Their placeholder `/api/dashboard/summary` is not a real backend route. Map existing service interfaces to the documented `/v1/...` endpoints in a separate frontend integration change before selecting `api` and setting `NEXT_PUBLIC_API_BASE_URL`. Screens should continue to access services rather than fixtures directly.

Never put source, connector, simulator, database or model credentials in `NEXT_PUBLIC_*` variables. Configure separate application user authorization through the bank's approved authentication flow.
