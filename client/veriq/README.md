# Veriq frontend

The institutional intelligence application uses authenticated server-side readers for the overview, knowledge explorer, knowledge processing, source registry and customer interaction views. Administrative source reads and investigator knowledge reads use separate permissions. Other specialized screens remain a separate integration workstream.

Follow the [local browser setup](../../server/platform/docs/runbook.md#separate-browser-sessions-local-demonstration) to provision an ignored `.env.local` and separate administrator/investigator logins. Backend bearer credentials stay on the server.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm start --hostname localhost --port 3001
```

For the localhost onboarding demonstration, set `VERIQ_DEMO_AUTO_SESSION=true` in the ignored Veriq `.env.local` after running `scripts.configure_frontends`, then restart Veriq. Open `http://localhost:3001/onboarding`. Veriq creates the configured local administrator session on first visit, with no visible sign-in step. This switch works only with the configured localhost origin and existing server-side demo credentials; leave it disabled outside the local demonstration. Veriq and Cedar maintain independent session cookies. The demonstration uses local APIs and does not require AI inference or a cloud service.
