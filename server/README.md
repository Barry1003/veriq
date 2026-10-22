# Backend and local AI — v0.5.0 experimental baseline

Daniel owns backend and AI; Usaamah owns frontend and design. The only authoritative backend is [`platform/`](platform/README.md). The existing `src/` directories are unused historical placeholders. Run all Python commands **from `server/platform/`**, preserving its internal imports and relative paths.

Veriq (`apps/veriq/backend`) and Cedar (`apps/cedar/backend`) are independent FastAPI applications with separate databases, credentials and authorization. Cedar owns synthetic financial truth; Veriq consumes approved feeds and investigates evidence. AI cannot perform financial actions or accept institutional knowledge. Frontends remain at `client/veriq/` and `client/cedar/`, with design foundations at `client/shared/`.

**Qwen2.5-1.5B is unqualified: 0/4 required adaptive reasoning scenarios passed.** The six functional demo checks and 153 original non-live regression passes do not establish reasoning acceptance. Recorded failures, measurements and frozen inputs are preserved in `platform/docs/implementation/ticket005/` and `platform/evaluations/adaptive-v1.json`.

For the repeatable live demo, use the [tested named-run workflow](platform/docs/live-demo/RUNBOOK.md), [readiness matrix](platform/docs/live-demo/READINESS.md) and [frontend action map](platform/contracts/LIVE-DEMO.md). The setup API is development-only; no frontend integration or qualified AI result is implied.

## Install and migrate

Requirements: Python 3.12+, `uv`, Linux x86-64 for the pinned native CPU inference binary. SQLite supports the low-resource setup; PostgreSQL 16 plus Podman/Compose supports the existing optional container deployment. No model is required for installation, migrations or non-live tests.

```bash
cd server/platform
uv sync --frozen
.venv/bin/python -m scripts.bootstrap --upgrade-channels
```

Bootstrap creates owner-only random development credentials in ignored `var/runtime.json`, plus separate private Compose env files. It preserves existing credentials/databases. These are local synthetic-development credentials, not production identity provisioning. Do not commit or share them, and do not shell-source JSON-containing env files.

Migrate the two **separate** native SQLite databases explicitly:

```bash
.venv/bin/python - <<'PY'
import json, os, subprocess, sys
from pathlib import Path
runtime = json.loads(Path('var/runtime.json').read_text())
for app in ('cedar', 'veriq'):
    url = runtime[app][app.upper() + '_DATABASE_URL']
    subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'],
                   env={**os.environ, 'DATABASE_URL': url}, check=True)
PY
```

Alembic head is `0002`. Each application runner also applies its own migrations on startup. Start in separate terminals, each in `server/platform/`:

```bash
# Terminal 1: Cedar, 127.0.0.1:8101
.venv/bin/python -m scripts.run cedar
```

```bash
# Terminal 2: Veriq, 127.0.0.1:8100; explicit adaptive opt-in
AI_INVESTIGATION_MODE=adaptive AI_MODEL_CONFIG_VERSION=qwen1.5-ticket005-adaptive-v3 LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=768 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.run veriq
```

Omit `AI_INVESTIGATION_MODE=adaptive` for legacy/default processing. Keep API/worker mode and model configuration version consistent. `AUTO_AI_ENABLED` defaults true; `AI_TASK_CONCURRENCY=1` bounds model work. Ingestion and accepted knowledge remain available without a model. Empty native databases do not automatically contain registered sources, identity namespaces or approved knowledge; the isolated demo below provisions authorized synthetic data through existing APIs.

`GET /health` and `/ready` are public health routes; implemented business APIs use `/v1/...` and `Authorization: Bearer <application-user-token>`. Use private local runtime credentials through a trusted development client; never embed source/feed/simulator/database/model secrets in frontend code. Source ingestion has a separate source-secret boundary. See [authoritative OpenAPI and integration index](../docs/contracts/v0.5.0/README.md). Configure `CORS_ORIGINS` with actual allowed frontend origins when integrating browsers; the current frontend adapters are unchanged and not yet verified against these APIs.

## Start the durable worker

In terminal 3, in `server/platform/`, load private **Veriq-only** settings into the worker process without printing secrets:

```bash
AI_INVESTIGATION_MODE=adaptive AI_MODEL_CONFIG_VERSION=qwen1.5-ticket005-adaptive-v3 LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=768 LOCAL_AI_TIMEOUT_SECONDS=180 AI_TASK_CONCURRENCY=1 AUTO_CONNECTOR_POLL_ENABLED=true .venv/bin/python - <<'PY'
import json, os, sys
from pathlib import Path
runtime = json.loads(Path('var/runtime.json').read_text())
for key, value in runtime['veriq'].items():
    os.environ.setdefault(key, value)
os.execv(sys.executable, [sys.executable, '-m', 'scripts.ai_worker'])
PY
```

The existing outbox, leases, task queue and heartbeat are durable database records. Approved-source polling defaults to five seconds when enabled. It only polls registered, eligible sources. Task states include queued/running/completed/unavailable/failed/retryable; completed processing can still yield an inconclusive/quarantined/invalid-model outcome. Adaptive task budgets default to 5 generations, 3 tool calls and 12,000 context bytes. Stale/revoked work cannot publish. There is one external inference runtime, not a model loaded in each worker.

## Provision and start the requested 1.5B CPU model

Provisioning downloads about 1.1 GB of weights plus the pinned llama.cpp runtime, verifies published SHA-256 hashes and keeps both under ignored `var/`. The manifest is `deploy/local-ai-manifest.json`; the script's default manifest selects a smaller model, so **pass the manifest explicitly**:

```bash
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-manifest.json --workers 4
LD_LIBRARY_PATH="$PWD/var/llama-runtime/llama-b11799" var/llama-runtime/llama-b11799/llama-server --model var/models/qwen2.5-1.5b-instruct-q4_k_m.gguf --alias veriq-qwen2.5-1.5b --host 127.0.0.1 --port 8181 --ctx-size 4096 --parallel 1 --threads 4 --batch-size 64 --ubatch-size 32 --n-gpu-layers 0 --chat-template chatml --no-webui
```

Use a separate terminal; one model and one request slot. Actual prior measurements reached 1.87 GiB model RSS and 923 MiB model swap on a 7.44 GiB host. Latency varied substantially. See the [resource sampler and emergency thresholds](platform/docs/implementation/ticket005/RUNBOOK.md); measure the actual laptop and retain OS safeguards. Stop the foreground runtime with Ctrl+C when finished.

For a stronger bank-approved local runtime on Usaamah's 32 GB laptop, stop the first runtime, serve the approved model through the same OpenAI-compatible chat-completions API with JSON-schema structured-output support, then set `LOCAL_AI_URL`, `LOCAL_AI_MODEL`, timeout/token limits and a distinct `AI_MODEL_CONFIG_VERSION` consistently in API/worker. `LOCAL_AI_ALLOWED_HOSTS` must explicitly permit any approved non-loopback runtime hostname. Keep task/evidence contracts unchanged and run the same frozen cases. Hardware capacity alone does not qualify a model. No cloud endpoint is required; do not change prompts, fixtures or institutional facts to improve a score.

## Regression and frozen actual-model evaluation

```bash
.venv/bin/ruff check apps shared scripts tests
.venv/bin/ruff format --check apps shared scripts tests
.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack'
```

The complete non-live suite has 153 cases; 4 opt-in cases are deselected. Historical JUnit files are evidence of the original run. Write new evaluation results to ignored `var/` rather than overwriting recorded failures:

```bash
LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=768 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.evaluate_adaptive --output var/adaptive-1.5b.json
.venv/bin/python -m scripts.grade_adaptive --report var/adaptive-1.5b.json --prefix var/adaptive-gate-1.5b
```

Seven frozen cases include four reasoning requirements, two lifecycle cases and one bounded injection-containment case. They use authorized SQLite/ASGI fixtures and **actual HTTP model generations**, requiring the dev dependency group. The grader records mechanical prerequisites separately from semantic correctness; inspect raw generations and evidence. Keep unchanged dataset SHA-256 `9562a2fe069ff3903b96ac4c0e85ddff14086a5cf85169804bc72c47b9551a09`. Repeat with a different model alias and separate output filename for the stronger-model comparison. Record runtime/context/token settings; do not claim a model-size-only comparison if they differ.

## Real Cedar → Veriq → worker integration demo

With only the model running and ports **8620/8621 free**, use the existing independent native HTTP harness:

```bash
LOCAL_AI_URL=http://127.0.0.1:8181/v1 LOCAL_AI_MODEL=veriq-qwen2.5-1.5b LOCAL_AI_MAX_OUTPUT_TOKENS=1024 LOCAL_AI_TIMEOUT_SECONDS=180 .venv/bin/python -m scripts.ticket005_demo
```

It starts its own Cedar/Veriq/worker processes and separate fresh SQLite databases, registers approved synthetic source/identity configuration, creates transfers and a native customer report, and observes automatic inference. It checks proactive detection, original references, durable real inference, unchanged financial truth and absence of manual AI requests. It stops its own child processes and preserves private databases/logs in `var/ticket005-demo-*`; stop the independent model separately. Functional checks do not imply reasoning success. The original 1.5B outcome was inconclusive.

This unchanged script writes `docs/implementation/ticket005/http-demo.json`. Preserve that tracked original before running (e.g. copy it to `var/http-demo-recorded.json`), copy your new report to `var/http-demo-new.json` afterwards, and restore the original from the private backup before committing. The 1024 demo token cap differs from the 768 frozen evaluation cap. No new model run is needed to inspect the recorded evidence.

## Optional PostgreSQL/Compose

The original base + inference + worker + adaptive overlays are preserved. Bootstrap must run first. Stop the native model before starting Compose so two models do not load simultaneously:

```bash
export PODMAN_COMPOSE_PROVIDER="$PWD/.venv/bin/podman-compose"
export LOCAL_MODEL_ALIAS=veriq-qwen2.5-1.5b
export LOCAL_MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf
export LOCAL_MODEL_CONTEXT=4096
export AI_MODEL_CONFIG_VERSION=qwen1.5-ticket005-adaptive-v3
podman compose -p veriq-ticket005 -f deploy/compose.yaml -f deploy/compose.ai.yaml -f deploy/compose.async.yaml -f deploy/compose.adaptive.yaml up --build -d
```

Default host APIs remain 8100/8101 (`VERIQ_HOST_PORT`/`CEDAR_HOST_PORT` override host ports). Separate PostgreSQL services use distinct credentials and volumes; inference 8181 is private inside the bank network. Native `var/runtime.json` and Compose `var/*.env` intentionally use different database URLs. Use the same Compose files with `stop` in place of `up --build -d` to stop services; preserve volumes. The publication checks validate native relocation, not a fresh v0.5 PostgreSQL full-stack/model run. Historical PostgreSQL checks are labelled as historical.
