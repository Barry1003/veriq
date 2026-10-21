# Veriq frontend workspace

This repository contains two independent Next.js frontends and a preserved backend scaffold:

- `client/veriq` — institutional intelligence experience.
- `client/cedar` — Cedar banking operations experience.
- `server` — backend scaffold; intentionally unchanged by the frontend work.

See [docs/frontend-architecture.md](docs/frontend-architecture.md) for boundaries, mock data rules, and API transition guidance.

## Local development

Run each app from its own directory:

```bash
cd client/veriq && npm install && npm run dev
cd client/cedar && pnpm install && pnpm dev
```

Both apps currently use synthetic data by default and do not require a backend.
