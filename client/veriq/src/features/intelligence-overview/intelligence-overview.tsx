import Link from "next/link";
import { Activity, ArrowRight, CircleHelp, Database, Info, MessagesSquare, Network, Search } from "lucide-react";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";

const kpiIcons = { knowledge: Network, operations: Activity, customers: MessagesSquare, investigations: Search } as const;

export function IntelligenceOverview({ data }: { data: IntelligenceOverviewData }) {
  const { operationalSignal: signal, customerSignal: customer } = data;
  const peak = Math.max(...signal.rateObservations, signal.baselinePercent);
  const interactions = customer.channels.reduce((sum, channel) => sum + channel.count, 0);
  return (
    <section className="io-page" aria-labelledby="overview-title">
      <header className="io-intro"><h1 id="overview-title">Intelligence Overview</h1><p>A unified view of knowledge, operational signals, customer experience, and ongoing investigations.</p></header>
      <div className="io-disclaimer"><Info size={18} aria-hidden="true"/><span>Design preview: all counts, source records and findings below are synthetic examples—not live intelligence outputs.</span></div>

      <h2 className="io-section-title">Intelligence at a glance</h2>
      <div className="io-kpi-grid">{data.kpis.map(item=>{
        const Icon = kpiIcons[item.id as keyof typeof kpiIcons] ?? CircleHelp;
        return <div className="io-card io-kpi" key={item.id}><div className="io-kpi-name"><span>{item.title}</span><Icon size={19} strokeWidth={1.75} aria-hidden="true" /></div><strong>{item.value}</strong><p>{item.description}</p><small>{item.qualification}</small></div>;
      })}</div>

      <div className="io-section-heading io-agent-heading"><h2>AI agent · investigation context</h2><p>Design example only. This does not represent an executed agent run or completed diagnosis.</p></div>
      <div className="io-agent-card io-card"><div className="io-agent-content"><span className="io-overline">ASSESSMENT PREVIEW · NOT A LIVE AGENT RUN</span><h3>Gateway G2 timeouts need investigation</h3><p>Operational monitoring generated the example signal; no customer report was required.</p><p>Different routing records may warrant investigation. The cause and financial outcomes remain unverified.</p></div><div className="io-agent-action"><span className="io-overline">NEXT STEP</span><p>Review source evidence and request bank reconciliation records.</p><Link className="io-primary-action" href="/investigations">Open investigations</Link></div></div>

      <div className="io-section-heading"><h2>Latest signals across Veriq</h2><p>Inspect operational observations and customer reports separately before linking them in an investigation.</p></div>
      <div className="io-signals">
        <article className="io-card io-signal"><span className="io-overline">SOURCE MONITORING / {signal.reference}</span><h3>{signal.title}</h3><div className="io-mini-stats"><div><strong>{peak.toFixed(1)}%</strong><small>Observed peak</small></div><div><strong>{signal.baselinePercent.toFixed(1)}%</strong><small>Prior baseline</small></div><div><strong>{signal.lastObservedAt}</strong><small>Last source event</small></div></div><div className="io-chart"><span className="io-chart-label">SYNTHETIC SOURCE SERIES · EARLIER → LATER</span><div className="io-chart-bars" role="img" aria-label={`Six five-minute timeout rates: ${signal.rateObservations.join(", ")} percent`}>
          {signal.rateObservations.map((rate,i)=><div key={`${i}-${rate}`} className="io-bar-col"><span>{rate.toFixed(1)}%</span><div className={`io-bar${rate>signal.baselinePercent*3?" is-elevated":""}`} style={{height:`${Math.max(8,rate/peak*80)}px`}} /></div>)}
        </div><small>Baseline: {signal.baselinePercent}% · These observations do not confirm failed settlements.</small></div><p>{signal.freshness}. An operational signal may trigger an investigation without a complaint.</p></article>
        <article className="io-card io-signal"><span className="io-overline">CUSTOMER SIGNALS / {customer.reference}</span><h3>{customer.title}</h3><div className="io-mini-stats"><div><strong>{interactions}</strong><small>Logged interactions</small></div><div><strong>{customer.channels.length}</strong><small>Source channels</small></div><div><strong>{customer.uniqueCustomers ?? "Unknown"}</strong><small>Unique customers</small></div></div><div className="io-channel-list"><span className="io-chart-label">SOURCE CHANNEL CONTRIBUTIONS</span>{customer.channels.map(channel=><div key={channel.name}><span>{channel.name}</span><strong>{channel.count} interactions</strong></div>)}</div><p>Emerging pattern is a reviewable customer signal, not confirmation of payment failure or a common root cause.</p></article>
      </div>

      <div className="io-section-heading io-row-title"><div><h2>Open investigations</h2><p>Investigations may start from operational signals, customer reports, institutional knowledge, or analyst action.</p></div><Link href="/investigations">View all <ArrowRight size={16} aria-hidden="true"/></Link></div>
      <div className="io-card io-table-scroll"><table className="io-table"><thead><tr><th>Reference</th><th>Observation</th><th>Status</th><th>Updated</th></tr></thead><tbody>{data.investigations.map(row=><tr key={row.id}><td>{row.id}</td><td>{row.observation}</td><td><span className="io-state">{row.status}</span></td><td>{row.updatedAt}</td></tr>)}</tbody></table></div>

      <div className="io-section-heading"><h2>Source readiness &amp; evidence gaps</h2><p>Approval, source freshness and processing are separate—not every missing record means a healthy system.</p></div>
      <div className="io-readiness-grid"><div className="io-card io-readiness"><Network size={20}/><span>Knowledge sources</span><strong>{data.knowledgeProcessedCount} available records</strong><p>{data.knowledgeReviewCount} candidate relationship(s) need human review</p><small>Source history and provenance retained</small></div><div className="io-card io-readiness"><Activity size={20}/><span>Operational monitoring</span><strong>Latest event: {signal.lastObservedAt}</strong><p>Measured signal represented in this synthetic example</p><small>Actual source freshness requires a connected adapter</small></div><div className="io-card io-readiness"><Database size={20}/><span>Reconciliation evidence</span><strong>{data.reconciliationAvailable?"Available":"Not yet available"}</strong><p>Financial outcome remains unknown</p><small>Do not infer failed or successful settlement</small></div></div>
    </section>
  );
}
