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

Open `http://localhost:3001/login`. Use the exact configured browser origin. Veriq and Cedar maintain independent session cookies. The demonstration uses local APIs and does not require AI inference or a cloud service.
