"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConnectorGateState, ConnectorValidationView } from "@/types/connector-workflow";

const stateLabels: Record<ConnectorGateState, string> = {
  approved: "Approved",
  connected: "Connected",
  received: "Received",
  failed: "Failed",
  blocked: "Blocked",
  unknown: "Unknown",
  "not-run": "Not run",
};

export function ConnectorValidationScreen({
  result,
}: {
  result: ConnectorValidationView;
}) {
  const [feedback, setFeedback] = useState("");
  const isExample = result.kind === "example";
  const original = isExample ? result.original : null;

  function handleRetry() {
    setFeedback("No authenticated test endpoint is connected. No new test was run.");
  }

  return (
    <section className="cw-page" aria-labelledby="cw-validate-title">
      <header className="cw-page-head">
        <p className="cw-eyebrow">ADMINISTRATION / CONNECTORS / VALIDATION</p>
        <h1 id="cw-validate-title">Test connector and inspect data flow</h1>
        <p>Validate permissions, network access, source records and processing separately before activation.</p>
        <div className="cw-mode-label" role="status">
          {isExample ? "Recorded example result" : "No connector test run"}
        </div>
        <Link className="cw-button cw-button-secondary cw-mobile-return" href="/administration/connectors">Connector registry</Link>
      </header>

      <section className="cw-section" aria-labelledby="cw-sequence-heading">
        <h2 id="cw-sequence-heading">{result.connectorId} · Test sequence</h2>
        <div className="cw-main-grid cw-validation-grid">
          <ol className="cw-panel cw-test-sequence">
            {result.stages.map((stage, index) => (
              <li className="cw-test-stage" key={stage.id}>
                <h3>{String(index + 1).padStart(2, "0")} · {stage.title}</h3>
                <strong className={`cw-test-state cw-test-state-${stage.state}`}>
                  {stateLabels[stage.state]}
                </strong>
                <p>{stage.detail}</p>
              </li>
            ))}
          </ol>
          <aside className="cw-panel cw-gate-result">
            <p className="cw-eyebrow">CONNECTOR GATE RESULT</p>
            <h3>Activation blocked</h3>
            <dl className="cw-definition-list">
              <div><dt>Authorization</dt><dd>{isExample ? "Approved" : "Not verified"}</dd></div>
              <div><dt>Connection</dt><dd>{isExample ? "Succeeded" : "Not run"}</dd></div>
              <div><dt>Original record</dt><dd>{isExample ? "Available · ROUTE-0298" : "Not received"}</dd></div>
              <div><dt>Mapping</dt><dd>{isExample ? "Schema validation failed" : "Not validated"}</dd></div>
              <div><dt>Processing</dt><dd>No accepted results</dd></div>
              <div><dt>Freshness</dt><dd>Unknown</dd></div>
            </dl>
            {isExample && (
              <div className="cw-validation-error">
                <span>VALIDATION ERROR</span>
                <strong>{result.validationError.code}</strong>
                <p>{result.validationError.detail}</p>
              </div>
            )}
            <button className="cw-button cw-button-primary cw-wide-button" type="button" onClick={handleRetry}>
              {isExample ? "Retry mapping validation" : "Run authorized connector test"}
            </button>
            {feedback && <p className="cw-feedback" role="status">{feedback}</p>}
          </aside>
        </div>
      </section>

      {original && (
        <section className="cw-section" aria-labelledby="cw-original-heading">
          <h2 id="cw-original-heading">Original source inspection</h2>
          <div className="cw-panel cw-original-record">
            <p className="cw-eyebrow">SOURCE SAMPLE / {original.recordId} · PRESERVED BANK ORIGINAL</p>
            <dl>
              <div><dt>Source connector</dt><dd>{original.connectorId}</dd></div>
              <div><dt>Original record ID</dt><dd>{original.recordId}</dd></div>
              <div><dt>source_route_id</dt><dd>{original.sourceRouteId}</dd></div>
              <div><dt>source_version</dt><dd>{original.sourceVersion}</dd></div>
              <div><dt>source_event_time</dt><dd>{original.sourceEventTime}</dd></div>
              <div><dt>effective_from</dt><dd>{original.effectiveFrom ?? "Missing in supplied sample · blocks acceptance"}</dd></div>
            </dl>
          </div>
        </section>
      )}

      <section className="cw-section" aria-labelledby="cw-next-heading">
        <h2 id="cw-next-heading">Next authorized actions</h2>
        <div className="cw-panel cw-next-actions">
          <p>Correct source mapping, repeat independent checks, and activate only after the bank authorizes the result.</p>
          <div className="cw-footer-actions">
            <Link className="cw-button cw-button-secondary" href="/administration/connectors/new">Edit field mapping</Link>
            <button className="cw-button cw-button-primary" type="button" onClick={handleRetry}>Repeat connector tests</button>
            <button className="cw-button cw-button-disabled" type="button" disabled title="Authorization and processing acceptance are required">Activate · locked</button>
          </div>
        </div>
      </section>
    </section>
  );
}

