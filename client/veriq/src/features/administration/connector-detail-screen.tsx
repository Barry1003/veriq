import Link from "next/link";
import {
  Activity,
  ChevronRight,
  CircleHelp,
  Database,
  Info,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ConnectorStatusAction } from "@/features/administration/connector-status-action";
import type { ConnectorDetailSnapshot } from "@/types/connector-detail";

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="cd-section-title">
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
    </header>
  );
}

function Panel({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`cd-panel ${className}`.trim()}>
      {children}
    </section>
  );
}

function ReadinessCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <article className="cd-panel cd-summary-card">
      <div className="cd-stat-header">
        <span>{label}</span>
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function DetailsList({
  entries,
}: {
  entries: readonly { label: string; value: string }[];
}) {
  return (
    <dl className="cd-details-list">
      {entries.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function displayTime(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date)} WAT`;
}

export function ConnectorDetailScreen({
  snapshot,
}: {
  snapshot: ConnectorDetailSnapshot;
}) {
  const { connector, evidence } = snapshot;
  const authorization =
    connector.authorization === "approved-example" ? "Approved" : "Unverified";
  const connection =
    connector.connection === "connected-example"
      ? "Connected"
      : "Not connected";
  const readiness = [
    {
      label: "BANK AUTHORIZATION",
      value: authorization,
      note: "Read-only operational scope · example",
      icon: Network,
    },
    {
      label: "CONNECTION STATE",
      value: connection,
      note: "Example link established; current health unknown",
      icon: Database,
    },
    {
      label: "OBSERVATION INGEST",
      value: "Received",
      note: `${evidence.sourceEventId} · original retained`,
      icon: Activity,
    },
    {
      label: "SETTLEMENT EVIDENCE",
      value: "Unavailable",
      note: "Separate reconciliation feed missing",
      icon: CircleHelp,
    },
  ];

  return (
    <article className="cd-page" aria-labelledby="cd-title">
      <header className="cd-page-header">
        <p className="cd-overline">ADMINISTRATION / V05 / CONNECTOR DETAIL</p>
        <h1 id="cd-title">Operational Feed · {connector.id}</h1>
        <p>
          Inspect bank-side authorization, field mapping, source observations,
          and evidence delivery into Veriq.
        </p>
      </header>
      <aside className="cd-truth-notice" aria-label="Evidence limitations">
        <Info size={20} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <p>
            Synthetic example · Connection and event delivery shown below do not
            represent verified live bank integrations.
          </p>
          <p>
            Authorized telemetry can trigger an operational investigation
            without a complaint; gateway timeouts cannot establish financial
            settlement outcomes.
          </p>
        </div>
      </aside>
      <SectionHeading title="Connector readiness" />
      <div className="cd-summary-grid">
        {readiness.map((entry) => (
          <ReadinessCard key={entry.label} {...entry} />
        ))}
      </div>
      <SectionHeading
        title="Authorized data flow"
        hint="Each stage has its own source identity, processing outcome and permission boundary."
      />
      <Panel className="cd-flow-panel">
        <p className="cd-overline">
          TELEMETRY → AUTHORIZATION → INGESTION → OPERATIONAL SIGNAL →
          INVESTIGATION
        </p>
        <ol
          className="cd-flow-steps"
          aria-label="Synthetic connector evidence flow"
        >
          {evidence.flow.map((stage, index) => (
            <li key={stage.id} className="cd-flow-item">
              <div className="cd-flow-card">
                <span className="cd-flow-number">
                  {String(stage.step).padStart(2, "0")}
                </span>
                <span className="cd-flow-category">{stage.category}</span>
                <strong>{stage.heading}</strong>
                <p>{stage.detail}</p>
                <small>{stage.caption}</small>
              </div>
              {index !== evidence.flow.length - 1 && (
                <ChevronRight
                  className="cd-flow-arrow"
                  size={18}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
        <div className="cd-muted-note">
          <strong>
            A received operational signal is evidence of a measured condition,
            not proof that any specific payment failed.
          </strong>
          <p>
            No customer complaint is needed to create {evidence.incidentId}.
            Reconciliation and source-scope checks are still required to
            establish outcomes.
          </p>
        </div>
      </Panel>
      <SectionHeading
        title="Source mapping &amp; authorization"
        hint="Field mappings retain bank-source meaning. Credentials and denied source classes are not exposed in the workspace."
      />
      <div className="cd-two-column cd-mapping-grid">
        <Panel>
          <p className="cd-overline">SELECTED FEED / {connector.id}</p>
          <div className="cd-table-scroller">
            <table className="cd-table cd-mapping-table">
              <thead>
                <tr>
                  <th scope="col">CEDAR ORIGINAL FIELD</th>
                  <th scope="col">VERIQ EVIDENCE FIELD</th>
                  <th scope="col">HANDLING</th>
                </tr>
              </thead>
              <tbody>
                {evidence.mappings.map((entry) => (
                  <tr key={entry.sourceField}>
                    <td>
                      <code>{entry.sourceField}</code>
                    </td>
                    <td>
                      <code>{entry.evidenceField}</code>
                    </td>
                    <td>{entry.handling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cd-footnote">
            Veriq&apos;s ingestion timestamp is recorded separately and must not
            overwrite <code>observed_at</code>.
          </p>
        </Panel>
        <Panel>
          <p className="cd-overline">BANK-SIDE ACCESS CONTRACT</p>
          <h3>Operational telemetry · read-only</h3>
          <DetailsList
            entries={[
              { label: "SOURCE OWNER", value: `Cedar ${connector.bankOwner}` },
              {
                label: "BANK AUTHORIZATION",
                value: connector.permissionLabel,
              },
              { label: "PERMITTED RECORDS", value: evidence.permittedRecords },
              { label: "NOT PERMITTED", value: evidence.prohibitedRecords },
              {
                label: "CREDENTIAL DISPLAY",
                value: "Hidden · secret reference only",
              },
            ]}
          />
          <p className="cd-footnote">
            Bank-side controls must enforce scope; a UI label is not sufficient
            security enforcement.
          </p>
        </Panel>
      </div>
      <SectionHeading
        title="Source delivery, processing &amp; incident lineage"
        hint="Review original source events, ingestion timings, detector actions and conditions that block stronger claims."
      />
      <div className="cd-two-column cd-lineage-grid">
        <Panel id="cd-source-events">
          <p className="cd-overline">OBSERVATION / {evidence.sourceEventId}</p>
          <ol className="cd-timeline">
            {evidence.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.occurredAt}>
                  {displayTime(event.occurredAt)}
                </time>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                  <small>{event.classification}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="cd-footnote">
            Source event time, ingestion time and analyst action are distinct
            audit and evidence facts.
          </p>
        </Panel>
        <Panel>
          <p className="cd-overline">CONNECTOR OBSERVABILITY</p>
          <h3>Evidence readiness by stage</h3>
          <DetailsList
            entries={[
              {
                label: "BANK-SIDE PERMISSION",
                value: "Approved · read-only",
              },
              {
                label: "CONNECTION",
                value: "Connected in example · live status unknown",
              },
              {
                label: "ORIGINAL SOURCE EVENT",
                value: displayTime(evidence.eventTime),
              },
              {
                label: "INGESTION",
                value: displayTime(evidence.ingestionTime),
              },
              {
                label: "OPERATIONAL DETECTION",
                value: `${evidence.signalId} · candidate`,
              },
              {
                label: "FINANCIAL RECONCILIATION",
                value: "RCN-FEED-04 · unavailable",
              },
            ]}
          />
          <div className="cd-muted-note">
            No live freshness guarantee from this snapshot. A stale feed must
            not be shown as healthy.
          </div>
        </Panel>
      </div>
      <SectionHeading title="Validation and next actions" />
      <Panel className="cd-actions-panel">
        <p className="cd-overline">INTEGRATION TESTS MUST BE SOURCE-BACKED</p>
        <p>
          Test connection · verify bank authorization · inspect latest source
          event · confirm ingestion and mapping.
        </p>
        <p>
          A successful authorization or network handshake does not prove that
          any required records have been processed.
        </p>
        <div className="cd-button-row">
          <ConnectorStatusAction />
          <a className="cd-button cd-button-secondary" href="#cd-source-events">
            View source events
          </a>
          <Link
            className="cd-button cd-button-primary"
            href="/operations"
            aria-label="Open operational monitoring"
          >
            Open V13 monitoring
          </Link>
        </div>
      </Panel>
    </article>
  );
}
