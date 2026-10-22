# v0.5.0 repository integration handoff

Imported the existing experimental backend into **`server/platform/`** from `veriq-platform-source-v0.5.0.zip`, SHA-256 `9d98eb4d303a651941ce3f17ae3ba405a0aad1410eec654af8b80b1661e5e085`, onto `main` commit `911bdca2f46d02556e92228fc01d81eee295f5be`. Publication branch: `feat/import-veriq-platform-v0.5.0`. The PR's commit history supplies the resulting SHA without embedding a self-referencing commit ID in source.

This supports CPU comparison of Qwen2.5-1.5B with a stronger approved local model on Usaamah's 32 GB laptop. It preserves **0/4 required reasoning scenarios passed**, unqualified model status and all recorded failed evaluations. It is not an accepted or production-qualified AI release.

## Scope and provenance

All application code, Cedar code, shared backend services, prompts, worker/tools, scripts, 153 non-live tests, frozen evaluation datasets, migrations, deployment configuration, API contracts, dependencies and lockfile are byte-identical to the delivered archive. There is one implementation; `server/src/` remains an unused historical placeholder. Internal relative paths are preserved, with Python commands run from `server/platform/`.

294 of 307 archive files remain byte-identical. Publication changes are limited to extended `.gitignore`, replacing personal absolute paths with `<platform>/` in eight historical reports, and omitting four temporary native runtime logs. Structured resource measurements, HTTP transcripts, rejected outputs, numeric scores and failures remain available. The exact per-file publication changes and executed checks are in [the provenance manifest](backend-publication-v0.5.0.json). No database, weights, binary runtime, secret env file, cache or virtual environment is committed. Large retained historical HTTP transcripts are synthetic text evidence, not binary artifacts or customer data.

The five existing files changed outside the imported backend are `README.md`, `AGENTS.md`, `server/README.md`, `docs/api-integration.md` and `docs/integrations/README.md`. They locate the real backend/contracts, correct ownership to Daniel (backend/AI) and Usaamah (frontend/design), and remove the obsolete replacement-backend plan. New repository-level documentation comprises this report, its JSON manifest and `docs/contracts/v0.5.0/README.md`. Existing `client/` files, designs, assets, lockfiles, nested engineering instructions and root `shared/` definitions are unchanged (223 tracked files).

## Executed verification

- Clean pinned dependency installation in the new location: 33 packages, Python 3.14.7.
- Ruff lint and format checks: passed; 70 Python files.
- Complete non-live regression: **153 passed, 4 deselected**, 57.71 seconds. One existing Starlette TestClient/httpx deprecation warning.
- Both fresh native databases migrated to Alembic `0002`; no model/metadata differences.
- Both independent API processes: `/health` and `/ready` returned 200; unauthenticated protected reads returned 401 and authenticated reads returned 200.
- Durable worker started and wrote a database heartbeat without a loaded model; all owned smoke-test processes stopped afterwards.
- API/event/schema re-export: byte-identical to authoritative archived contracts.
- Recorded real-model transcript regraded after relocation: still **0/4**, unqualified. Actual-model evaluation CLI help resolves. No new inference or substituted successful output.
- Staged-file audit: no working credentials, private paths, databases, weights, runtime binaries, env files or caches. No frontend/root-shared changes. Only this integration commit is introduced from existing `main` history.

Two unchanged historical documentation files contain old whitespace findings (`QUALITY.md` and `live-model-tests.xml`); their evidence is preserved. No runtime/domain changes or test weakening were needed for relocation. A new PostgreSQL full-stack run, frontend adapter integration and a stronger model run were not performed in this publication task. They are not implied by native startup success.

## Clean clone and operation

```bash
git clone https://github.com/Barry1003/veriq.git
cd veriq
git switch --track origin/feat/import-veriq-platform-v0.5.0
cd server/platform
uv sync --frozen
.venv/bin/python -m scripts.bootstrap --upgrade-channels
.venv/bin/python -m pytest -q -m 'not live_ai and not full_stack'
```

Follow [the verified service commands](../server/README.md) for independent database migrations, Cedar 8101, Veriq 8100, durable worker and CPU inference 8181. That guide includes explicit adaptive opt-in, private configuration loading, actual-model frozen evaluation, preserved-output handling, real Cedar-to-Veriq demo on 8620/8621, optional PostgreSQL overlays and local-runtime substitution. It is intended to work from a clean clone without the author's local credentials, databases or cached model weights.

The authoritative contract index is [docs/contracts/v0.5.0](contracts/v0.5.0/README.md). Existing frontend adapters still use provisional paths; no compatible dashboard endpoint was invented. Do not switch them to API mode until their separately scoped mapping is implemented.
