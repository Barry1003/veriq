"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, CircleHelp, Database, MessagesSquare, Search, X } from "lucide-react";
import type {
  CustomerChannel,
  CustomerContact,
  CustomerInteractionSnapshot,
  CustomerIssueCategory,
  CustomerCaseStatus,
} from "@/types/customer-interactions";

type ChannelFilter = CustomerChannel | "all";
type CategoryFilter = CustomerIssueCategory | "all";
type ReviewFilter = CustomerCaseStatus | "all";

const channelLabel: Record<CustomerChannel, string> = {
  "in-app": "In-app",
  "call-centre": "Call centre",
  branch: "Branch",
};

function formatSourceTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso)) + " WAT";
}

function formatSourceDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function InspectorDatum({ title, children }: { title: string; children: ReactNode }) {
  return <div className="cx-inspector-datum"><dt>{title}</dt><dd>{children}</dd></div>;
}

function EvidenceInspector({
  selected,
  onInspect,
}: {
  selected: CustomerContact | null;
  onInspect: () => void;
}) {
  if (!selected) {
    return <aside className="cx-panel cx-inspector" aria-label="Source inspector">
      <p className="cx-overline">SOURCE INSPECTOR</p>
      <h3>No matching source</h3>
      <p>Adjust the filters to select an interaction.</p>
    </aside>;
  }
  return (
    <aside className="cx-panel cx-inspector" aria-label="Original customer interaction">
      <p className="cx-overline">SELECTED SOURCE / {selected.id}</p>
      <h3>Original customer interaction</h3>
      <dl className="cx-inspector-list">
        <InspectorDatum title="SOURCE CHANNEL">{selected.channel === "in-app" ? "Cedar in-app support" : selected.channel === "call-centre" ? "Contact centre" : "Branch service desk"}</InspectorDatum>
        <InspectorDatum title="RECEIVED AT SOURCE">{formatSourceDate(selected.receivedAt)} · {formatSourceTime(selected.receivedAt)}</InspectorDatum>
        <InspectorDatum title="VERIQ INGESTION">{selected.ingestedAt ? formatSourceTime(selected.ingestedAt) : "Not recorded in sample"}</InspectorDatum>
        <InspectorDatum title="LINKED CASE">{selected.caseId} · {selected.caseStatus === "Review" ? "under review" : selected.caseStatus.toLowerCase()}</InspectorDatum>
        <InspectorDatum title="OPTIONAL TRANSFER">{selected.transferReference ? `${selected.transferReference} · outcome unknown` : "Not linked"}</InspectorDatum>
      </dl>
      <div className="cx-inspector-quote">
        <span className="cx-overline">ORIGINAL REPORT · CUSTOMER WORDS</span>
        {selected.originalStatement ? <blockquote>“{selected.originalStatement}”</blockquote> : <p>Original statement not available in these records.</p>}
      </div>
      <div className="cx-claim-status">
        <span className="cx-overline">CUSTOMER CLAIM · UNVERIFIED OUTCOME</span>
        <p>Financial outcome: <strong>Unknown</strong></p>
      </div>
      <button className="cx-button" type="button" disabled={!selected.originalStatement} onClick={onInspect}>
        Inspect source record
      </button>
    </aside>
  );
}

export function CustomerInteractionsScreen({ snapshot }: { snapshot: CustomerInteractionSnapshot }) {
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [review, setReview] = useState<ReviewFilter>("all");
  const [selectedId, setSelectedId] = useState(snapshot.listedContacts[0]?.id ?? "");
  const originalDialog = useRef<HTMLDialogElement>(null);

  const filtered = useMemo(() => snapshot.listedContacts.filter((contact) => {
    const target = `${contact.id} ${contact.caseId} ${contact.claim} ${contact.summary} ${contact.sourceNote} ${contact.transferReference ?? ""}`.toLowerCase();
    return (!query.trim() || target.includes(query.toLowerCase().trim())) &&
      (channel === "all" || contact.channel === channel) &&
      (category === "all" || contact.issueCategory === category) &&
      (review === "all" || contact.caseStatus === review);
  }), [snapshot.listedContacts, query, channel, category, review]);

  const selected = filtered.find((contact) => contact.id === selectedId) ?? filtered[0] ?? null;
  const channelsCount = snapshot.channelSummaries.length;
  const totalFromChannels = snapshot.channelSummaries.reduce((sum, part) => sum + part.contacts, 0);

  return <section className="cx-page" aria-labelledby="cx-title">
    <header className="cx-heading">
      <div>
        <p className="cx-overline">CUSTOMER INTELLIGENCE / V11</p>
        <h1 id="cx-title">Customer Interactions</h1>
        <p>Explore authorized customer contacts across channels while preserving the original context of every report.</p>
      </div>
      <a className="cx-button cx-heading-link" href="#customer-signal">Inspect classification</a>
    </header>

    <section className="cx-section" aria-labelledby="cx-overview-title">
      <h2 id="cx-overview-title">Interaction overview</h2>
      <div className="cx-kpis">
        <article className="cx-panel cx-kpi"><MessagesSquare size={20} aria-hidden="true"/><span>LOGGED INTERACTIONS</span><strong>{snapshot.receivedCount}</strong><small>Across source channels</small></article>
        <article className="cx-panel cx-kpi"><Database size={20} aria-hidden="true"/><span>SOURCE CHANNELS</span><strong>{channelsCount}</strong><small>In-app · call centre · branch</small></article>
        <article className="cx-panel cx-kpi"><CircleHelp size={20} aria-hidden="true"/><span>UNIQUE CUSTOMERS</span><strong>{snapshot.uniqueCustomers ?? "Unknown"}</strong><small>No verified deduplicated total</small></article>
        <article className="cx-panel cx-kpi"><Search size={20} aria-hidden="true"/><span>EMERGING PATTERNS</span><strong>{snapshot.issueCount}</strong><small>Reviewable signal · {snapshot.emergingIssueId}</small></article>
      </div>
    </section>

    <section className="cx-section" aria-labelledby="cx-record-title">
      <h2 id="cx-record-title">Interaction records</h2>
      <p className="cx-supporting">Filter by origin, issue type and review status.</p>
      <div className="cx-panel cx-filters">
        <label><span>Search interactions</span><input type="search" placeholder="Source, case, phrase or reference" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label><span>Channel</span><select value={channel} onChange={e => setChannel(e.target.value as ChannelFilter)}><option value="all">All channels</option><option value="in-app">In-app</option><option value="call-centre">Call centre</option><option value="branch">Branch</option></select></label>
        <label><span>Issue category</span><select value={category} onChange={e => setCategory(e.target.value as CategoryFilter)}><option value="all">All categories</option><option value="delay">Delay</option><option value="confirmation">Confirmation</option><option value="status-inquiry">Status inquiry</option></select></label>
        <label><span>Review status</span><select value={review} onChange={e => setReview(e.target.value as ReviewFilter)}><option value="all">All records</option><option value="Review">Review</option><option value="Open">Open</option><option value="New">New</option></select></label>
        <span className="cx-results">{snapshot.receivedCount} source contacts</span>
      </div>

      <div className="cx-split">
        <div className="cx-panel cx-records">
          <div className="cx-record-scroll">
            <div className="cx-record-header" aria-hidden="true"><span>SOURCE / RECEIVED</span><span>CUSTOMER CONTACT / CLAIM</span><span>CASE / REVIEW</span></div>
            <div className="cx-record-list" aria-label="Available source interactions">
              {filtered.map(contact => <button className={`cx-record${selected?.id === contact.id ? " is-selected" : ""}`} type="button" key={contact.id} onClick={() => setSelectedId(contact.id)} aria-pressed={selected?.id === contact.id}>
                <div><strong>{contact.id}</strong><small>{channelLabel[contact.channel]} · {formatSourceTime(contact.receivedAt)}</small></div>
                <div><strong>{contact.claim}</strong><small>{contact.summary}</small><small>{contact.sourceNote}</small></div>
                <div className="cx-case-cell"><span>{contact.caseId} · {contact.caseStatus}</span><ChevronRight size={17} aria-hidden="true"/></div>
              </button>)}
              {filtered.length === 0 && <p className="cx-empty" role="status">No interactions match these filters.</p>}
            </div>
          </div>
          <p className="cx-sample-count">Showing {filtered.length} of {snapshot.listedContacts.length} available source records · {snapshot.receivedCount} contacts in the channel summary.</p>
        </div>
        <EvidenceInspector selected={selected} onInspect={() => originalDialog.current?.showModal()} />
      </div>
    </section>

    <section className="cx-section" id="customer-signal" aria-labelledby="cx-cross-title">
      <h2 id="cx-cross-title">Cross-channel intelligence</h2>
      <p className="cx-supporting">Review patterns across channels, keeping the original reports and individual cases distinct.</p>
      <div className="cx-cross-grid">
        <article className="cx-panel cx-emerging" id="emerging-issue">
          <p className="cx-overline">CUSTOMER SIGNALS / {snapshot.emergingIssueId}</p>
          <h3>{snapshot.emergingIssueTitle}</h3>
          <div className="cx-summary-mini">
            <div><strong>{totalFromChannels}</strong><span>Logged interactions </span></div>
            <div><strong>{channelsCount}</strong><span>Source channels</span></div>
            <div><strong>{snapshot.uniqueCustomers ?? "Unknown"}</strong><span>Unique customers</span></div>
          </div>
          <div className="cx-channel-breakdown">
            <span className="cx-muted-overline">SOURCE CHANNEL CONTRIBUTIONS</span>
            {snapshot.channelSummaries.map(entry => <div key={entry.channel}><span>{entry.name}</span><strong>{entry.contacts} interactions</strong></div>)}
          </div>
          <p className="cx-evidence-context">Emerging pattern: <strong>Review needed</strong> · No confirmed common cause.</p>
        </article>
        <article className="cx-panel cx-handoff">
          <p className="cx-overline">SOURCE-AWARE REVIEW</p>
          <h3>Possible emerging issue</h3>
          <dl className="cx-handoff-list">
            <div><dt>ISSUE CANDIDATE</dt><dd>Delayed or uncertain transfers</dd></div>
            <div><dt>LINKED SIGNAL</dt><dd>{snapshot.emergingIssueId} · {snapshot.receivedCount} source contacts</dd></div>
            <div><dt>UNIQUE CUSTOMERS</dt><dd>Not verified</dd></div>
            <div><dt>TRANSACTION FAILURES</dt><dd>Not established</dd></div>
            <div><dt>OPERATIONAL INCIDENT</dt><dd>{snapshot.linkedOperationalIncident} · independently initiated</dd></div>
          </dl>
          <p className="cx-inline-state">Relationship to {snapshot.linkedOperationalIncident}: <strong>Unverified</strong></p>
          <a className="cx-button" href="#cx-record-title">Inspect source contacts</a>
        </article>
      </div>
    </section>

    <dialog ref={originalDialog} className="cx-source-dialog" aria-labelledby="cx-dialog-title">
      <form method="dialog"><button type="submit" className="cx-dialog-close" aria-label="Close original report"><X size={19}/></button></form>
      <p className="cx-overline">ORIGINAL CUSTOMER REPORT</p>
      <h2 id="cx-dialog-title">{selected?.id ?? "Source record"}</h2>
      {selected?.originalStatement ? <blockquote>“{selected.originalStatement}”</blockquote> : <p>Original statement unavailable.</p>}
      <dl><div><dt>Case</dt><dd>{selected?.caseId ?? "—"}</dd></div><div><dt>Source time</dt><dd>{selected ? `${formatSourceDate(selected.receivedAt)} · ${formatSourceTime(selected.receivedAt)}` : "—"}</dd></div><div><dt>Transfer outcome</dt><dd>Unknown</dd></div></dl>
      <form method="dialog"><button className="cx-button" type="submit">Close</button></form>
    </dialog>
  </section>;
}

