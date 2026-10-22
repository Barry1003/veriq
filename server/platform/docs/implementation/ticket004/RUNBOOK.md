# Reproduce v0.4.0 on constrained CPU hardware

Run from the extracted `veriq-platform` directory on Linux with Python 3.12+, uv and rootless Podman/Compose. The actual verification used Podman Compose, the locked Python dependencies, two PostgreSQL containers and a private llama.cpp container. First provisioning needs access to the pinned dependency/image/model distribution endpoints; inference itself has no cloud dependency. Model weights/binaries and private configuration are deliberately excluded from the ZIP.

Keep the historical evidence directory before rerunning: the verification scripts intentionally write their reports to `docs/implementation/ticket004/`. A fresh checkout/copy is simplest for reproducing without overwriting the delivered evidence. Do not delete existing database volumes to make a demonstration pass.

## Provision and start

```bash
uv sync --frozen
.venv/bin/python -m scripts.bootstrap --upgrade-channels
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-small-manifest.json --workers 4
export PODMAN_COMPOSE_PROVIDER="$PWD/.venv/bin/podman-compose"
export CEDAR_HOST_PORT=8401
export VERIQ_HOST_PORT=8400
export VERIQ_STACK_PROJECT=veriq-ticket004-repro
podman compose -p "$VERIQ_STACK_PROJECT" -f deploy/compose.yaml -f deploy/compose.ai.yaml -f deploy/compose.async.yaml up --build --force-recreate -d
```

Choose a **new** `veriq-ticket004*` project for a full demonstration: the demo explicitly requires no existing Veriq evidence. The project prefix limits the scripts' stop/restart actions to an isolated test stack. Make sure ports 8400/8401 are free. Bootstrap preserves existing credentials; `--upgrade-channels` adds missing native-channel/document feed grants. It generates owner-only private files under ignored `var/`. Do not print those files or send their contents to the frontend. The Compose environment files contain structured JSON and should not be shell-sourced.

The independent runners apply Alembic migrations using their own database credentials on startup. Readiness endpoints are `http://127.0.0.1:8401/ready` and `http://127.0.0.1:8400/ready`. Wait for both and the private model health check before running the full-stack suite. The worker starts after the Veriq schema is ready; source processing remains available if model health fails. Model port 8181 is internal only. The six services share the internal bank network; the independent database credentials are not interchangeable.

Default resource settings are one model, one concurrent inference slot, four CPU threads, context 4096 and maximum output 512. The Compose model uses CPU (`n_gpu_layers=0`). No swap limits or OS safety mechanisms need to be disabled. The pinned model file is roughly 398 MB and is hash-verified by setup. Keep other memory-intensive workloads closed on an 8 GB machine.

## Measure and verify the complete workflow

Start the optional host/container sampler in a second terminal with a stop-file path that does not exist:

```bash
.venv/bin/python -m scripts.measure_stack --project "$VERIQ_STACK_PROJECT" --stop-file "$PWD/var/repro-measure.stop"
```

It records host RAM/swap/full-memory PSI and container accounting every few seconds. It stops only this isolated model if available RAM drops below 256 MiB or full-memory PSI avg10 exceeds 20. Those are emergency last-resort thresholds, not recommended normal operating headroom. Pressing through memory pressure is not needed. To end a normal measurement from another terminal:

```bash
touch var/repro-measure.stop
```

Run the actual complete synthetic pipeline once on the fresh stack:

```bash
VERIQ_FULL_STACK=1 .venv/bin/pytest -q -s -m full_stack --junitxml=docs/implementation/ticket004/full-stack-tests.xml --tb=short
.venv/bin/python -m scripts.verify_stack
```

`VERIQ_STACK_PROJECT` must match the active project. The test operates through Cedar/Veriq HTTP, explicitly grants the demonstration's verified identifier authority, registers approved sources, waits for automatic polling/tasks, restarts API/worker/model, reconciles an authorized transaction and preserves all actual outcomes. It never directly inserts a Veriq investigation or calls manual AI endpoints. All records are synthetic. The verifier requires three real persisted task receipts, compares running core source hashes, checks migration/metadata, probes credential separation and records model/status information.

The delivered run used `VERIQ_STACK_PROJECT=veriq-ticket004-final` with those same ports and Compose files. Raw reports document that execution; a new reproduction creates new IDs. Do not run a fresh demo against the populated delivered volumes: its empty-evidence guard will reject that instead of erasing history.

## Regression and existing live smoke checks

```bash
.venv/bin/pytest -q -m 'not live_ai and not full_stack' --junitxml=docs/implementation/ticket004/regression-tests.xml -o faulthandler_timeout=20 --tb=short
.venv/bin/ruff check apps shared migrations scripts tests
.venv/bin/ruff format --check apps shared migrations scripts tests
```

For the existing live smoke suite, the actual execution used an ephemeral test container on the **same private model network**. Stage only the host's pure Python test dependencies; do not mount the host Python interpreter into the application image:

```bash
.venv/bin/python - <<'PY'
import importlib.util
import shutil
from pathlib import Path
out = Path('var/ticket004-test-deps')
out.mkdir(parents=True, exist_ok=True)
for name in ('pytest', '_pytest', 'pluggy', 'iniconfig', 'packaging', 'pygments', 'wcwidth', 'py'):
    spec = importlib.util.find_spec(name)
    if spec is None:
        raise SystemExit('Missing locked test dependency: ' + name)
    origin = Path(spec.origin)
    if origin.name == '__init__.py':
        shutil.copytree(origin.parent, out / name, dirs_exist_ok=True)
    else:
        shutil.copy2(origin, out / origin.name)
PY
podman run --rm --name veriq-ticket004-live-tests --user 0:0 --security-opt label=disable --network "${VERIQ_STACK_PROJECT}_bank" -v "$PWD/tests:/app/tests:ro" -v "$PWD/var/ticket004-test-deps:/test-deps:ro" -v "$PWD/docs/implementation/ticket004:/reports:rw" -e PYTHONPATH=/test-deps:/app -e PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 -e LOCAL_AI_URL=http://local-ai:8181/v1 -e LOCAL_AI_ALLOWED_HOSTS=local-ai -e LOCAL_AI_MODEL=veriq-qwen2.5-0.5b -e LOCAL_AI_TIMEOUT_SECONDS=90 -e LOCAL_AI_MAX_OUTPUT_TOKENS=512 -e VERIQ_LIVE_AI=1 "localhost/${VERIQ_STACK_PROJECT}_veriq:latest" python -m pytest -q tests/test_live_ai.py --junitxml=/reports/live-model-tests.xml --tb=short
```

The ephemeral test process uses SQLite fixtures and actual HTTP inference, not the populated bank database. It is distinct from the full-stack test, which uses both PostgreSQL databases. Local image names shown match the actual Podman Compose provider; inspect your provider's image naming if it differs. SELinux label disabling here applies only to this disposable test container's read-only test mounts and writable report mount. Preserve any model failures; never substitute a client double for a live run.

## Runtime policy and administration

The current worker polls only backend-configured authorized Cedar connectors. `AUTO_CONNECTOR_POLL_ENABLED=true`, interval 3 seconds in Compose. Native ad hoc workers default polling off unless configured; `--once` does not continuously poll. Ingestion and material revision creation persist intents even if the queue/model is unavailable. APIs expose processing intents, linked tasks and run outcomes; the frontend polls them every few seconds (see the screen map).

Useful defaults are `AI_TASK_CONCURRENCY=1` (bounded 1–2), `AI_TASK_MAX_ATTEMPTS=3` (bounded 1–5), lease 240 seconds, backoff 10 seconds and queue limit 100. A full queue defers the intent. Source grant/policy/revision failures are explicit blocks/failures, not successful processing. Do not retry a superseded analysis to publish over a newer revision.

`AUTO_AI_ENABLED` controls automatic eligibility. New sources default opted in, subject to record type/authority/policy; migrated sources missing `ai_enabled` stay opted out until an authorized administrator enables them. Source authorization and processing-policy APIs require `sources` permission/clearance and rationale. They version the grant; previously frozen jobs cannot silently inherit changed authority. Identity grants/mappings require `identity` permission and adequate clearance. No administrative secret is needed in a customer browser.

To request deliberate reprocessing after a material deployment change, provision a new explicit `AI_MODEL_CONFIG_VERSION` and/or `AI_PROCESSING_POLICY_VERSION` on the API/worker deployment, then restart/recreate the affected services consistently. Version changes restage eligible current work once per identity. Manual task endpoints remain for authorized reprocessing, with linkage to completed prior work. Changes to static actor credentials require configuration reload/restart; source revocation is checked dynamically.

## Migration and recovery

Back up each database first. The application runner applies `python -m alembic upgrade head` with the application's own database URL; no hardcoded virtualenv executable is required. For a deployment-managed migration job, supply `DATABASE_URL` securely in its environment, then run:

```bash
python -m alembic upgrade head
```

Never paste credential-bearing connection URLs into a public command or report. Review `IDENTITY-MIGRATION.md` before upgrading nonempty v0.3.0 data. Migration preserves stored IDs/history and creates review markers; it does not automatically repair ambiguous legacy equivalence. Old queued jobs without authority snapshots fail closed and require authorized reprocessing. Running old application code over newly namespaced data is unsupported.

A normal `stop` waits for graceful worker termination; forced termination is recovered by lease expiry. Domain publication and task completion are transactional, although an external inference can execute again after a crash. Source ingestion, accepted knowledge, monitoring and existing investigations remain available during model outage. Runtime status explicitly separates endpoint reachability from historical successful runs and qualification.

## Stop and retain data

```bash
podman compose -p "$VERIQ_STACK_PROJECT" -f deploy/compose.yaml -f deploy/compose.ai.yaml -f deploy/compose.async.yaml stop
```

This releases resources and retains database volumes. Starting again uses the same project/volumes; rerunning the fresh-only demonstration requires a different project, not deleting audited data. Never use `down --volumes` for a populated bank database. Temporary delivered demo services were stopped after verification.

## Different bank-approved inference hardware

Keep the existing task/evidence/knowledge/investigation interfaces. Configure `LOCAL_AI_URL`, `LOCAL_AI_MODEL`, `LOCAL_AI_ALLOWED_HOSTS`, bounded timeout/context/output, concurrency and an explicit model configuration version for an approved local runtime. The existing client supports the documented local runtime protocols; Ticket 003 includes actual llama.cpp/Ollama portability evidence. A private production bank host may load a more capable model without changing canonical knowledge or investigation logic. It still needs independent factual qualification, authority/network controls and capacity testing. Increasing hardware or changing a model name does not confer qualification. There is no mandatory cloud AI service.
