import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircleHelp,
  Database,
  MessagesSquare,
  Network,
  Search,
} from "lucide-react";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";

const kpiIcons = {
  knowledge: Network,
  operations: Activity,
  customers: MessagesSquare,
  investigations: Search,
} as const;

export function IntelligenceOverview({ data }: { data: IntelligenceOverviewData }) {
  const { operationalSignal: signal, customerSignal: customer, agentReview } = data;
  const peak = signal ? Math.max(signal.baselinePercent ?? 0, ...signal.rateObservations) : 0;
  const interactions = customer.channels.reduce((total, channel) => total + channel.count, 0);

  return (
    <section className="io-page" aria-labelledby="overview-title">
      <header className="io-intro">
        <h1 id="overview-title">Intelligence Overview</h1>
        <p>A unified view of knowledge, operational signals, customer experience, and ongoing investigations.</p>
      </header>

      <h2 className="io-section-title">Intelligence at a glance</h2>
      <div className="io-kpi-grid">
        {data.kpis.map((item) => {
          const Icon = kpiIcons[item.id] ?? CircleHelp;
          return (
            <article className="io-card io-kpi" key={item.id}>
              <div className="io-kpi-name">
                <span>{item.title}</span>
                <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <strong>{item.value}</strong>
              <p>{item.description}</p>
              <small>{item.qualification}</small>
            </article>
          );
        })}
      </div>

      <div className="io-section-heading io-agent-heading">
        <h2>AI agent · active investigation</h2>
        <p>Review the investigation context and supporting evidence.</p>
      </div>
      {agentReview ? <div className="io-agent-card io-card">
        <div className="io-agent-content">
          <span className="io-overline">{agentReview.state.toUpperCase()} · {agentReview.caseId}</span>
          <h3>{agentReview.headline}</h3>
          <p>{agentReview.origin}</p>
          <p>{agentReview.findingLimit}</p>
        </div>
        <div className="io-agent-action">
          <span className="io-overline">NEXT STEP</span>
          <p>{agentReview.nextAction}</p>
          <Link className="io-primary-action" href={`/investigations/${encodeURIComponent(agentReview.caseId)}`}>
            Open agent investigation
          </Link>
        </div>
      </div> : <div className="io-agent-card io-card"><div className="io-agent-content"><h3>Automatic processing</h3><p>{data.processingSummary ?? "No reviewable AI result is available."}</p></div></div>}

      <div className="io-section-heading">
        <h2>Latest signals across Veriq</h2>
        <p>Operational measurements and customer reports remain separate evidence sources.</p>
      </div>
      <div className="io-signals">
        {signal ? <article className="io-card io-signal">
          <span className="io-overline">SOURCE MONITORING / {signal.reference}</span>
          <h3>{signal.title}</h3>
          <div className="io-mini-stats">
            <div><strong>{peak.toFixed(1)}%</strong><small>Observed peak</small></div>
            <div><strong>{signal.baselinePercent === null ? "Not established" : `${signal.baselinePercent.toFixed(1)}%`}</strong><small>Prior baseline</small></div>
            <div><strong>{signal?.lastObservedAt ?? "Unavailable"}</strong><small>Last source event</small></div>
          </div>
          <div className="io-chart">
            <span className="io-chart-label">SOURCE SERIES · EARLIER → LATER</span>
            <div className="io-chart-bars" role="img" aria-label={`Timeout rate by five-minute window: ${signal.rateObservations.map((rate) => `${rate.toFixed(1)} percent`).join(", ")}`}>
              {signal.rateObservations.map((rate, index) => (
                <div key={index} className="io-bar-col">
                  <span>{rate.toFixed(1)}%</span>
                  <div className={`io-bar${signal.baselinePercent !== null && rate > signal.baselinePercent * 3 ? " is-elevated" : ""}`} style={{ height: `${Math.max(8, (rate / peak) * 80)}px` }} />
                </div>
              ))}
            </div>
            <div className="io-chart-details">
              <small>Baseline: {signal.baselinePercent === null ? "Not established" : `${signal.baselinePercent.toFixed(1)}%`} (reference)</small>
              <small>{signal.windowLabel}</small>
            </div>
          </div>
          <p>Operational signal only. Settlement outcomes remain unknown.</p>
          <p className="io-signal-note">Trigger source: operational telemetry · no customer complaint required</p>
        </article> : <article className="io-card io-signal"><h3>No operational incident returned</h3><p>Missing telemetry does not establish a healthy service.</p></article>}

        <article className="io-card io-signal">
          <span className="io-overline">CUSTOMER SIGNALS / {customer.reference}</span>
          <h3>{customer.title}</h3>
          <div className="io-mini-stats">
            <div><strong>{interactions}</strong><small>Logged interactions</small></div>
            <div><strong>{customer.channels.length}</strong><small>Source channels</small></div>
            <div><strong>{customer.uniqueCustomers ?? "Unknown"}</strong><small>Unique customers</small></div>
          </div>
          <div className="io-channel-list">
            <span className="io-chart-label">SOURCE CHANNEL CONTRIBUTIONS</span>
            {customer.channels.map((channel) => (
              <div key={channel.name}><span>{channel.name}</span><strong>{channel.count} interactions</strong></div>
            ))}
          </div>
          <p>Similar reports require investigation; they are not proof of a common payment failure.</p>
        </article>
      </div>

      <div className="io-section-heading io-row-title">
        <div>
          <h2>Open investigations</h2>
          <p>Investigations may originate from operational, customer, knowledge, or analyst observations.</p>
        </div>
        <Link href="/investigations">View all {data.openInvestigationsTotal}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="io-card io-table-scroll">
        <table className="io-table">
          <thead><tr><th>Reference</th><th>Observation</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {data.investigations.map((row) => (
              <tr key={row.id}>
                <td><Link className="io-case-link" href={`/investigations/${encodeURIComponent(row.id)}`}>{row.id}</Link></td>
                <td>{row.observation}</td>
                <td><span className="io-state">{row.status}</span></td>
                <td>{row.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.openInvestigationsTotal > data.investigations.length && (
          <p className="io-table-count">Showing {data.investigations.length} of {data.openInvestigationsTotal} investigations</p>
        )}
      </div>

      <div className="io-section-heading">
        <h2>Source readiness &amp; evidence gaps</h2>
        <p>Source availability, freshness, and processing are tracked independently.</p>
      </div>
      <div className="io-readiness-grid">
        <article className="io-card io-readiness">
          <Network size={20} aria-hidden="true" />
          <span>Knowledge sources</span>
          <strong>{data.knowledgeProcessedCount} {data.knowledgeCountLabel ?? "processed records"}</strong>
          <p>{data.knowledgeReviewCount === null ? "Review queue temporarily unavailable" : `${data.knowledgeReviewCount} records awaiting human review`}</p>
          <small>Source history and provenance retained</small>
        </article>
        <article className="io-card io-readiness">
          <Activity size={20} aria-hidden="true" />
          <span>Operational monitoring</span>
          <strong>Latest event: {signal?.lastObservedAt ?? "Unavailable"}</strong>
          <p>{signal ? "Measured signal received" : "No incident evidence returned"}</p>
          <small>Freshness evaluated per source</small>
        </article>
        <article className="io-card io-readiness">
          <Database size={20} aria-hidden="true" />
          <span>Reconciliation evidence</span>
          <strong>{data.reconciliationAvailable === null ? "Not assessed" : data.reconciliationAvailable ? "Available" : "Not yet available"}</strong>
          <p>Financial outcome remains unknown</p>
          <small>Settlement status unverified</small>
        </article>
      </div>
    </section>
  );
}
