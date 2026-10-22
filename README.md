# Veriq and Cedar workspace

This repository contains two independent Next.js applications:

- `client/veriq/` — Veriq Intelligence Workspace and Administration.
- `client/cedar/` — Cedar customer banking and staff operations.

Shared design-system foundations live under `client/shared/design-system/`. The restricted future Simulation Console is documented as a development-only Cedar/Veriq boundary; it is not a customer-facing feature. See `docs/` for architecture, design workflow, and integration notes.

The complete runnable FastAPI backend and local AI project lives in **[`server/platform/`](server/platform/README.md)**. Cedar and Veriq are separate runtime applications with separate databases and credentials. `server/src/` is an unused historical placeholder, not another implementation. Daniel owns backend and AI; Usaamah owns frontend and design.

- [Backend installation, migrations, API/worker startup, ports and actual-model reproduction](server/README.md)
- [Versioned API contracts and frontend integration guidance](docs/contracts/v0.5.0/README.md)
- [Publication provenance and checks](docs/backend-publication-v0.5.0.md)
- [Ticket 005 results and limitations](server/platform/docs/implementation/ticket005/REPORT.md)

**v0.5.0 is an experimental engineering baseline.** The original non-live suite passed 153 tests. Actual Qwen2.5-1.5B testing passed **0/4 required adaptive reasoning scenarios**; the model remains unqualified. This publication supports CPU comparison with a stronger approved local model on Usaamah's 32 GB laptop. It does not declare either model qualified or change the reasoning implementation. No mandatory cloud AI dependency is introduced.
