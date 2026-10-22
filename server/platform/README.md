# Veriq v0.5.0 candidate + frozen Cedar

Adaptive investigation extends the existing v0.4.0 application and durable worker. Models can choose bounded authorized evidence tools, inspect returned records and propose open hypotheses. Source facts are read deterministically, derived findings need supported premises, and hypotheses remain unverified. Cedar source is unchanged.

**Ticket 005 is not fully accepted.** The requested Qwen2.5-1.5B model made genuine tool requests but passed **0/4 frozen reasoning prerequisites** and produced no reviewable assessments. It remains unqualified. Earlier model failures are preserved.

- [Engineering handoff, actual results and acceptance gaps](docs/implementation/ticket005/REPORT.md)
- [Architecture decision](docs/implementation/ticket005/ADR-005.md)
- [Reproduce the 1.5B local setup](docs/implementation/ticket005/RUNBOOK.md)
- [Tests and evidence map](docs/implementation/ticket005/TESTS.md)
- [Frontend contracts for Usaamah](contracts/README.md)

**153 non-live tests passed.** The independent real Cedar/Veriq/worker HTTP demo passed its six functional checks; its 1.5B assessment was inconclusive. Source namespaces, historical execution-time routing, revision/grant checks, durable step receipts and publication safety remain enforced. Model availability, valid JSON, factual support and qualification are separate states.

The 1.5B process reached about 1.87 GiB RSS and 923 MiB swap on the measured 7.44 GiB host. Demo/model services were stopped and isolated databases preserved. No swap-free, production-readiness or frontend/Figma integration claim is made. No mandatory cloud AI dependency exists.

```bash
uv sync --frozen
.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack'
```

Private credentials, weights, binaries and databases stay in ignored `var/`. Follow the runbook for the actual-model evaluation, automatic pipeline and optional existing PostgreSQL deployment. Historical v0.1.0–v0.4.0 reports/contracts remain versioned.
