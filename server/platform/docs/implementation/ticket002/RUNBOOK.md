# Ticket 002 reproduction procedure

Run these commands from the existing `veriq-platform` directory. The tested host was Linux x86-64 with eight logical CPU threads and 7.4 GiB RAM. No GPU was used. The executed model is Qwen2.5-0.5B-Instruct Q4_K_M distributed as `ollama.com/library/qwen2.5:0.5b`, with content-addressed weight SHA-256 `c5396e06af294bd101b30dce59131a76d2b773e76950acc870eda801d3ab0515`. The inference runtime is llama.cpp b11799 / 0.7.0-dev, commit `0756e83fc`; the binary download and model hashes are pinned in `deploy/local-ai-small-manifest.json`.

The small model is for reproducible execution verification. **It fails the quality gate and is not qualified for unattended institutional reasoning.** Read the quality report before using its candidates.

## Provision artifacts and credentials

```bash
uv sync --frozen
uv run python -m scripts.bootstrap
uv run python -m scripts.bootstrap --upgrade-channels
uv run python -m scripts.setup_local_ai --manifest deploy/local-ai-small-manifest.json --workers 4
```

The additive upgrade preserves v0.1.0 credentials/databases and adds distinct channel/document grants. Generated secrets remain in owner-only Git-ignored `var/` files. Do not distribute those files to the browser or with source archives. The downloader resumes four fixed byte ranges, verifies the full model against its published digest and refuses a checksum mismatch. Continue with the same `--workers 4` on a resumed download. Provisioning requires public package/model access or pre-staged verified artifacts; inference itself is local and needs no vendor API. The initially attempted 1.5B Hugging Face download was incomplete during network/DNS failures and was not used for any claimed inference.

## Verified PostgreSQL plus private model deployment

With Podman installed, the uv development environment supplies the Compose provider:

```bash
export PODMAN_COMPOSE_PROVIDER="$PWD/.venv/bin/podman-compose"
export CEDAR_HOST_PORT=8201
export VERIQ_HOST_PORT=8200
podman compose -f deploy/compose.yaml -f deploy/compose.ai.yaml up --build --force-recreate -d
```

`--force-recreate` ensures the tested Podman provider uses the newly built application image rather than retaining an older container behind a mutable tag. Named PostgreSQL volumes persist. Docker users can use the same Compose files with `docker compose`; this session executed Podman Compose, not Docker Engine.

Both DBs run PostgreSQL 16.15 in the verified deployment. Application migrations run automatically and independently. Cedar is at `http://127.0.0.1:8201`; Veriq at `http://127.0.0.1:8200`. The model is `http://local-ai:8181/v1` **inside** the internal `bank` network, with no model port published to the host. The model sidecar health check must pass before Veriq starts. Ordinary `/ready` verifies the application database; `/v1/inference/status` separately reports model reachability and successful structured tasks.

```bash
uv run python -m scripts.ticket002_demo --cedar http://127.0.0.1:8201 --veriq http://127.0.0.1:8200
uv run python -m scripts.verify_deployment
```

The first command writes a real HTTP transcript and current frontend examples. It requires three actual validated model responses; it cannot fabricate completion when inference fails. It records misclassification as a quality finding rather than replacing the model's category. It checks candidate-only knowledge before review, authorized synthetic fixture review, original interaction/run lineage, unchanged bank state under AI, later bank-authorized reconciliation, preserved investigation history and application-token isolation. The second command inspects actual DB migrations/schema, image IDs, credentials, channel permissions, private model exposure and completed inference tasks.

## Separate live tests and quality evaluation on loopback

For the native test/evaluation procedure, start a second terminal with:

```bash
var/llama-runtime/llama-b11799/llama-server \
  --model var/models/qwen2.5-0.5b-instruct-ollama-q4_k_m.gguf \
  --alias veriq-qwen2.5-0.5b --host 127.0.0.1 --port 8181 \
  --ctx-size 8192 --parallel 1 --threads 4 --batch-size 256 --ubatch-size 128 \
  --n-gpu-layers 0 --chat-template chatml --no-webui
```

Then, with the native server ready:

```bash
export LOCAL_AI_URL=http://127.0.0.1:8181/v1
export LOCAL_AI_MODEL=veriq-qwen2.5-0.5b
uv run python -m scripts.inference_smoke
VERIQ_LIVE_AI=1 uv run pytest -q -m live_ai --junitxml=docs/implementation/ticket002/live-model-tests.xml
uv run python -m scripts.evaluate_ai
```

Run the normal regression suite separately without inference environment variables:

```bash
env -u LOCAL_AI_URL -u LOCAL_AI_MODEL uv run pytest -q -m 'not live_ai' --junitxml=docs/implementation/ticket002/regression-tests.xml
uv run ruff check .
uv run ruff format --check .
uv run python -m scripts.export_contracts
uv run python -m scripts.package
```

The evaluator exits nonzero when quality checks fail and preserves every case's actual output/failure. That exit code is expected for the current model and must not be advertised as a quality pass. Native tests/evaluation and the full container HTTP demo are separate verification paths; no test double is used in either live path. Mocked tests remain labelled in `tests/test_inference.py` and its explicitly imported helpers.

## Next model qualification action

The generic adapter needs no application rewrite to use a more capable bank-approved compatible local model. A pinned 1.5B artifact manifest is also provided:

```bash
uv run python -m scripts.setup_local_ai --manifest deploy/local-ai-manifest.json --workers 6
export LOCAL_MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf
export LOCAL_MODEL_ALIAS=veriq-qwen2.5-1.5b
podman compose -f deploy/compose.yaml -f deploy/compose.ai.yaml up --force-recreate -d
```

This is a precise provisioning path, **not a claim that the 1.5B model was executed or passes quality checks**. Validate available RAM/context/latency on the target bank machine, rerun all three live tasks, rerun the unchanged evaluation cases and inspect semantic correctness. Do not enable automatic unstructured-knowledge acceptance or consequential financial actions to compensate for model errors. No model has such authority in this implementation.
