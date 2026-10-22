# Reproduce the low-resource setup

These measurements/scripts target Linux `/proc` and CPU inference. They describe the measured i5-1135G7 host, not a different personal laptop. Begin with 0.5B, one runtime, one request, 4,096 tokens of context, 512 generated tokens and four CPU threads. No 3B model is required.

## Dependencies and pinned artifacts

From the existing `veriq-platform` repository:

```bash
uv sync --frozen
.venv/bin/python -m scripts.bootstrap
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-small-manifest.json --workers 4
```

The provisioner resumes under ignored `var/` and verifies the published runtime/model SHA-256 before execution. Resume with the same worker count. Weights/binaries are excluded from the source ZIP. Initial provisioning requires access to official artifact hosts; later inference is local and can operate offline. For the optional, actually tested 1.5B file:

```bash
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-manifest.json --workers 6
```

## Measured trials that unload on completion

```bash
.venv/bin/python -m scripts.qualify_low_resource --manifest deploy/local-ai-small-manifest.json --output var/resource-0.5b.json --evaluate
```

The default monitor is deliberately conservative: 768 MiB available-memory floor, 64 MiB global swap-I/O budget, full-memory-stall PSI avg10 limit 5. Two 1.5B attempts stopped during loading under those guards. At the user's explicit request, the successful 1.5B trial removed both memory/swap cutoffs and used this command:

```bash
.venv/bin/python -m scripts.qualify_low_resource --manifest deploy/local-ai-manifest.json --output var/resource-1.5b.json --context 2048 --output-tokens 384 --no-warmup --relaxed-resource-guards --evaluate
```

The override keeps one model, one request, four threads, 64/32 batch/microbatch, 90-second request/load timeouts and an emergency full-memory-stall PSI avg10 limit 20. It cannot guarantee a laptop will never freeze. Model errors, killed trials and evaluation failures remain in reports. Do not run two runtime/model servers concurrently. Exit 2 denotes a skipped/failed resource trial; benchmark completion is not model qualification. Standalone factual evaluation exits 1 if any rubric case fails.

Global swap counters include all host processes; report them separately from runtime swap/PSS. Loading a file through mmap means RSS is not exclusive allocation. Monitor other desktop applications and stop the process with Ctrl-C if responsiveness deteriorates. The trial always terminates its runtime child on exit.

## Start the local runtime, API and worker

For a persistent 0.5B development runtime:

```bash
var/llama-runtime/llama-b11799/llama-server --model var/models/qwen2.5-0.5b-instruct-ollama-q4_k_m.gguf --alias veriq-qwen2.5-0.5b --host 127.0.0.1 --port 8181 --ctx-size 4096 --parallel 1 --threads 4 --batch-size 64 --ubatch-size 32 --n-gpu-layers 0 --no-webui
```

In a separate terminal:

```bash
LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-0.5b LOCAL_AI_MAX_OUTPUT_TOKENS=512 LOCAL_AI_TIMEOUT_SECONDS=90 .venv/bin/python -m scripts.run veriq
```

`bootstrap` generates separate owner-only credentials/environment files in `var/`. For a dedicated worker, load **the private Veriq environment only**, then set the same approved endpoint/model and run:

```bash
.venv/bin/python -m scripts.ai_worker
```

Required environment: `VERIQ_DATABASE_URL`, `INSTALLATION_SCOPE`, `AUTH_CREDENTIALS`, `LOCAL_AI_URL`, `LOCAL_AI_MODEL`. Do not print or give environment credentials to a browser. `--once` claims at most one eligible task per configured slot and exits, enabling a reproducible restart test. It does not force retryable tasks past their backoff.

Queue defaults: `AI_TASK_CONCURRENCY=1` (cap 2), `AI_TASK_QUEUE_LIMIT=100` (cap 1,000), `AI_TASK_MAX_ATTEMPTS=3` (cap 5), `AI_TASK_BACKOFF_SECONDS=10`, `AI_TASK_LEASE_SECONDS=240`. Lease duration is at least runtime timeout + 30 seconds. All workers in one bank deployment must use the same concurrency configuration and database. A crashed request may execute again after lease expiry; stale workers cannot publish. This is not exactly-once external model execution. No Redis, Celery or multiple loaded models are required.

Submit/poll/retry using the application user credential and routes in `contracts/SCREENS-v0.3.0.md`. A completed task's outcome may be quarantined. Inputs over 18,000 serialized bytes or 12 evidence records require splitting; no silent truncation occurs. The model server's context/token caps provide a second bound.

## PostgreSQL/Compose

```bash
PODMAN_COMPOSE_PROVIDER="$PWD/.venv/bin/podman-compose" podman compose -f deploy/compose.yaml -f deploy/compose.ai.yaml -f deploy/compose.async.yaml up --build --force-recreate -d
```

Run bootstrap first to generate the separate DB/app env files. The bank network is internal and the model has no host-published port. API/worker startup does not require model readiness. Source ingestion and accepted knowledge can be served while runtime requests fail. PostgreSQL uses the existing migration `0001` and generic durable records; no new schema migration is needed.

The full v0.3.0 Compose stack was not rebuilt during this ticket. Actual PostgreSQL 16.15 queue claims/recovery were verified separately using a temporary isolated DB. The HTTP live-model demo used fresh SQLite DBs and separate API/worker processes. Earlier full Compose verification is preserved in Ticket 002 and is not relabeled v0.3.0.

## Change approved local runtimes

`LocalInference.run(task, inputs)`, `status()` and `execution_metadata()` are the application boundary. Only the approved endpoint and model alias change. Actual llama.cpp and Ollama 0.31.1 executions are in `runtime-portability.json`; no knowledge/investigation rewrite was needed.

For an installed local Ollama runtime, [import the verified GGUF](https://docs.ollama.com/import) with a Modelfile:

```text
FROM /absolute/path/to/qwen2.5-0.5b-instruct-ollama-q4_k_m.gguf
PARAMETER num_ctx 4096
PARAMETER num_predict 512
PARAMETER num_thread 4
PARAMETER temperature 0
```

Create a local model with `ollama create veriq-ticket003 -f Modelfile`, set `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`, disable cloud features, and point Veriq at `http://127.0.0.1:11434/v1` with `LOCAL_AI_MODEL=veriq-ticket003:latest`. The [local compatibility interface](https://docs.ollama.com/api/openai-compatibility) must support JSON-schema responses; the adapter still validates every output. This ticket actually used the installed Ollama binary isolated in a temporary Podman container, with the GGUF imported from a read-only mount and private state under `var/ticket003-ollama`.

A bank can point the same interface at an approved bank-hosted runtime on more capable CPU/GPU hardware, set `LOCAL_AI_ALLOWED_HOSTS` to that internal host, keep inference inside its network and apply its service identity/TLS controls. An incompatible vendor API requires an adapter implementing this boundary, not changes to source authority, accepted knowledge or investigation logic. New models/runtimes still require qualification. Larger bank hardware is optional for developers; hosted cloud AI is not required.

## Re-evaluate and test

```bash
.venv/bin/python -m scripts.evaluate_reliability --output var/frozen-current.json
.venv/bin/python -m scripts.evaluate_reliability --dataset evaluations/heldout-ticket003.json --output var/heldout-current.json
.venv/bin/python -m scripts.reverify_captured
.venv/bin/pytest -q -m 'not live_ai'
VERIQ_LIVE_AI=1 .venv/bin/pytest -q -m live_ai
.venv/bin/python -m scripts.ticket003_demo
.venv/bin/python -m scripts.export_contracts
.venv/bin/python -m scripts.package
```

Set `LOCAL_AI_URL`/`LOCAL_AI_MODEL` for all inference commands. `ticket003_demo` reads private bootstrap credentials, uses fresh persisted SQLite databases and ports 8300/8301, restarts a real worker for each task, and closes its API processes. It preserves failed/quarantined outputs and asserts workflow boundaries rather than asserting model correctness. Its output goes to the ticket report directory; use a copy of the repo if preserving the original run unchanged matters.

`verify_postgres_queue` expects a dedicated temporary PostgreSQL URL in owner-only `var/ticket003-pg.json`; it must never be pointed at a production database. It migrates the empty test database, uses a unique synthetic scope and verifies claims/recovery with an explicitly labelled inference double. The actual verification report is shipped. All test services created for this handoff were stopped after measurement.
