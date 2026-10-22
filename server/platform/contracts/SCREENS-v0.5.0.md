# Adaptive investigation API handoff — v0.5.0 candidate

Current Veriq contract: `api/veriq-v0.5.0.openapi.json`. Cedar stays frozen at `api/cedar-v0.4.0.openapi.json`. All previous v0.4 Veriq routes and required inputs remain supported. No frontend or Figma screen integration is claimed.

| Investigator action | API | Behaviour / permission |
|---|---|---|
| Begin adaptive investigation | POST `/v1/investigations/{id}/adaptive` | investigation permission and evidence clearance; returns durable task, HTTP 202; no user-supplied tool or model prompt |
| Observe automatic adaptive work | GET `/v1/processing/intents`; GET `/v1/inference/tasks` | Existing auth/clearance; `task=adaptive_investigation`, initiation automatic/manual; same outbox and queue |
| Inspect steps and read-only tool results | GET `/v1/inference/tasks/{id}/steps` | investigation permission plus task visibility/current source grants; returns redacted history if source visibility is lost |
| Cancel adaptive work | POST `/v1/inference/tasks/{id}/cancel` | authorized investigator/task visibility; terminal cancelled outcome invalidates running lease; no more publication |
| Retry unavailable work | Existing POST `/v1/inference/tasks/{id}/retry` | Existing finite attempts and source/revision checks; obsolete revisions require new eligible task |
| Inspect assessment | GET `/v1/investigations/{id}/workspace`; GET `/v1/inference/runs` | Assessment is pinned to `revision_id`; source revocation redacts adaptive run payloads; never accepted automatically |
| Inspect runtime | GET `/v1/inference/status` | Endpoint reachability, worker activity, durable task state and adaptive outcome counts remain separate from qualification |

Poll task and step endpoints every few seconds. There is no streaming endpoint. A queued task between steps is normal. `adaptive_progress` reports generations, tool_calls, phase and outcome. A generation can be a choice or assessment; a model generation is not necessarily a tool execution. Step records include question/action, returned evidence/provenance, time, state, model receipt and validation failure. They are concise investigative summaries, not private chain-of-thought.

Render these independently:

- Processing state: queued/running/retryable/unavailable/failed/completed.
- Adaptive outcome: investigating, assessment_requested, reviewable_assessment, inconclusive, budget_exhausted, invalid_model_output, model_error, quarantined, invalidated or cancelled.
- Source facts: model-selected field and server-read source-record value, authority/time and evidence; source truth scope must remain visible.
- Derived findings: server-checked rule/premises, not arbitrary model conclusions.
- Hypotheses: explicitly unverified model proposals, even when IDs exist; supporting/weakening relevance is model-proposed.
- Contradictions, unknowns and recommended next actions, with proposed actions requiring existing operational authority outside AI.
- Qualification: **unqualified**. Neither successful HTTP nor a reviewable assessment establishes model qualification.

The available real model failed adaptive reasoning acceptance. Show failure/uncertainty states honestly; do not display a fabricated successful tool history.

Use only bank-provisioned application user authentication. All existing scopes/clearance controls apply. Do not supply browser clients with source/feed/simulator/model/database credentials. Identity administration, banking operations, knowledge acceptance, arbitrary tool execution and source-secret provisioning remain outside model authority. No new banking or customer channel capability was added.

A latest-inference status entry may be a sanitized investigative generation receipt before any final assessment exists. Read questions/tool payloads only through the authorized step endpoint. Source-fact model inputs select IDs/fields; published proofs add values. The customer-discrepancy predicate detects literal failure language plus recorded completion; its semantic meaning still requires review.
