# Example provenance — v0.5.0 candidate

- `actual-1.5b-*.synthetic.json` combines task/steps/runs from each recorded frozen **real HTTP 1.5B** case. These include failed, quarantined, inconclusive and invalidated outcomes. They are audit aggregates, not fabricated successful API responses.
- `actual-http-demo.synthetic.json` combines actual task, step and workspace responses from independent Cedar/Veriq/worker HTTP processes with the real 1.5B model. The outcome was inconclusive.
- `controlled-*.synthetic.json` contains actual API responses over persisted SQLite synthetic evidence with an **explicit model contract double**. Tool results are real server reads; model decisions/hypothesis text are controlled. These illustrate successful shapes and do not demonstrate real-model quality.

The current model input `SourceFact` selects `evidence_id` and `field`; the server adds the exact value and provenance in the published proof. `adaptive-assessment-public-v1.schema.json` describes published results; generation schemas describe untrusted proposals. A raw `assessment_proposal` in a rejected step is not a verified finding. Only validated `run.result` carries server verification statuses, and even that result remains unaccepted/reviewable.

No successful real-model assessment is supplied because none passed. Never replace these failures with controlled examples in a demonstration. All records are synthetic. Authentication headers, connector/feed/source/model/database secrets are excluded.
