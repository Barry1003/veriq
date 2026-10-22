# Live rehearsal operator runbook

Run from `server/platform/`. Use one explicit run name throughout; never point the demo at another developer's database. Defaults are loopback Veriq 8610, Cedar 8611, model 8181, optional PostgreSQL 56320/56321. Cedar and Veriq retain separate databases, identities and financial authority. The rehearsal is synthetic development, not production activation. Qwen2.5-1.5B remains unqualified (frozen reasoning 0/4); the 9B experiment is separate.

## Provision once while online

Python 3.12+, uv, and Linux x86-64 for the pinned llama.cpp binary. The rehearsal supervisor/guard also require Linux `/proc`; other operating systems and WSL2 were not independently verified. For PostgreSQL, install/start rootless Podman using the host's normal setup.

```bash
uv sync --frozen
.venv/bin/python -m scripts.setup_local_ai --manifest deploy/local-ai-manifest.json --workers 4
podman pull docker.io/library/postgres:16
```

Provisioning verifies pinned hashes. Keep `.venv/`, uv's cache, the cached PostgreSQL image and ignored `var/models/` / `var/llama-runtime/` available before disconnecting. Startup never downloads weights or pulls an image. A cached/offline dependency check is `uv sync --frozen --offline`. No internet is needed by the live services: feeds and inference are local, with no mandatory cloud API.

## Create and start a named run

```bash
.venv/bin/python -m scripts.rehearsal init --run stage --storage postgres
.venv/bin/python -m scripts.rehearsal up --run stage
.venv/bin/python -m scripts.rehearsal prepare --run stage
.venv/bin/python -m scripts.rehearsal preflight --run stage
```

Use `--storage sqlite` at **init** for the smaller native fallback, explicitly identifying SQLite in the handoff. The PostgreSQL path uses two fresh `postgres:16` containers with separate private credentials and named volumes. These are bounded development databases, not production sizing. All configuration/secrets, process identity records, transcripts and preserved data are under `var/rehearsals/stage/` or its uniquely named Podman volumes. No working token is printed. Point the frontend's trusted server-side adapter at these APIs using per-role private credentials; see [Usaamah's map](../../contracts/LIVE-DEMO.md).

`up` starts the model, APIs and durable worker in the background and returns after API readiness. `prepare` uses only existing legitimate source, identity, Cedar configuration and document interfaces. It does not create an anomaly, customer complaint or model conclusion. Repeating prepare is safe and does not create duplicate sources/documents. Partial startup leaves only this named run's owned processes; inspect its private logs, then use `stop`/`up` to recover. A port already occupied by an unrelated process is an error, not permission to terminate it.

Preflight displays separate core checks, actual source delivery, model reachability, active-worker/model configuration consistency, unqualified status and activation validity. `ready_limited` means core evidence works but AI or its worker is not ready. `ready_unqualified` permits an experiment, not a qualified conclusion. Bare `/ready` only proves an application's database responds.

## Operate the genuine live journey

Keep all services running so frontend actions can be demonstrated. These operator commands are also a repeatable API rehearsal of the same actions:

```bash
# Create ten genuine synthetic timeout transfers; observe an incident before any complaint.
.venv/bin/python -m scripts.rehearsal scenario --run stage --phase anomaly
# Create the customer's transfer and native in-app report; observe automatic investigation.
.venv/bin/python -m scripts.rehearsal scenario --run stage --phase customer
# Inspect real pending/running/failed tasks and actual model/tool receipts.
.venv/bin/python -m scripts.rehearsal status --run stage
# Later, authorized Cedar staff reconcile the pending transfer; receipt stays unverified.
.venv/bin/python -m scripts.rehearsal scenario --run stage --phase reconcile
```

These phases use stable idempotency/message IDs and a persisted exact message timestamp. Retries do not create new transfers/reports; do not change the payload for an existing native ID. Reconciliation is **Cedar's explicit authorized staff action**, not a Veriq or AI financial decision. Existing customer and incident evidence remains visible; older investigation revisions retain their original data. To show AI against the pre-reconciliation revision, wait for its actual outcome before reconciling, otherwise the revision can correctly invalidate pending work.

For the complete automatic real HTTP verification, start a **fresh** prepared run and use:

```bash
.venv/bin/python -m scripts.verify_rehearsal --run stage --wait-seconds 480
```

This verifies repeatable preparation/scenario requests, auth rejection, revoked-source rejection, proactive detection, native references, actual automatic inference and financial/history boundaries. It records real responses in `transcript.jsonl` and `verification.json` under the private named run. A valid transport receipt is not successful reasoning. A missed wait deadline is retained as a failed timing check (exit 2), while the remaining financial/history checks still run; do not call that a full pass. If an earlier interrupted verifier left a checkpoint, continue with `--resume` and an explicit wait budget without erasing its failed deadline. The verifier expects the initial anomaly run to start without old transfers/customer complaints; use an explicit reset for a second full verification. Phase commands remain replay-safe within a run.

## Inspect and recover

```bash
.venv/bin/python -m scripts.rehearsal status --run stage
# Restart a specific API or worker against the same persistent database:
.venv/bin/python -m scripts.rehearsal stop --run stage --service veriq
.venv/bin/python -m scripts.rehearsal up --run stage
# Likewise --service cedar or --service worker.
# Demonstrate model outage while evidence/APIs continue:
.venv/bin/python -m scripts.rehearsal stop --run stage --service model
.venv/bin/python -m scripts.rehearsal status --run stage
.venv/bin/python -m scripts.rehearsal up --run stage
```

Only recorded PID/start-time process groups owned by this run are signalled. A busy worker gets ten seconds to stop, then its own group is terminated; expired leases recover through the existing queue, not by erasing tasks. Default lease duration is at least 240 seconds (and timeout+30), so recovery of a force-terminated in-flight generation can take that long. A normal idle restart is faster. Retry only an eligible unavailable/failed task through its documented API; a stale/cancelled task needs new eligible processing. Do not rewrite a failed outcome as completed.

Logs: `cedar.log`, `veriq.log`, `worker.log`, `model.log`, `guard.log`. The model guard retains at most 1,800 two-second samples (~one hour) in `resources.json`, and stops **only its owned model** if available RAM falls below 384 MiB or full-memory PSI avg10 exceeds 20. These are emergency protection thresholds, not recommended headroom or a guarantee against every OS failure. Investigate `model-emergency-stop.json` before retrying; stop unrelated workloads or use approved stronger hardware. Do not disable OS safeguards. CPU latency must be measured, not assumed from model size.

## Another clean rehearsal and shutdown

```bash
.venv/bin/python -m scripts.rehearsal stop --run stage
# Explicitly archive only this selected run; its databases/logs/volumes are preserved.
.venv/bin/python -m scripts.rehearsal reset --run stage
.venv/bin/python -m scripts.rehearsal init --run stage --storage postgres
.venv/bin/python -m scripts.rehearsal up --run stage
.venv/bin/python -m scripts.rehearsal prepare --run stage
```

No data is deleted by reset; the selected run directory is renamed to `stage-archived-<id>`, and its own PostgreSQL containers/volumes remain stopped. Reinitialization creates different credentials, containers and empty databases. No command deletes another run, prunes volumes or resets global `var/runtime.json`. Stop the active run after rehearsal. Do not commit generated runtime data or credentials.

## Stronger compatible model on the 32 GB laptop

Choose settings at init, keep the existing task interface and explicit version consistent across API/worker, and load one model only:

```bash
.venv/bin/python -m scripts.rehearsal init --run stronger --storage postgres --runtime /approved/path/llama-server --weights /approved/path/model.gguf --model-alias bank-approved-local --model-version bank-approved-local-trial1 --context 4096 --tokens 768 --timeout 180
```

Those paths are placeholders for provisioned approved local files. Alternatively, pass `--external-model http://127.0.0.1:8181/v1` and its real `--model-alias`; the runner will not start/stop an external model. A remote bank-local hostname needs explicit `--allowed-model-hosts`; credentials embedded in URLs are rejected. The backend reports context as deployment-declared, not independently proven by `/models`. The runtime must support the existing OpenAI-compatible JSON-schema contract. Model switching never rewrites accepted knowledge, tools or prompts. Use the unchanged `scripts.evaluate_adaptive` / `scripts.grade_adaptive` commands in [server setup](../../../README.md), separate result files and the same frozen dataset. Do not claim 9B timing/qualification until actually measured.
