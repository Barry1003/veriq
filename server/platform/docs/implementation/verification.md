# Executed verification — 2026-10-21

## Automated tests

Final command:

```bash
.venv/bin/pytest -q --junitxml=docs/implementation/pytest-results.xml -o faulthandler_timeout=20
```

Actual final result: **56 passed, 1 warning in 18.31 seconds**. The warning is Starlette's deprecation of its legacy httpx test-client transport; it does not indicate a domain failure. The machine-readable JUnit report is included alongside this document.

Coverage includes:

- Authenticated structured acceptance; source provenance; stable identities after renaming; ambiguous names.
- Institutional effective time and knowledge time; review history; expiry; multiple-source and same-source/same-time conflicts.
- Duplicate source records and mutated identities; source grants, contextual authority and classification.
- Atomic rollback/error reporting and pull-page cursor behavior; stale concurrent-pull rejection; durable DB reopening.
- Alembic fresh upgrade, metadata check, downgrade and upgrade round-trip on SQLite.
- Independent monitoring before customer reports; minimum sample and baseline increase; isolation between monitoring sources.
- Customer-triggered investigation without an incident; channel preservation; recurring reports without invented common cause.
- Route/gateway/time/ownership-based correlation; rejection of wrong gateway, old observations and reports before transactions.
- Later status revisions, contradictory customer reports, same-version authoritative status conflicts and contested structural context.
- Separate service-inventory retrieval, evidence lineage and restricted-classification propagation.
- Transfer idempotency, balance/reservation behavior, insufficient funds, concurrent overspending prevention, authorized settlement/release and simulator isolation.
- Separate applications connected through actual HTTP contracts in TestClient integration, route-change history, and unchanged recorded transaction paths.
- Scope, role, customer and clearance restrictions; no unauthorized evidence entering a model.
- Real adapter serialization with explicit test doubles, schema failures, invented identifiers/citations, candidate acceptance, semantic quarantine, runtime failure and inability of unreviewed candidates to reserve authoritative identities.

## Static checks and contracts

`ruff check .` passed; `ruff format --check .` passed. Versioned OpenAPI export executed successfully: 28 Veriq operations across 27 paths and 13 Cedar operations across 11 paths. Exported task/event schemas are generated from runtime Pydantic contracts. `git diff --check` completed without findings (the fresh repository has no commit history).

## Actual network execution

Two independent Uvicorn processes run Cedar and Veriq on loopback ports 8101 and 8100 with separate migrated SQLite databases. `python -m scripts.demo --export-examples` exercised actual network requests, not an in-process transport or a dashboard fixture. It generated 12 synthetic transfers and four interactions, ingested the four authorized source streams, verified meaningful correlation, recorded unavailable inference, reconciled one transfer in Cedar, verified a new Veriq revision and preserved the earlier revision. It confirmed that a Veriq token receives 401 from Cedar's account endpoint.

The captured result and response samples are in `contracts/examples/*.synthetic.json`; these are synthetic data obtained from actual APIs. Previous synthetic local demo databases were archived privately under Git-ignored `var/` before the final fresh-data execution. Runtime state is intentionally excluded from distributable archives.

## Not executed successfully / unavailable

- Live model inference: local Ollama server was not running. The smoke command recorded all three tasks as failed with `InferenceUnavailable` because no endpoint/model was configured. The actual HTTP application demo persisted an unavailable inference run. No mocked model test is represented as live inference.
- Docker Compose and PostgreSQL-specific execution: neither executable/runtime was available. Configuration, psycopg dependency and PostgreSQL locking paths exist; actual PostgreSQL integration and concurrency remain to be verified on suitable infrastructure.
- No production load test, certification, penetration test, institutional SSO integration or real banking-system integration was performed.

The sandbox blocked the async test client's local thread/socket mechanism; the passing test runs used approved local socket access. Dependency installation likewise required approved network access. No approval rejection remains outstanding.
