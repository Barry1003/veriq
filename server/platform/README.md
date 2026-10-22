# Veriq backend

Independent FastAPI services for Cedar banking and Veriq institutional intelligence, with separate databases and credentials. A durable worker processes bounded local AI tasks; evidence verification and human review govern publication.

- [Installation, authentication and configuration](../README.md)
- [Local rehearsal setup and operation](docs/runbook.md)
- [API contracts](contracts/README.md)
- [Architecture](docs/architecture/README.md)

The bundled Qwen2.5-1.5B model remains unqualified for adaptive reasoning. Ingestion and accepted knowledge work independently of inference.

```bash
uv sync --frozen
.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack'
```

Credentials, databases, model files and generated evaluation results stay in ignored `var/`.
