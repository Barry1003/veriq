# Cedar frontend

Customer banking, staff operations and a restricted operator console backed by the separate Cedar FastAPI application.

For the localhost demonstration, follow the [named rehearsal and browser setup](../../server/platform/docs/runbook.md#separate-browser-sessions-local-demonstration). `scripts.configure_frontends` provisions an ignored, server-only `.env.local` and separate customer, staff and operator logins. Existing environment files are preserved; the old shared Basic login and action keys are no longer used.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm start --hostname localhost --port 3000
```

Open `http://localhost:3000/login`. Customer banking is fixed to C1; staff reconciliation and operator simulation require their separate accounts. Backend credentials never enter browser forms. The configured HTTP localhost origin uses an HttpOnly, SameSite=Strict session cookie; HTTPS origins require Secure cookies. All protected banking mutations check the session, role, Origin and CSRF token.

API mode reports bank errors directly and never substitutes preview balances or transactions. Pending transfer instructions and exact support reports are saved in the private request store, including across reloads and ambiguous responses. Preserve that store, credentials and recovery secret across restarts. The runbook documents recovery after a forcibly killed process.

The optional `tests/live-browser.cjs` checks a **fresh prepared named rehearsal** through real Chromium. Set `VERIQ_REHEARSAL_RUN`, install Playwright in your test environment (or set `PLAYWRIGHT_MODULE` to its module path), and set `CHROMIUM_EXECUTABLE` if Chromium is not at `/usr/bin/chromium-browser`. Run `TEST_VERIQ_BROWSER=true node tests/live-browser.cjs` with both frontends running. This creates genuine synthetic transfers and support records; it does not run during ordinary unit tests.
