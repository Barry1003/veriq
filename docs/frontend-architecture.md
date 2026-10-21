# Frontend architecture

## Applications

`client/veriq` and `client/cedar` are separate Next.js applications. Each owns its routes, components, features, mock datasets, services, and configuration. They may share only deliberately stable contracts under `shared/`.

The `src/app` directory contains route entry points. Feature-specific UI belongs under `src/features`; reusable presentation belongs under `src/components`. Empty directories are placeholders for future work and should gain files only when a real use case exists.

## Data flow

UI → feature hook/query → service → adapter → data source

Mock records live only in the owning app's `src/data` directory. Components must not import mock fixtures directly. Services select the mock or API adapter from `NEXT_PUBLIC_DATA_SOURCE`.

Set `NEXT_PUBLIC_DATA_SOURCE=api` only when the corresponding backend contract exists. `NEXT_PUBLIC_API_BASE_URL` is a base URL, not a claim that an endpoint has already been implemented.

## Adding mock data

Add a small, synthetic, typed dataset to the owning app's `src/data`, export it through `src/data/index.ts`, and expose it through a service or adapter. Use stable IDs for relationships and never add real customer, credential, or financial information.

## Shared contracts

Cross-application types belong in `shared/types`; API shapes that have been agreed with the backend belong in `shared/contracts`. Do not move application-specific mock records or UI components into `shared`.

## Verification

From each app, run its package-manager-specific `lint`, `type-check`, and `build` scripts. The server directory is outside this frontend architecture and must remain unchanged.
