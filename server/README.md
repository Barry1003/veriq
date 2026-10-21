# Veriq backend

This folder is reserved for the backend application. The frontend API contract
is currently `GET /api/dashboard/summary`, returning a `DashboardSummary`:

```json
{
  "metrics": [
    { "id": "metric-one", "label": "Example", "value": 128, "changePercent": 8.2 }
  ],
  "updatedAt": "2026-10-21T09:00:00.000Z"
}
```

Suggested organization once the server framework is selected:

```text
src/
  config/        environment and application configuration
  routes/        URL and HTTP method registration
  controllers/   request/response handling
  services/      business rules
  repositories/  database access
  models/        domain and persistence models
  middleware/    authentication, validation, error handling
  utils/         shared server helpers
```

Keep credentials in server-only environment variables. Do not put secrets in
the frontend's `NEXT_PUBLIC_*` variables; Next.js exposes those values to the
browser.
