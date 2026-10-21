# Frontend architecture

Veriq and Cedar are independent Next.js applications. Routes live in `src/app`, reusable UI in `src/components`, feature code in `src/features`, typed synthetic fixtures in `src/data`, and data access in `src/services`.

The intended flow is UI → feature hook/query → service → mock/API adapter → data source. Components must not import fixtures directly. Both apps default to `NEXT_PUBLIC_DATA_SOURCE=mock`; `api` mode uses `NEXT_PUBLIC_API_BASE_URL` without claiming an endpoint is finalized.

Application-specific records remain in each app. Only genuinely shared types and agreed contracts belong under `shared/`. Never add real customer or banking information to fixtures.
