# Frontend architecture

Veriq and Cedar are independent Next.js applications. Routes live in `src/app`, reusable UI in `src/components`, feature code in `src/features`, typed synthetic fixtures in `src/data`, and data access in `src/services`.

The intended flow is UI → feature hook/query → service → mock/API adapter → data source. Components must not import fixtures directly. Veriq defaults to `NEXT_PUBLIC_DATA_SOURCE=mock`; its implemented live adapters require a server-selected `VeriqApi` and the approved browser session boundary. Cedar uses server-only `CEDAR_DATA_SOURCE=preview|api`. See [API integration](api-integration.md) for configuration, transfer recovery and current authentication blockers.

Application-specific records remain in each app. Only genuinely shared types and agreed contracts belong under `shared/`. Never add real customer or banking information to fixtures.
