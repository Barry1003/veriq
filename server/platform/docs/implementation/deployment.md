# Running and deployment

## Local databases

`python -m scripts.run cedar` and `python -m scripts.run veriq` load their own generated settings and run Alembic separately. Default databases are `var/cedar.db` and `var/veriq.db`. Database URLs can be overridden with `CEDAR_DATABASE_URL` and `VERIQ_DATABASE_URL`, including PostgreSQL URLs with the `postgresql+psycopg://` driver. No schema is silently created by importing an API module. `/ready` fails until the schema exists.

For direct ASGI hosting, provision credentials and installation scope yourself, migrate, then start the relevant app:

```bash
DATABASE_URL=sqlite:///var/cedar.db uv run alembic upgrade head
DATABASE_URL=sqlite:///var/veriq.db uv run alembic upgrade head
```

Use `uv run python -m scripts.run cedar` and the corresponding Veriq runner for the generated configuration. A direct `uvicorn apps.veriq.backend.api:app` command reads the environment only and does not automatically load private bootstrap files.

## Environment variables

| Name | Meaning |
|---|---|
| `INSTALLATION_SCOPE` | Exact `institution:environment`; default `cedar:development` |
| `CEDAR_DATABASE_URL`, `VERIQ_DATABASE_URL` | Independent application DB URLs |
| `DATABASE_URL` | Alembic CLI migration target only |
| `AUTH_CREDENTIALS` | JSON map of bearer tokens to subject/scope/roles/clearance/customer_id; separate per app |
| `CEDAR_SIMULATOR_ENABLED` | `true` enables scenario endpoints for simulator role; default disabled |
| `CEDAR_CONNECTORS` | Veriq JSON map source ID to deployment-managed URL, Cedar read token, source ingestion secret |
| `CONNECTOR_ALLOWED_HOSTS` | Comma-separated bank-approved feed hosts; defaults loopback and `cedar` |
| `CORS_ORIGINS` | Exact allowed frontend origins; credentials are bearer headers, no wildcard configured |
| `LOCAL_AI_URL`, `LOCAL_AI_MODEL` | Bank-local compatible API base and installed model |
| `LOCAL_AI_ALLOWED_HOSTS` | Approved model hosts; defaults loopback and `ollama` |

## Compose

Run bootstrap before `docker compose -f deploy/compose.yaml up --build`. It creates owner-only env files for two PostgreSQL services and separate application credential maps. Containers run the application as UID 10001. Database ports are not exposed. API ports bind host loopback. Runtime services share an internal Docker network. Images/package downloads happen at provisioning, and bank environments can use approved mirrors. Deploy inference inside the same approved network (or another approved reachable bank network); set a resolvable bank host and explicit allowlist. Host-loopback inference from inside a container points to that container, so do not use the host's `127.0.0.1` URL for a container deployment.

This synthetic Compose configuration deliberately enables the simulator in Cedar's generated development env file. Set `CEDAR_SIMULATOR_ENABLED=false` and provision actual institution roles before any deployment beyond synthetic development. The bootstrap simulator token is isolated from ordinary banking and Veriq credentials.

Production work remains: institutional identity provider/SSO and credential revocation/rotation, TLS termination, DB/backup encryption and restoration drills, fine-grained policy labels, request/rate limits and resource budgets, durable ingestion scheduling/backpressure, retention/privacy controls, operational alerting and live model validation. These are actual unfinished integrations, not security certifications. Current code accepts only authorized synthetic-development use.

Docker and PostgreSQL executables were not available in the implementation environment. Compose and PostgreSQL lock behavior are configured but not claimed tested. SQLite migrations, API behavior, independent-process HTTP and concurrent account reservation were executed.
