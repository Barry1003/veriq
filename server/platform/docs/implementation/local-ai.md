# Local AI integration and honest execution status

The adapter invokes a real bank-approved endpoint under `LOCAL_AI_URL`, using `/chat/completions` and `response_format.type=json_schema`. `/models` checks reachability and configured model discovery. It does not invoke a cloud service by default. Hostnames are constrained by `LOCAL_AI_ALLOWED_HOSTS`; connector and model HTTP clients ignore environment proxies. Model transport failures cannot rewrite bank records.

Ollama documents a [local compatible endpoint](https://docs.ollama.com/api/openai-compatibility) and [schema-constrained outputs](https://docs.ollama.com/capabilities/structured-outputs). Use an installed model that supports the required output schema within your hardware and bank policy. Veriq does not install or download model weights automatically. Do not configure cloud model variants or cloud-routed runtimes for sensitive institutional data; the bank also needs to control runtime egress, not only this adapter's hostname allowlist.

For an already installed, approved local runtime:

```bash
ollama serve
```

In the Veriq terminal, set the endpoint and the exact installed model identifier, then start Veriq:

```bash
export LOCAL_AI_URL=http://127.0.0.1:11434/v1
export LOCAL_AI_MODEL='<your-installed-local-model-id>'
uv run python -m scripts.run veriq
```

The adapter currently has a 60-second inference timeout. Use a model/runtime that can handle the context within that limit. More capable/slow configurations need configurable limits and context budgets. Requests use a non-streaming JSON completion and temperature zero. A bank-authenticated inference gateway can be added behind the adapter; the current runtime transport does not implement a separate model API credential lifecycle.

## Real task interfaces

- **Document extraction**: ingest `record_type=document` under a document-authorized source, then `POST /v1/inference/evidence/{evidence_id}`. A valid result must satisfy the Knowledge schema, relationship types, scope identity rules and validity dates. It creates a candidate assertion referencing the source document. Review acceptance is a separate authorized action.
- **Customer interpretation**: call the same task endpoint for interaction evidence. The output supplies category, an optional exact already-supplied transaction reference and unknowns. It is attached as an AI interpretation candidate; it cannot invent a bank reference or replace the original report.
- **Investigation reasoning**: `POST /v1/investigations/{investigation_id}/analyze` assembles the caller-authorized revision and evidence, then invokes the model. Output must contain hypotheses, missing information and recommendations. Every statement cites allowed evidence IDs and carries its permitted epistemic status. The result is pinned to that revision even if new evidence arrives during inference.

Call `uv run python -m scripts.inference_smoke` with the configured runtime to exercise **all three tasks with real network requests**. It exits nonzero on unavailable inference or invalid output, and writes the actual report to `var/live-inference-result.json`. No test double is used by this command. Inspect that result and the generated output before claiming the model works. To test application persistence and review behavior as well, use the API task endpoints or rerun the HTTP demo with Veriq configured for inference.

Successful schema/citation validation cannot prove semantic entailment. Generated analyses remain candidates and the interface does not accept AI financial facts. Unsupported citations, malformed JSON, invented identifiers and semantic relationship violations are quarantined; transport/configuration failure is recorded as unavailable. Task runs provide a countable success/failure history without fake model prose.

## Status during this implementation

`ollama list` reported that the local server was not running. No live local-model task passed or was claimed to pass. The executed real HTTP demo stored an `unavailable` inference run. Adapter tests use `httpx.MockTransport` and explicitly labelled test-double replies to exercise serialization, valid outputs, candidate review, malformed outputs, invented references/citations, semantic rejection and runtime failure. These tests establish adapter/policy behavior, not model quality.
