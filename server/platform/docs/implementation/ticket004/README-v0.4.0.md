# Veriq + Cedar — v0.4.0

Automatic, auditable source-to-intelligence processing, continuing the existing v0.3.0 application. Authorized documents, customer interactions and material investigation revisions now schedule durable work automatically. Deterministic knowledge, monitoring and investigations remain operational when local inference is unavailable. Source namespaces, explicit identity mappings, legacy compatibility and execution/publication authority checks protect identity and evidence history.

- [Ticket 004 implementation, measurements and limitations](docs/implementation/ticket004/REPORT.md)
- [Reproducible low-resource runtime](docs/implementation/ticket004/RUNBOOK.md)
- [Architecture and requirement map](docs/implementation/ticket004/ARCHITECTURE.md)
- [Identity and migration contract](docs/implementation/ticket004/IDENTITY-MIGRATION.md)
- [Exact tests and evidence](docs/implementation/ticket004/TESTS.md)
- [Frontend handoff for Usaamah](contracts/README.md)

Actual checks: **123 non-live tests, one complete HTTP/PostgreSQL/worker/local-model workflow, and three live smoke tests passed**. The full workflow used one Qwen2.5-0.5B Q4_K_M CPU model, separate Cedar/Veriq databases and private inference. It exercised proactive incidents, native channel records, negative correlation, API/worker restart, inference outage and later authorized reconciliation without manual AI requests.

**AI remains unqualified.** Earlier 0.5B/1.5B results (4/10 original gate, 6/12 held-out, one live extraction failure) remain preserved. Current smoke passes do not replace qualification. Model outputs remain candidates or quarantines; AI cannot approve knowledge or change Cedar financial state.

```bash
uv sync --frozen
.venv/bin/pytest -q -m 'not live_ai and not full_stack'
```

Follow the runbook for the isolated, resource-conscious full stack. Credentials, databases, model weights and binaries are excluded from the release. Historical v0.1.0–v0.3.0 reports/contracts remain versioned. No mandatory cloud AI, frontend/Figma integration or production bank certification is claimed.
