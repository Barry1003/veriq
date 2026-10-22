# Veriq/Cedar frontend contract package v0.2.0

Start with [route-to-screen mapping](SCREENS-v0.2.0.md) and [contract changes](CHANGELOG-v0.2.0.md).

- Current implemented OpenAPI: `api/veriq-v0.2.0.openapi.json` and `api/cedar-v0.2.0.openapi.json`.
- Source envelopes: legacy v1.0 is retained; new native channels use the explicitly versioned `events/source-envelope-v1.1.schema.json`.
- Native input, normalized source and AI-task schemas are in `schemas/`.
- Current genuine HTTP responses are in `examples-v0.2.0/`. They contain synthetic bank data. Historical v0.1.0 examples remain in `examples/` and the historical guide is `README-v0.1.0.md`.

The package describes implemented actions and explicitly lists unsupported screen actions. All prior API routes and required request fields are retained; new channel-native event producers require a v0.2.0 Veriq consumer. The legacy customer-service API retains its shared source behavior.

Authentication is application-specific: a Veriq token is not a Cedar banking credential. In-app customers are bound to their customer identity. Native email/contact-centre/branch recorders require a bank-authorized Cedar operations credential. Never expose source-ingestion, feed, database or simulator secrets to browser assets. Obtain an appropriate development user token privately; generated credentials are excluded from this package.

AI outputs remain candidates with source/evidence/run lineage. Show bank-recorded statuses, customer claims, hypotheses, conflicts and unknown beneficiary outcomes separately. Schema-valid model output is not automatically factually correct. Operational detection/correlation remain explicitly deterministic.
