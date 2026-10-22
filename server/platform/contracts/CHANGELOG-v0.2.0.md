# Contract changes in v0.2.0

Existing v0.1.0 API paths and required request fields are retained. The v0.1.0 OpenAPI snapshots and source-envelope v1.0 schema remain in this package. Automated compatibility tests check retained paths/methods and required request fields.

Additions:

- Cedar native channel intake: `/v1/channels/in-app/messages`, `/v1/channels/email/messages`, `/v1/channels/contact-centre/transcripts`, `/v1/channels/branch/visits`, and channel activity `GET /v1/channels`.
- Cedar authorized documents: `POST` and `GET /v1/institutional/documents`.
- New native request schemas: in-app message, email message, call transcript, branch visit.
- Source registration optionally binds a channel and adapter ID. Existing registrations remain valid. Channel-bound sources enforce their native provenance at ingestion.
- Interaction responses add source ID, native record ID and optional adapter origin. AI interpretations add a durable inference-run ID; candidate assertions identify their originating AI run. AI run responses add model, timing, prompt version/hash and output-schema hash where available.
- Inference status can now report actual successful task executions from the running adapter. This proves a structured model response was received, not factual correctness or authorized acceptance.

**Source-envelope version:** legacy producers continue using schema `1.0` without `origin`; immutable digests remain unchanged. New channel adapters emit schema `1.1` with `{adapter_id,native_record_id,normalized_at}` origin. v0.1.0 consumers reject these new envelopes; upgrade Veriq before enabling channel v1.1 producers. The new `events/source-envelope-v1.1.schema.json` explicitly declares this version change. Legacy `/v1/interactions` retains its shared `cedar-service` feed behavior and does not pretend to be four external integrations.

The source schema version change is isolated from the retained `/v1` HTTP route namespace. The application/OpenAPI release is v0.2.0. No required field was silently added to an existing browser request.
