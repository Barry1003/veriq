# API integration

Cedar and Veriq use separate FastAPI applications and separate browser session namespaces. The authoritative API contracts are indexed in [v0.5.0 contracts](contracts/v0.5.0/README.md); the current endpoint map is [LIVE-DEMO.md](../server/platform/contracts/LIVE-DEMO.md).

Use the [named localhost rehearsal and browser setup](../server/platform/docs/runbook.md#separate-browser-sessions-local-demonstration) to provision ignored, server-only frontend environments and distinct customer, staff, operator, administrator and investigator logins. No backend token is entered into a browser form. The old shared Basic login and action keys have been removed.

Veriq's implemented overview, institutional knowledge, processing, source-registry and customer-interaction routes receive server-created readers selected from the authenticated session. Investigator knowledge and processing reads do not require source administration. Registry and administration routes remain administrator-only. Specialized administration, extraction, emerging-issue and temporal views still require their own live mappings; do not treat those as verified integrations.

Cedar uses server-only `CEDAR_DATA_SOURCE=preview|api`; Veriq uses `VERIQ_DATA_SOURCE=mock|api`. Build and start with the same mode. API errors never fall back to preview records. All backend reads disable caching and redirects; backend ownership, clearance, source grants and installation scope remain authoritative.

Cookies are HttpOnly and SameSite=Strict, with a four-hour lifetime. Secure follows the configured origin scheme, allowing the tested HTTP localhost setup. Protected mutations require the authenticated role, the exact configured Origin, JSON input and a session CSRF token. Customer banking is fixed to C1; staff cannot use customer or simulator actions. Restricted operator simulation is separate. This is explicit localhost demonstration authentication, not production SSO.

Transfer instructions are encrypted in a private server-side registry before the bank call. File locking serializes competing tabs. Acknowledgement requires a validated original bank response; uncertain requests reuse the exact account, route, amount and idempotency key. Support reports likewise preserve their original native ID, timestamp, text and optional transaction link, and receipts must match before acknowledgement.

Preserve the private registry, credentials and recovery secret across restarts. If a frontend is forcibly killed while holding a lock, follow the runbook's staff inspection/recovery procedure. This is a single-machine recovery mechanism, not a guarantee of exactly-once processing across independent deployments. Cedar remains the financial authority.

Never put application, source, connector, simulator, database or model credentials in `NEXT_PUBLIC_*`, client bundles, localStorage, URLs or logs. UI guards never replace backend authorization.
