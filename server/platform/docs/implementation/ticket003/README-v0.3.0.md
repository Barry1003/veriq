# Veriq + Cedar — v0.3.0

Resource-constrained reliability release, continuing v0.2.0. Qwen2.5-1.5B Q4_K_M actually ran on this 7.44 GiB CPU host after the user requested removing conservative swap/headroom cutoffs. It peaked at 1.87 GiB RSS. **Both tested models remain unqualified.** All model results remain candidates; unsupported outputs are quarantined.

- [Ticket 003 handoff and actual measurements](docs/implementation/ticket003/REPORT.md)
- [Reproducible low-resource setup](docs/implementation/ticket003/RUNBOOK.md)
- [Quality, coverage and failures](docs/implementation/ticket003/QUALITY.md)
- [Frontend/API changes](contracts/SCREENS-v0.3.0.md)
- [Code and verification map](docs/implementation/ticket003/AUDIT-MAP.md)

The release adds deterministic evidence-support verification and a persisted, leased AI task queue. Ingestion, deterministic monitoring, identity/temporal context and accepted knowledge do not depend on a running model. AI does not write Cedar's financial state. No mandatory cloud AI dependency exists.

The unchanged ten-case dataset and twelve separately frozen held-out cases were executed with both 0.5B and 1.5B models. Structured output, raw rubric correctness, accepted support and accepted correctness are reported separately. Catalog selection and deterministic guards are disclosed; abstention is not counted as a correct model answer.

Actual checks: 95 non-live regression tests passed. The existing live-model suite against Ollama had **2 passed, 1 failed**: extraction produced an unsupported candidate. The failure is retained. Real PostgreSQL 16.15 queue concurrency/recovery checks passed separately with explicit inference doubles. A real HTTP/Ollama demo exercised three tasks with restarted workers and demonstrated operation during inference failure.

Quick verification after installing the pinned dependencies:

```bash
uv sync --frozen
.venv/bin/pytest -q -m 'not live_ai'
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-small-manifest.json --workers 4
.venv/bin/python -m scripts.qualify_low_resource --manifest deploy/local-ai-small-manifest.json --output var/resource-check.json --evaluate
```

See the runbook for starting the API, worker and runtime, and for the explicit override used in the successful 1.5B trial. Private credentials, model weights, binaries and databases stay in ignored `var/` and are not shipped.

Historical v0.1.0/v0.2.0 contracts and implementation reports remain available. They describe those executions, not the current qualification result. No production model certification, deployment to a bank, actual external channel connectivity or frontend implementation is claimed.
