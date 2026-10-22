# Veriq Platform — functioning foundation v0.1.0

Veriq is a bank-controlled institutional intelligence backend. Cedar is a separate synthetic bank backend. This fresh implementation follows the supplied VERIQ-ARCH-001 directive. It does not reuse the prior Veriq repository. All demonstration data is synthetic.

Implemented: authorized source registration and push/pull ingestion; immutable source evidence; structured knowledge acceptance and reviewed AI candidates; typed institutional context with effective/knowledge-time queries and preserved conflicts; independent operational detection; multi-channel customer processing; evidence-based correlation; durable investigation revisions, review and audit; a real configurable local inference adapter with validated task schemas. Cedar maintains its own balances, reservations, processing paths, statuses, reconciliation evidence and source feed.

## Run locally

Requires maintained Python 3.12+ and uv. Tested here with Python 3.14.7. From this repository directory:

```bash
uv sync --frozen
uv run python -m scripts.bootstrap
```

In separate terminals:

```bash
uv run python -m scripts.run cedar
```

```bash
uv run python -m scripts.run veriq
```

Each runner migrates its own database before starting. Cedar listens on `127.0.0.1:8101`; Veriq on `127.0.0.1:8100`. Both have `/health`, `/ready`, `/openapi.json`, and interactive `/docs`. The generated static contracts can be used offline. Swagger's default interactive documentation loads CDN assets; the APIs and exported contracts do not depend on them.

Run the actual HTTP demonstration:

```bash
uv run python -m scripts.demo --export-examples
```

This creates 12 transfers, injects a development-only gateway condition, submits four customer-channel reports, pulls actual Cedar source records, checks evidence-supported correlation, calls the inference interface, reconciles a pending transfer in Cedar, and verifies a new Veriq revision. It also verifies that the Veriq administrator token cannot access Cedar banking data. Repeating the command adds another synthetic batch; it does not reset bank state. Use the seed route configuration for this command; the domain APIs independently support changing routes.

`var/runtime.json` contains randomly generated development credentials, connector grants, and settings. It is owner-readable only and Git-ignored. The applications have different credential sets. `veriq_admin` administers Veriq; `cedar_operator` handles bank operations; `cedar_simulator` alone controls scenarios; `customer1` and `customer2` are bound to C1 and C2; `cedar_feed` can only read the authorized feed. Application defaults have **no usable credentials**. Do not copy private `var/` files into the frontend or a public package.

The bootstrap preserves existing credentials. To create a separate environment, copy the source package to a new directory and bootstrap there. Override local database URLs, CORS origins and inference settings with environment variables before starting a runner.

## Verify

```bash
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
uv run python -m scripts.export_contracts
```

The latest executed suite contains 56 passing tests. [Verification report](docs/implementation/verification.md) distinguishes tests from live execution and unverified infrastructure. Tests exercise domain behavior and HTTP contracts; mocked model replies exist only in `tests/test_inference.py`.

## Deployment and local AI

For PostgreSQL-backed deployment, first bootstrap the private env files, then:

```bash
docker compose -f deploy/compose.yaml up --build
```

The Compose configuration has independent PostgreSQL databases and credentials, an internal bank network, loopback-only application ports, and no cloud AI dependency. Container builds require a package/image mirror or internet access during provisioning. The actual Docker/PostgreSQL deployment has not been executed in this environment; neither runtime was available. See [deployment notes](docs/implementation/deployment.md).

Set `LOCAL_AI_URL=http://127.0.0.1:11434/v1` and `LOCAL_AI_MODEL` to an installed, bank-approved local model identifier, then restart Veriq. `LOCAL_AI_ALLOWED_HOSTS` controls endpoint hostnames. A remote bank-internal hostname must be explicitly allowed. [AI task and runtime guide](docs/implementation/local-ai.md) documents real inference checks, structured output support, and honest failure states. No model server was running here, so live model execution remains unverified.

## Handoff and structure

[Frontend handoff for Usaamah](contracts/README.md) includes versioned OpenAPI, event/task schemas, actual synthetic example responses, endpoint permissions and integration instructions. [Engineering execution log](docs/implementation/execution-log.md) records progress and remaining work. [Architecture decisions](docs/decisions/001-foundation.md) explain identity, history, persistence, permissions and inference boundaries.

```text
apps/cedar/backend/       Cedar API and independent banking domain
apps/veriq/backend/       Veriq API, knowledge, ingestion, detection, investigations, inference
shared/                   Versioned source contracts, auth primitives and persistence helpers
contracts/                OpenAPI v0.1.0, source v1 schemas, synthetic HTTP examples
migrations/               Alembic migrations, run separately against each application DB
scripts/                  Private bootstrap, independent runners, real HTTP demo, exports
fixtures/                 Synthetic fixture explanation
deploy/                   Container and PostgreSQL Compose configuration
tests/                    Domain, adversarial, authorization, adapter and integration tests
docs/                     Decisions, deployment, verification and handoff notes
```

This is an inspectable foundation, not production-certified banking software. Remaining work includes live model evaluation, PostgreSQL deployment verification, institutional SSO and secret lifecycle integration, domain-specific relational tables/indexes as scale increases, scalable ingestion scheduling and replay, granular policy labels, retention workflows, reviewed identity reconciliation across separate bank identifier namespaces, service-specific detectors, and full onboarding/impact-management experiences. The frontend remains Usaamah's workstream.
