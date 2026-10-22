import Link from "next/link";
import { Database, MessagesSquare, CircleHelp, Activity } from "lucide-react";
import type { ReactNode } from "react";
import type { EmergingIssue } from "@/types/emerging-issues";
import type { CustomerInteractionSnapshot, CustomerContact } from "@/types/customer-interactions";
import { EmergingIssueReviewDialog } from "@/features/customer-intelligence/emerging-issue-review-dialog";

function Item({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ep-item"><dt>{label}</dt><dd>{children}</dd></div>;
}

function ContactRow({ contact, prominent }: { contact: CustomerContact; prominent?: boolean }) {
  const labels: Record<CustomerContact["channel"], string> = { "in-app": "In-app", "call-centre": "Call centre", branch: "Branch", email: "Email" };
  return <tr className={prominent ? "ep-prominent" : ""}>
    <td><span className="ep-nowrap">{contact.id}</span><small>{labels[contact.channel]}</small></td>
    <td>{contact.summary}</td>
    <td>{contact.id === "CX-0081" ? "Reported transfer uncertainty" : "Candidate theme; review source"}</td>
  </tr>;
}

export function EmergingIssueEvidenceScreen({ issue, customer }: { issue: EmergingIssue; customer: CustomerInteractionSnapshot }) {
  const channels = customer.channelSummaries;
  const contactCount = channels.reduce((sum, channel) => sum + channel.contacts, 0);
  const listed = customer.listedContacts;
  const highlightedIds = ["CX-0081", "CX-0087", "CX-0090"];
  const primary = highlightedIds.map((id) => listed.find((entry) => entry.id === id)).filter((entry): entry is CustomerContact => Boolean(entry));
  const additional = listed.filter((entry) => !highlightedIds.includes(entry.id));
  const notListed = Math.max(0, contactCount - listed.length);
  const primaryFirstId = primary[0]?.id;

  return <section className="ep-page" aria-labelledby="ep-title">
    <header className="ep-intro">
      <p className="ep-overline">CUSTOMER INTELLIGENCE / PATTERN EVIDENCE</p>
      <h1 id="ep-title">Why Veriq flagged {issue.id}</h1>
      <p>Inspect source contacts, grouping explanations and unresolved uncertainty before accepting an emerging issue.</p>
    </header>

    <section className="ep-section" aria-labelledby="ep-summary-title">
      <h2 id="ep-summary-title">Pattern summary candidate</h2>
      <div className="ep-kpis">
        <article className="ep-card ep-kpi"><MessagesSquare size={18} aria-hidden="true"/><span>ORIGINAL CONTACTS</span><strong>{contactCount}</strong><small>Not unique customers</small></article>
        <article className="ep-card ep-kpi"><Database size={18} aria-hidden="true"/><span>SOURCE CHANNELS</span><strong>{channels.length}</strong><small>In-app / call centre / branch</small></article>
        <article className="ep-card ep-kpi"><Activity size={18} aria-hidden="true"/><span>CANDIDATE STATE</span><strong>Review</strong><small>Grouping awaiting source review</small></article>
        <article className="ep-card ep-kpi"><CircleHelp size={18} aria-hidden="true"/><span>FINANCIAL OUTCOMES</span><strong>Unknown</strong><small>Reconciliation evidence missing</small></article>
      </div>
    </section>

    <section className="ep-section" aria-labelledby="ep-basis-title">
      <h2 id="ep-basis-title">How the emerging pattern was identified</h2>
      <div className="ep-grid ep-basis-grid">
        <article className="ep-card ep-panel">
          <p className="ep-overline">REVIEWABLE INTERACTION CLUSTER / {issue.id}</p>
          <dl className="ep-stack">
            <Item label="SOURCE COLLECTION">{contactCount} original support contacts across three source channels.</Item>
            <Item label="NORMALIZED THEME">{issue.theme} in customer source reports.</Item>
            <Item label="TIME RELATIONSHIP">Several contacts occurred near a separately observed operational anomaly window.</Item>
            <Item label="CLASSIFICATION CONTRIBUTION">Proposed topic grouping; inspect original wording and any available processing trace.</Item>
            <Item label="REVIEW BOUNDARY">The grouping does not establish settlement failure or a common root cause.</Item>
          </dl>
        </article>
        <article className="ep-card ep-panel">
          <p className="ep-overline">SOURCES BEHIND THE {contactCount} CONTACTS</p>
          <div className="ep-channel-list">
            {channels.map((channel) => <div key={channel.channel} className="ep-channel">
              <strong>{channel.name}</strong>
              <span>{channel.contacts} contacts</span>
              <small>{listed.find((item) => item.channel === channel.channel)?.id ?? "Source reference unavailable"} and source peers</small>
            </div>)}
          </div>
          <div className="ep-subtle ep-identity"><span>UNIQUE CUSTOMER COUNT</span><strong>Unknown</strong></div>
        </article>
      </div>
    </section>

    <section className="ep-section" aria-labelledby="ep-evidence-title">
      <div className="ep-section-head"><h2 id="ep-evidence-title">Original interactions and normalized evidence</h2><Link href="/customer-experience" className="ep-text-link">View interaction register</Link></div>
      <article className="ep-card ep-table-panel">
        <div className="ep-table-scroll">
          <table className="ep-table">
            <thead><tr><th scope="col">ORIGINAL SOURCE</th><th scope="col">CUSTOMER-REPORTED EVIDENCE</th><th scope="col">VERIQ INTERPRETATION</th></tr></thead>
            <tbody>
              {primary.map((contact) => <ContactRow key={contact.id} contact={contact} prominent />)}
              {additional.map((contact) => <ContactRow key={contact.id} contact={contact} />)}
              {notListed > 0 && <tr><td>{notListed} further contacts</td><td>Individual source messages are not present in the current source snapshot.</td><td>Await original records before classification or deduplication.</td></tr>}
            </tbody>
          </table>
        </div>
        {primaryFirstId && <Link className="ep-button ep-table-action" href={`/customer-experience/${encodeURIComponent(primaryFirstId)}/classification`}>Inspect {primaryFirstId} interpretation</Link>}
      </article>
    </section>

    <section className="ep-section" aria-labelledby="ep-links-title">
      <h2 id="ep-links-title">Links to other intelligence</h2>
      <div className="ep-grid ep-cross-grid">
        <article className="ep-card ep-panel">
          <p className="ep-overline">SEPARATELY DETECTED OPERATIONAL SIGNAL</p>
          <dl className="ep-pillar-list">
            <Item label="Operational origin">INC-042 originated from gateway telemetry, not customer reports.</Item>
            <Item label="Temporal comparison">Some reports overlap an operational anomaly window; the association remains a candidate.</Item>
            <Item label="Knowledge context">{issue.historicalKnowledgeVersions.join(" / ")} documents routing history, not financial outcomes.</Item>
            <Item label="Missing verification">No authoritative reconciliation evidence for individual outcomes.</Item>
          </dl>
        </article>
        <article className="ep-card ep-panel ep-decision-panel">
          <p className="ep-overline">AUTHORIZED REVIEW</p>
          <h3>Candidate remains under review</h3>
          <p>Review original messages, duplicate contacts, source scope and contradictory evidence before accepting, rejecting or deferring the grouping.</p>
          <dl className="ep-summary-details">
            <Item label="Linked case">{issue.linkedInvestigation}</Item>
            <Item label="Financial outcome">Unknown</Item>
          </dl>
          <EmergingIssueReviewDialog issue={issue} />
        </article>
      </div>
    </section>

    <section className="ep-section" aria-labelledby="ep-actions-title">
      <h2 id="ep-actions-title">Review and handoff</h2>
      <div className="ep-card ep-handoff">
        <p className="ep-overline">FOLLOW THE SOURCE RECORDS</p>
        <p>Customer evidence may be added as investigation context without changing the operational origin of {issue.linkedInvestigation}.</p>
        <div className="ep-handoff-actions">
          <Link className="ep-button" href="/customer-experience/emerging-issues">Back to emerging issues</Link>
          <Link className="ep-button" href="/customer-experience">Inspect interactions</Link>
          <Link className="ep-button ep-button-primary" href={`/investigations?case=${encodeURIComponent(issue.linkedInvestigation)}`}>Open {issue.linkedInvestigation}</Link>
        </div>
      </div>
    </section>
  </section>;
}

