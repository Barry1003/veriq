# Veriq frontend

Veriq is the institutional intelligence frontend. It is intentionally a foundation-only app while product screens are being designed.

Application code lives in `src/`: routes in `app`, reusable UI in `components`, domain work in `features`, typed fixtures in `data`, and mock/API selection in `services`.

```bash
npm install
npm run dev
npm run lint
npm run type-check
npm run build
```

The default data source is mock data. See the repository-level architecture documentation for the mock-to-API boundary.
