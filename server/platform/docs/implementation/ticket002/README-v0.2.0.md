# Veriq Platform v0.2.0 — Ticket 002

This extends the approved v0.1.0 repository. Cedar remains an independent synthetic bank; Veriq remains the bank-controlled intelligence application. There is no replacement architecture or competing application.

**Real local inference now runs. Model quality remains inadequate for production use.** Read the current [Ticket 002 handoff](docs/implementation/ticket002/REPORT.md), [quality report](docs/implementation/ticket002/QUALITY.md), and [exact reproduction runbook](docs/implementation/ticket002/RUNBOOK.md). Historical v0.1.0 verification and documentation remain in `docs/implementation/` and are not current deployment-status claims.

Implemented additions include three real local-model tasks with durable lineage; candidate-only document extraction and review; traceable interaction interpretation; evidence-scoped investigation analysis; four distinct synthetic customer-channel adapters with native schemas and independent source/cursor/provenance; PostgreSQL-backed Compose execution; and versioned frontend contracts. Deterministic detection/correlation and Cedar's financial authority remain intact.

## Start the verified local deployment

Requires Linux x86-64, Python 3.12+, uv, and Podman or Docker. From this directory:

```bash
uv sync --frozen
uv run python -m scripts.bootstrap
uv run python -m scripts.bootstrap --upgrade-channels
uv run python -m scripts.setup_local_ai --manifest deploy/local-ai-small-manifest.json --workers 4
export PODMAN_COMPOSE_PROVIDER="$PWD/.venv/bin/podman-compose"
export CEDAR_HOST_PORT=8201
export VERIQ_HOST_PORT=8200
podman compose -f deploy/compose.yaml -f deploy/compose.ai.yaml up --build --force-recreate -d
uv run python -m scripts.ticket002_demo --cedar http://127.0.0.1:8201 --veriq http://127.0.0.1:8200
uv run python -m scripts.verify_deployment
```

The executed runtime is llama.cpp b11799 with the pinned Qwen2.5-0.5B-Instruct Q4_K_M artifact from Ollama's official registry. Model weights are downloaded and hash-verified into Git-ignored `var/`; no weights or generated credentials are shipped in the source archive. Veriq reaches the model inside the private container network; no model port is published to the host. The application ports bind host loopback. The Compose path was executed with Podman and PostgreSQL 16.15; Docker Engine itself was not tested.

The small model is a proof of execution. Failed semantic evaluation cases, initial failed runs and quarantined outputs are retained. A schema-valid candidate is not an accepted institutional fact, verified cause or financial outcome. The backend preserves those distinctions even when the model is wrong.

## Independent developer runners

```bash
uv run python -m scripts.run cedar
uv run python -m scripts.run veriq
```

These retain the v0.1.0 developer workflow with separate SQLite databases and default ports 8101/8100. Configure a bank-local compatible model endpoint via `LOCAL_AI_URL` and `LOCAL_AI_MODEL` for native inference. The runbook gives the tested native llama.cpp command and separate real-model test/evaluation procedure.

## Tests and frontend handoff

```bash
uv run pytest -q -m 'not live_ai'
uv run ruff check .
uv run ruff format --check .
uv run python -m scripts.export_contracts
uv run python -m scripts.package
```

[Frontend contract guide](contracts/README.md), [route-to-screen mapping](contracts/SCREENS-v0.2.0.md), and [version changes](contracts/CHANGELOG-v0.2.0.md) identify implemented and unsupported actions. Existing v0.1.0 paths/required request fields are retained; new native-channel events explicitly use source schema v1.1. Browser credentials are application-specific. Source registration secrets, feed tokens, simulator credentials and DB passwords remain server-side.

Core code remains under `apps/cedar/backend/`, `apps/veriq/backend/`, and `shared/`; contracts under `contracts/`; migration/deployment under `migrations/` and `deploy/`; actual tests under `tests/`; the frozen AI dataset under `evaluations/`. [Audit code map](docs/implementation/ticket002/AUDIT-MAP.md) identifies extraction, customer analysis, detection, correlation, investigation, inference validation and authority enforcement.

Further model qualification, institutional SSO/secret lifecycle, fine-grained policies, TLS/retention/deployment hardening and real external customer-channel transports remain work. This is synthetic, AI-assisted development with explicit limitations, not production-certified banking software. Usaamah retains frontend ownership.
