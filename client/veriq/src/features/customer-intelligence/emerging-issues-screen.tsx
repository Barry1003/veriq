"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, CircleHelp, Database, MessagesSquare, Network, Search,
} from "lucide-react";
import type { ReactNode } from "react";
import type { EmergingIssueSnapshot, EmergingIssue } from "@/types/emerging-issues";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ei-detail"><dt>{label}</dt><dd>{children}</dd></div>;
}

function EvidenceCard({ issue }: { issue: EmergingIssue }) {
  const labels = {
    "source-backed-observation": "SOURCE-BACKED OBSERVATION",
    "candidate-association": "CANDIDATE ASSOCIATION",
    "unverified-hypothesis": "UNVERIFIED HYPOTHESIS",
    "missing-authoritative-source": "MISSING AUTHORITATIVE SOURCE",
  } as const;
  return <article className="ei-panel ei-evidence-card">
    <h3>Evidence classification</h3>
    <dl className="ei-evidence-list">
      {issue.evidence.map(item => <div key={item.kind}><dt>{labels[item.kind]}</dt><dd>{item.summary}</dd></div>)}
    </dl>
  </article>;
}

export function EmergingIssuesScreen({ snapshot }: { snapshot: EmergingIssueSnapshot }) {
  const { customer, issues } = snapshot;
  const [selectedId, setSelectedId] = useState(issues[0]?.id ?? "");
  const selected = issues.find(x => x.id === selectedId) ?? issues[0];
  const contactCount = customer.channelSummaries.reduce((s, c) => s + c.contacts, 0);
  const chartCount = selected?.sourceWindows.reduce((s, window) => s + window.count, 0) ?? 0;
  const maxWindow = useMemo(() => Math.max(1, ...(selected?.sourceWindows.map(w => w.count) ?? [])), [selected]);
  const knownContacts = customer.listedContacts.map(c => c.id);
  const contributors = customer.channelSummaries;
  const allCasesVerified = issues.reduce((n, issue) => n + issue.verifiedCauses, 0);

  return <section className="ei-page" aria-labelledby="ei-title">
    <p className="ei-eyebrow">CUSTOMER INTELLIGENCE / V12</p>
    <h1 id="ei-title">Emerging Issues</h1>
    <p className="ei-lead">Review patterns across customer interactions and inspect their links to other institutional signals.</p>

    <section className="ei-section" aria-labelledby="ei-glance">
      <h2 id="ei-glance">Issue signals at a glance</h2>
      <div className="ei-kpis">
        <div className="ei-panel ei-kpi"><Search size={20} aria-hidden="true"/><span>ISSUE CANDIDATES</span><strong>{issues.length}</strong><small>{selected?.id ?? "—"} · review needed</small></div>
        <div className="ei-panel ei-kpi"><MessagesSquare size={20} aria-hidden="true"/><span>LOGGED INTERACTIONS</span><strong>{customer.receivedCount}</strong><small>Source contacts, not unique customers</small></div>
        <div className="ei-panel ei-kpi"><Database size={20} aria-hidden="true"/><span>CONTRIBUTING CHANNELS</span><strong>{contributors.length}</strong><small>In-app, call centre, branch</small></div>
        <div className="ei-panel ei-kpi"><CircleHelp size={20} aria-hidden="true"/><span>VERIFIED CAUSES</span><strong>{allCasesVerified}</strong><small>Cross-pillar relationship unverified</small></div>
      </div>
    </section>

    {issues.length > 1 && <div className="ei-issue-selector"><label htmlFor="ei-issue-choice">Emerging issue</label><select id="ei-issue-choice" value={selectedId} onChange={e => setSelectedId(e.target.value)}>{issues.map(x => <option value={x.id} key={x.id}>{x.id} · {x.title}</option>)}</select></div>}
    {selected ? <>
      <section className="ei-section" aria-labelledby="ei-selected">
        <h2 id="ei-selected">Selected emerging issue</h2>
        <p className="ei-subheading">{selected.id} · grouped reports of delayed or uncertain transfers</p>
        <div className="ei-grid ei-main-grid">
          <article className="ei-panel ei-customer-card">
            <p className="ei-overline">CUSTOMER SIGNALS / {selected.id}</p>
            <h3>{selected.title}</h3>
            <div className="ei-mini-stats"><div><strong>{contactCount}</strong><span>Logged interactions</span></div><div><strong>{contributors.length}</strong><span>Source channels</span></div><div><strong>{customer.uniqueCustomers ?? "Unknown"}</strong><span>Unique customers</span></div></div>
            <div className="ei-soft-block"><span className="ei-label">SOURCE CHANNEL CONTRIBUTIONS</span>{contributors.map(c => <div className="ei-channel-row" key={c.channel}><span>{c.name}</span><strong>{c.contacts} interactions</strong></div>)}</div>
            <p className="ei-muted">Status: <strong>Review needed</strong> · Financial outcome not verified</p>
          </article>
          <article className="ei-panel ei-details-card">
            <p className="ei-overline">PATTERN ASSESSMENT / {selected.id}</p>
            <h3>Reviewable signal</h3>
            <dl className="ei-detail-list">
              <Detail label="OBSERVED THEMES">{selected.theme}</Detail>
              <Detail label="PATTERN CLASSIFICATION">Candidate · under review</Detail>
              <Detail label="ORIGINAL SOURCE RECORDS">Customer channel interactions</Detail>
              <Detail label="UNIQUE CUSTOMERS">{customer.uniqueCustomers ?? "Unknown"}</Detail>
              <Detail label="FINANCIAL FAILURES">Not established</Detail>
              <Detail label="LINKED INVESTIGATION">{selected.linkedInvestigation} · operational origin</Detail>
            </dl>
            <Link className="ei-button" href="/customer-experience">Inspect interactions</Link>
          </article>
        </div>
      </section>

      <section className="ei-section" aria-labelledby="ei-cross">
        <h2 id="ei-cross">Related evidence across intelligence pillars</h2>
        <p className="ei-subheading">Explore relationships between sources and candidate associations.</p>
        <div className="ei-grid ei-main-grid">
          <article className="ei-panel ei-cross-card">
            <p className="ei-overline">CROSS-PILLAR CONTEXT / {selected.linkedInvestigation}</p>
            <h3>Evidence may be related; cause not verified</h3>
            <div className="ei-soft-block ei-pillars">
              <div><MessagesSquare size={16} aria-hidden="true"/><span><strong>Customer experience</strong><small>{customer.receivedCount} interactions · {knownContacts[0] ?? "Source record"} onward</small></span></div>
              <div><Activity size={16} aria-hidden="true"/><span><strong>Operational intelligence</strong><small>Gateway timeout observation · {selected.linkedOperationalSource}</small></span></div>
              <div><Network size={16} aria-hidden="true"/><span><strong>Institutional knowledge</strong><small>Routing documents · v7 / v8</small></span></div>
            </div>
            <p className="ei-overline">RELATIONSHIP CLASSIFICATION: CANDIDATE ASSOCIATION</p>
            <p className="ei-muted">Timing and subject overlap are not proof of a shared cause.</p>
          </article>
          <article className="ei-panel ei-details-card">
            <p className="ei-overline">RECORD BREAKDOWN / {contactCount} CONTACTS</p>
            <h3>Channel contributions</h3>
            <div className="ei-contributions">{contributors.map((c) => <div key={c.channel}><div className="ei-channel-row"><span>{c.name}</span><strong>{c.contacts} interactions</strong></div><small>{customer.listedContacts.find(x => x.channel === c.channel)?.id ?? "Source record"} and other source records</small></div>)}</div>
            <p className="ei-muted">Unique customers: <strong>Unknown</strong></p>
          </article>
        </div>
      </section>

      <section className="ei-section" aria-labelledby="ei-assessment">
        <h2 id="ei-assessment">Assessment &amp; follow-through</h2>
        <div className="ei-grid ei-assessment-grid">
          <EvidenceCard issue={selected} />
          <article className="ei-panel ei-review-card">
            <p className="ei-overline">REVIEW STATE / OPEN</p><h3>Assess pattern before escalation</h3>
            <p className="ei-muted">Supporting interactions, duplicate checks, source times, and contradictory evidence.</p>
            <dl className="ei-inline-list"><Detail label="Linked investigation">{selected.linkedInvestigation} · operational origin</Detail><Detail label="Financial outcome">Unknown</Detail><Detail label="Unique customers">Unknown</Detail></dl>
            <div className="ei-actions"><Link className="ei-button" href={`/investigations?case=${encodeURIComponent(selected.linkedInvestigation)}`}>Open investigation</Link><Link className="ei-button ei-button-primary" href={`/customer-experience/emerging-issues/${encodeURIComponent(selected.id)}/evidence`}>Review signal</Link></div>
          </article>
        </div>
      </section>

      <section className="ei-section" aria-labelledby="ei-time-title">
        <h2 id="ei-time-title">When interactions were received</h2>
        <p className="ei-subheading">Source-received times grouped into fifteen-minute windows.</p>
        <div className="ei-grid ei-assessment-grid">
          <article className="ei-panel ei-time-card">
            <p className="ei-overline">SOURCE CONTACTS / 21 OCT / WAT</p><h3>{chartCount} interactions across four time windows</h3>
            <div className="ei-time-chart" role="img" aria-label={selected.sourceWindows.map(w => `${w.label}: ${w.count} interactions`).join("; ")}>
              {selected.sourceWindows.map(window => <div className="ei-time-bin" key={window.label}><div className="ei-bar-space"><div className={`ei-time-bar${window.count===maxWindow?" is-peak":""}`} style={{ height: `${Math.max(7, (window.count/maxWindow)*100)}%` }} /></div><strong>{window.count}</strong><small>{window.label}</small></div>)}
            </div>
            <p className="ei-muted">Counts reflect source contacts, not unique customers.</p>
          </article>
          <article className="ei-panel ei-details-card">
            <p className="ei-overline">INTERPRETATION &amp; BASELINE</p><h3>Activity may warrant review</h3>
            <dl className="ei-inline-list"><Detail label="Within-window count">{chartCount} source interactions</Detail><Detail label="Historical baseline">Not provided</Detail><Detail label="Unique customer count">Unknown</Detail><Detail label="Verified failure count">Not established</Detail></dl>
          </article>
        </div>
      </section>
    </> : <p role="status">No emerging issue records available.</p>}

  </section>;
}

