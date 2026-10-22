# v0.5.0 candidate API changes

Additive adaptive investigation submission, durable step inspection and cancellation endpoints. Adds choice/assessment structured schemas, task progress and adaptive runtime outcome counts. Existing workspace/run envelopes can carry `reviewable_assessment` and explicit rejected/inconclusive outcomes. Current-source visibility can redact adaptive history/results.

Existing v0.4 paths/required request fields and legacy manual/catalog analysis remain. Automatic adaptive mode is opt-in using the existing outbox/worker deployment setting. Cedar source/API/event contracts stay frozen at v0.4.0/v1.1. No structural database migration is required beyond existing head 0002.

This is an unqualified development candidate. The frozen actual-model tests did not demonstrate successful unfamiliar adaptive reasoning; see the quality notice and engineering report. Source-reference existence/schema validity must not be rendered as verified causality or knowledge acceptance.
