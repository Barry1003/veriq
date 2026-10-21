import { CircleHelp, Clock3, Database, Info, Network } from "lucide-react";
import type { ReactNode } from "react";
import type {
  LocalAiRuntimeSnapshot,
  RuntimeMetric,
} from "@/types/local-ai-runtime";
import { ModelTestAction } from "./model-test-action";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="lai-section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`lai-panel ${className}`.trim()}>{children}</section>
  );
}

const metricIcons = {
  location: Network,
  registration: Database,
  reachability: CircleHelp,
  validation: Clock3,
};

function Metric({ metric }: { metric: RuntimeMetric }) {
  const Icon = metricIcons[metric.id];
  return (
    <article className="lai-panel lai-metric">
      <div className="lai-metric-label">
        <span>{metric.label}</span>
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.supportingText}</small>
    </article>
  );
}

function DetailList({
  items,
  className = "",
}: {
  items: readonly { id: string; label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl className={className}>
      {items.map((item) => (
        <div
          className={
            className === "lai-detail-list" ? "lai-detail-row" : undefined
          }
          key={item.id}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LocalAiRuntimeScreen({
  snapshot,
}: {
  snapshot: LocalAiRuntimeSnapshot;
}) {
  const test = snapshot.latestTest;
  return (
    <section className="lai-page" aria-labelledby="local-ai-runtime-title">
      <header className="lai-page-intro">
        <p className="lai-overline">
          ADMINISTRATION / V03 / BANK-CONTROLLED INTELLIGENCE
        </p>
        <h1 id="local-ai-runtime-title">Local AI Runtime</h1>
        <p>
          Configure institution-approved model inference without exporting bank
          evidence to an external vendor.
        </p>
      </header>
      <div className="lai-notice" role="note">
        <Info size={20} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <p>
            Model configuration does not prove inference readiness.
            Bank-approved runtime checks and policy controls are required.
          </p>
          <p>
            Synthetic design status only · no live model has been contacted. No
            automatic cloud fallback or unapproved evidence transfer.
          </p>
        </div>
      </div>
      <SectionHeading title="Inference posture" />
      <div className="lai-metric-grid">
        {snapshot.metrics.map((metric) => (
          <Metric key={metric.id} metric={metric} />
        ))}
      </div>
      <SectionHeading
        title="Approved inference configuration"
        description="Only administrators may change model routing and evidence-processing permissions."
      />
      <div className="lai-split lai-configuration-grid">
        <Panel>
          <p className="lai-overline">REGISTERED MODEL PROFILE</p>
          <h3>{snapshot.modelName}</h3>
          <DetailList
            items={snapshot.configuration}
            className="lai-detail-list"
          />
          <p className="lai-footnote">
            Endpoint paths, model versions and credentials require actual
            bank-side configuration.
          </p>
        </Panel>
        <Panel className="lai-policy-panel">
          <p className="lai-overline">DATA CONTROL &amp; MODEL INDEPENDENCE</p>
          <h3>Bank evidence stays under bank control</h3>
          <DetailList items={snapshot.boundary} className="lai-policy-list" />
          <p className="lai-callout">
            The deployed runtime and network policy must enforce isolation; UI
            text alone cannot guarantee it.
          </p>
        </Panel>
      </div>
      <SectionHeading
        title="Runtime validation &amp; model test"
        description="Do not infer model readiness from a stored endpoint or a previous example hypothesis."
      />
      <div className="lai-split lai-validation-grid">
        <Panel>
          <p className="lai-overline">REQUIRED TEST SEQUENCE / NOT EXECUTED</p>
          <ol className="lai-check-list">
            {snapshot.checks.map((check) => (
              <li key={check.id}>
                <span className="lai-check-number">
                  {String(check.order).padStart(2, "0")}
                </span>
                <div>
                  <strong>{check.title}</strong>
                  <small>{check.requirement}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="lai-footnote">
            Pending checks do not mean failed; they mean the system is not
            verified ready.
          </p>
        </Panel>
        <Panel className="lai-test-panel">
          <p className="lai-overline">LOCAL INFERENCE TEST</p>
          <h3>No verified result available</h3>
          <div
            className="lai-test-results"
            aria-label="Current inference-test results"
          >
            <p className="lai-overline">
              RESULT STATUS / {test.state === "not-run" ? "NOT RUN" : "UNKNOWN"}
            </p>
            <p>
              Latency:{" "}
              {test.latency === "not-measured" ? "Not measured" : "Unknown"}
            </p>
            <p>
              Model response:{" "}
              {test.modelResponse === "not-validated"
                ? "Not validated"
                : "Unknown"}
            </p>
            <p>
              Outbound policy:{" "}
              {test.outboundPolicy === "not-tested" ? "Not tested" : "Unknown"}
            </p>
          </div>
          <ModelTestAction />
        </Panel>
      </div>
      <SectionHeading
        title="AI output review &amp; institutional safety"
        description="Model predictions are traceable suggestions; evidence and human review determine case conclusions."
      />
      <div className="lai-split lai-review-grid">
        <Panel>
          <p className="lai-overline">INFERENCE SOURCE AND REVIEW CONTRACT</p>
          <dl className="lai-review-list">
            {snapshot.reviewRules.map((item) => (
              <div key={item.id}>
                <dt>{item.label}</dt>
                <dd>{item.requirement}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel className="lai-fail-safe-panel">
          <p className="lai-overline">FAIL-SAFE POLICY</p>
          <h3>Inference unavailable? Show it.</h3>
          <p>{snapshot.failSafeNotes[0]}</p>
          <p className="lai-callout">{snapshot.failSafeNotes[1]}</p>
        </Panel>
      </div>
      <p className="lai-final-note">
        DESIGN PREVIEW · Real bank-local model calls, policy tests, logs and
        runtime health must be implemented and verified by the backend and AI
        owners.
      </p>
    </section>
  );
}
