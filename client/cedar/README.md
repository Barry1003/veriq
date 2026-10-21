# Cedar frontend

Cedar is the banking frontend that will interact with Veriq through authorized APIs. It is intentionally a foundation-only app while product screens are being designed.

Application code lives in `src/`: routes in `app`, reusable UI in `components`, domain work in `features`, typed fixtures in `data`, and mock/API selection in `services`.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm type-check
pnpm build
```

The default data source is mock data. See the repository-level architecture documentation for the mock-to-API boundary.
