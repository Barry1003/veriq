# Ticket 005 local deployment and reproduction

Start in the extracted `veriq-platform` directory. Python 3.12+, pinned uv dependencies and a bank-approved local OpenAI-compatible inference endpoint are required. No hosted AI dependency is introduced. Cedar source is unchanged. Private credentials, weights/binaries and databases live under ignored `var/`, excluded from delivery archives.

Preserve the delivered evidence before reproducing: default commands write to `docs/implementation/ticket005/`. Use a fresh working copy or explicit alternative evaluation/resource output paths. Never delete audited databases to obtain a fresh demonstration.

## Dependencies and tests

```bash
uv sync --frozen
.venv/bin/python -m scripts.bootstrap --upgrade-channels
.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack' --junitxml=docs/implementation/ticket005/regression-tests.xml -o faulthandler_timeout=20 --tb=short
.venv/bin/ruff check apps shared scripts tests
.venv/bin/ruff format --check apps shared scripts tests
```

Some restricted execution sandboxes block the local TestClient event loop; run tests with normal local loopback/thread access. The tests use explicit model doubles unless separately labelled actual inference. Native model evaluations below need the development dependency group because they construct controlled source fixtures using pytest helpers. The production worker does not import those helpers.

## Requested 1.5B CPU runtime

The actual run used the existing, hash-verified `qwen2.5-1.5b-instruct-q4_k_m.gguf`, one model, one slot, four threads, context 4096, batch 64/microbatch 32 and zero GPU layers. `deploy/local-ai-manifest.json` pins its runtime/weight hashes. Provisioning (only if files are not already cached) is:

```bash
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-manifest.json --workers 4
```

Use a separate terminal for the actual native runtime:

```bash
LD_LIBRARY_PATH="$PWD/var/llama-runtime/llama-b11799" var/llama-runtime/llama-b11799/llama-server --model var/models/qwen2.5-1.5b-instruct-q4_k_m.gguf --alias veriq-qwen2.5-1.5b --host 127.0.0.1 --port 8181 --ctx-size 4096 --parallel 1 --threads 4 --batch-size 64 --ubatch-size 32 --n-gpu-layers 0 --chat-template chatml --no-webui
```

Do not run another loaded model at the same time. Measure the actual host, rather than assuming another laptop's free memory. Keep OS protection enabled. The provided sampler observes only the model process recorded in `var/ticket005-model.pid` and verifies its command/port before monitoring. It stops only that model on less than 384 MiB available RAM or full-memory PSI avg10 over 20. These are emergency thresholds, not recommended normal headroom. Global host swapping and model-process swapping are different measurements.

After starting exactly one matching native process, record its PID without exposing configuration secrets and run the sampler in another terminal:

```bash
pgrep -f '^var/llama-runtime/llama-b11799/llama-server' > var/ticket005-model.pid
rm -f var/ticket005-measure.stop
.venv/bin/python -m scripts.measure_adaptive --output docs/implementation/ticket005/native-resources-1.5b.json
```

End measurement normally with `touch var/ticket005-measure.stop`. Stop the foreground model with Ctrl+C after evaluations/demo finish. Do not disable swap or system safeguards to claim success.

## Frozen actual-model evaluation

```bash
LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=768 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.evaluate_adaptive --output docs/implementation/ticket005/actual-model-evaluation-1.5b.json
.venv/bin/python -m scripts.grade_adaptive --report docs/implementation/ticket005/actual-model-evaluation-1.5b.json --prefix docs/implementation/ticket005/adaptive-gate-1.5b
```

Seven frozen cases cover discovery, wrong route association, completion/receipt dispute, competing explanations, two lifecycle changes, and injection. They use authorized SQLite/ASGI source fixtures with **actual HTTP model generations**. They are distinct from a full PostgreSQL deployment. Lifecycle mutations are deliberate harness actions between generation and publication; no successful model answer is substituted. Raw decisions, tool receipts, rejected proposals and errors are retained. Grade outputs are necessary mechanical checks over the recorded run; human semantic inspection is still required. A valid JSON object or safe abstention is not a correct reasoning answer.

Initial 0.5B, interrupted/prototype trials and the first 1.5B trial remain separate historical files. Input/schema improvements were general and disclosed; the dataset was not changed and its SHA-256 is recorded. These runs are not a controlled model-size-only A/B comparison because protocol/output-budget settings evolved.

## Actual Cedar → Veriq → worker HTTP demo

With the same model running and no evaluation running concurrently:

```bash
LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=1024 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.ticket005_demo
```

Ports 8620/8621 must be free. This script starts independent Cedar/Veriq/worker child processes over isolated SQLite databases, uses existing Cedar configuration/documents/transfers/native in-app channel and approved polling, and observes automatic adaptive work. No individual adaptive/inference POST or prewritten conclusion is inserted. It records financial invariance, original references, tasks, steps and actual model failures. Functional pipeline success is reported independently of reasoning acceptance. The demo's 1024-token cap is distinct from the frozen suite's 768-token cap.

The script stops only its own child process groups in a `finally` block and preserves private databases/logs under a unique `var/ticket005-demo-*` directory. It does not stop an independently started model; stop that separately. The earlier 0.5B and failed native-channel harness traces remain preserved. A timeout/failure is an outcome to inspect, not permission to fabricate a successful model response.

## Existing PostgreSQL Compose deployment

The existing modular deployment remains available; no new service or broker is required. To select the requested model and opt in to automatic adaptive analysis:

```bash
export PODMAN_COMPOSE_PROVIDER="$PWD/.venv/bin/podman-compose"
export LOCAL_MODEL_ALIAS=veriq-qwen2.5-1.5b
export LOCAL_MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf
export LOCAL_MODEL_CONTEXT=4096
export AI_MODEL_CONFIG_VERSION=qwen1.5-ticket005-adaptive-v3
podman compose -p veriq-ticket005 -f deploy/compose.yaml -f deploy/compose.ai.yaml -f deploy/compose.async.yaml -f deploy/compose.adaptive.yaml up --build -d
```

Stop the native model first so only one runtime is loaded. Compose keeps its model private on the bank network. Do not assume the full stack fits alongside other workloads; remeasure and stop if pressure rises. The prior v0.4 PostgreSQL full-stack evidence remains available, but this Ticket 005 execution used the independent SQLite HTTP stack and does not claim a fresh v0.5 PostgreSQL full-stack pass. Alembic head stays 0002 because the existing record/JSON schema stores steps and task progress without new tables.

The base deployment remains legacy mode; the adaptive overlay consistently sets `AI_INVESTIGATION_MODE=adaptive` on API/worker. Keep model/policy versions consistent across workers and bump configuration version when switching model/policy. Default task budgets are five generations, three tool calls and 12,000 context bytes; the task freezes them. Bank deployments can configure larger bounded budgets and a larger runtime context/output budget on appropriate hardware. Evidence/revision/authority controls do not change with model size.

Source revocation/policy changes are dynamic; static actor/credential changes require deployment reload/restart. Source/feed/simulator/database/model credentials remain server-only. Do not shell-source the JSON-containing private Compose env files. Use trusted application user authentication in frontend integrations.

## Inspect and stop

Normal frontend flow is to observe automatic intents/tasks, then poll `/v1/inference/tasks/{id}/steps` and the investigation workspace. Explicit authorized POST `/v1/investigations/{id}/adaptive` requests reprocessing; cancellation invalidates a running lease. Cancelled/invalidated tasks require a new eligible request instead of blindly retrying obsolete work.

```bash
podman compose -p veriq-ticket005 -f deploy/compose.yaml -f deploy/compose.ai.yaml -f deploy/compose.async.yaml -f deploy/compose.adaptive.yaml stop
```

Retain database volumes. No cloud endpoint, autonomous financial action or model qualification is implied by successful startup. Production deployment must independently qualify its model and verify runtime schema support, source policies, identity reconciliation, authentication, capacity and migration over its own data.
