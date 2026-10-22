# Integration notes

The applications select `mock` or `api` through `NEXT_PUBLIC_DATA_SOURCE` and use `NEXT_PUBLIC_API_BASE_URL` for the API adapter. Service interfaces remain stable so UI code does not import mock records directly.

Implemented contracts are now indexed in [v0.5.0 contracts](../contracts/v0.5.0/README.md). Existing frontend adapters remain unchanged and are not yet a verified match for the real backend. Follow the [API integration notes](../api-integration.md) before switching from mock mode. Backend and AI ownership belongs to Daniel; frontend and design belongs to Usaamah.
