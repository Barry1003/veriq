import Link from "next/link";
import {
  CircleHelp,
  Clock3,
  Database,
  Network,
  SlidersHorizontal,
  ReceiptText,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  EvidenceState,
  SystemHealthSnapshot,
} from "@/types/system-health";

function SectionIntro({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="sh-section-heading">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
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
    <section className={`sh-panel ${className}`.trim()}>{children}</section>
  );
}

function BoundaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="sh-boundary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EvidenceLabel({
  label,
  state,
}: {
  label: string;
  state: EvidenceState;
}) {
  return (
    <span className="sh-evidence" data-state={state}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="sh-panel sh-stat">
      <div className="sh-stat-label">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

export function SystemHealthScreen({
  snapshot,
}: {
  snapshot: SystemHealthSnapshot;
}) {
  const withExampleEvents = snapshot.sources.filter(
    (item) => item.lastEvent !== null,
  ).length;
  return (
    <section className="sh-page" aria-labelledby="system-health-title">
      <header className="sh-page-intro">
        <p className="sh-overline">ADMINISTRATION / V02 / DEPLOYMENT</p>
        <h1 id="system-health-title">Deployment &amp; System Health</h1>
        <p>
          Inspect institution-hosted services, source delivery, inference
          readiness and system limitations.
        </p>
      </header>

      <SectionIntro title="Deployment summary" />
      <div className="sh-stat-grid">
        <StatCard
          label="DEPLOYMENT BOUNDARY"
          value={snapshot.hostingLabel}
          hint="Self-hosted · illustration"
          icon={<Network size={20} strokeWidth={1.75} aria-hidden="true" />}
        />
        <StatCard
          label="SOURCE EVENT EXAMPLES"
          value={`${withExampleEvents} / ${snapshot.sources.length}`}
          hint="Recorded examples, not live connections"
          icon={<Database size={20} strokeWidth={1.75} aria-hidden="true" />}
        />
        <StatCard
          label="LOCAL INFERENCE"
          value={snapshot.inferenceStatus}
          hint="Configured ≠ ready"
          icon={<CircleHelp size={20} strokeWidth={1.75} aria-hidden="true" />}
        />
        <StatCard
          label="HEALTH CERTAINTY"
          value={snapshot.healthCertainty}
          hint="No live diagnostics executed"
          icon={<Clock3 size={20} strokeWidth={1.75} aria-hidden="true" />}
        />
      </div>

      <SectionIntro
        title="Local service status"
        subtitle="These entries describe last recorded evidence or pending checks, not inferred live availability."
      />
      <div className="sh-two-col sh-services-layout">
        <Panel>
          <div className="sh-table-scroll">
            <table className="sh-table">
              <thead>
                <tr>
                  <th scope="col">SERVICE / FUNCTION</th>
                  <th scope="col">LAST KNOWN EVIDENCE</th>
                  <th scope="col">READINESS</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                      <small>{service.purpose}</small>
                    </td>
                    <td>{service.evidence}</td>
                    <td>
                      <EvidenceLabel
                        state={service.state}
                        label={service.statusLabel}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sh-footnote">
            Unknown or stale must never be styled as a healthy system.
          </p>
        </Panel>
        <Panel className="sh-trust-boundary">
          <p className="sh-overline">INSTITUTION-OWNED DEPLOYMENT</p>
          <h3>{snapshot.environment}</h3>
          <div className="sh-boundary-list">
            <BoundaryItem
              label="BANK RUNTIME"
              value="Institution-controlled infrastructure"
            />
            <BoundaryItem
              label="INFERENCE LOCATION"
              value="Bank-approved local runtime"
            />
            <BoundaryItem
              label="SOURCE AUTHORIZATION"
              value="Connector-level, explicit scope"
            />
            <BoundaryItem
              label="EXTERNAL AI FALLBACK"
              value="Not configured / not assumed"
            />
            <BoundaryItem
              label="SECRETS AND CREDENTIALS"
              value="Hidden; references only"
            />
          </div>
          <p className="sh-inline-notice">
            Local deployment is an architectural intention. Verify isolation,
            permissions, secrets and audit controls in actual infrastructure.
          </p>
        </Panel>
      </div>

      <SectionIntro
        title="Source freshness &amp; evidence coverage"
        subtitle="Last ingested event time and current source freshness require separate checks."
      />
      <div className="sh-two-col sh-activity-layout">
        <Panel>
          <p className="sh-overline">OBSERVED CONNECTOR ACTIVITY / SYNTHETIC</p>
          <ul className="sh-source-list">
            {snapshot.sources.map((source) => (
              <li key={source.id} className="sh-source-row">
                <div>
                  <strong>{source.id}</strong>
                  <small>{source.description}</small>
                </div>
                <div>
                  <span>
                    {source.lastEvent
                      ? `Last recorded ${source.lastEvent}`
                      : "No source event ingested"}
                  </span>
                  <small>{source.freshness}</small>
                </div>
              </li>
            ))}
          </ul>
          <p className="sh-footnote">
            Source data can be stale even when a connector remains authorized
            and connected.
          </p>
        </Panel>
        <Panel className="sh-diagnostics">
          <p className="sh-overline">DEPLOYMENT HEALTH CHECKS</p>
          <h3>Readiness not confirmed</h3>
          <ul>
            {snapshot.requiredChecks.map((check) => (
              <li key={check.id}>
                <strong>{check.title}</strong>
                <small>{check.requirement}</small>
              </li>
            ))}
          </ul>
          <p className="sh-inline-notice">
            Unverified, stale, failed and not configured are distinct
            conditions.
          </p>
        </Panel>
      </div>

      <SectionIntro title="Administration checks &amp; follow-through" />
      <Panel className="sh-actions-panel">
        <p className="sh-overline">
          HEALTH CHECKS REQUIRE A REAL AUTHORIZED BACKEND RESPONSE
        </p>
        <p>
          Use source timestamps, service probes, authentication scope and model
          response tests. Never hardcode healthy status.
        </p>
        <nav
          className="sh-action-links"
          aria-label="Related administration pages"
        >
          <Link className="sh-secondary-link" href="/administration/connectors">
            <Database size={17} aria-hidden="true" /> Inspect connectors
          </Link>
          <Link className="sh-primary-link" href="/administration/local-ai">
            <SlidersHorizontal size={17} aria-hidden="true" /> Test local AI
            runtime
          </Link>
          <Link className="sh-secondary-link" href="/administration/audit">
            <ReceiptText size={17} aria-hidden="true" /> View audit activity
          </Link>
        </nav>
      </Panel>
    </section>
  );
}
