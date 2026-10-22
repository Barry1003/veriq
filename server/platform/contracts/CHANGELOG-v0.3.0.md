# v0.3.0 compatibility

- Add durable queue submission, polling and bounded retry routes. No required v0.2.0 request fields were added.
- Both legacy synchronous AI routes use the same durable queue; under shared-capacity contention, 409 includes the queued task ID. Input budget overflow returns 422; a full queue returns 429. Other core ingestion routes remain operational.
- Tighten `validated_candidate`: schema validity plus conservative evidence support. Unsupported output stays in a quarantined run, with no new assertion/interaction candidate. This intentionally rejects outputs previously accepted by v0.2.0.
- Recheck unaccepted AI institutional candidates at review. Existing accepted knowledge is not retroactively deleted or changed. A reviewer cannot bypass missing support by accepting a quarantined run.
- New task states and support receipt fields live in existing flexible row envelopes. `completed` is processing completion, not model correctness. Pinned revisions are not silently advanced during a queue wait.
- OpenAPI versions are 0.3.0. Event v1.1, source bindings, channel native schemas, financial authority and all earlier required request fields remain.
- Default developer provisioning selects 0.5B; no mandatory cloud AI service. The user-requested 1.5B trial used an explicit relaxed resource-guard flag, not an implicit larger-model requirement.
