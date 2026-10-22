# Veriq and Cedar workspace

This repository contains two independent Next.js applications:

- `client/veriq/` — Veriq Intelligence Workspace and Administration.
- `client/cedar/` — Cedar customer banking and staff operations.

Shared design-system foundations live under `client/shared/design-system/`. The restricted future Simulation Console is documented as a development-only Cedar/Veriq boundary; it is not a customer-facing feature. See `docs/` for architecture, design workflow, and integration notes.

The complete runnable FastAPI backend and local AI project lives in **[`server/platform/`](server/platform/README.md)**. Cedar and Veriq are separate runtime applications with separate databases and credentials. `server/src/` is an unused historical placeholder, not another implementation. Daniel owns backend and AI; Usaamah owns frontend and design.

- [Backend installation, migrations, API/worker startup, ports and actual-model reproduction](server/README.md)
- [Versioned API contracts and frontend integration guidance](docs/contracts/v0.5.0/README.md)
- [Local rehearsal setup and operation](server/platform/docs/runbook.md)

AI outputs require evidence verification and human review. The bundled small local model remains unqualified for adaptive reasoning.
