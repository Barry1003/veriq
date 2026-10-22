"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type {
  ConnectorVariantSnapshot, KnowledgeConnectorVariant,
  CustomerConnectorVariant, SourceFieldMapping,
} from "@/types/connector-variants";

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`cv-panel ${className}`.trim()}>{children}</section>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="cv-section"><h2>{title}</h2>{children}</section>;
}
function LabeledValue({ label, children }: { label: string; children: ReactNode }) {
  return <div className="cv-detail"><dt>{label}</dt><dd>{children}</dd></div>;
}
function DisplayTime({ value }: { value: string | null }) {
  if (!value) return <>Not supplied</>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>Time unavailable</>;
  return <time dateTime={value}>{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)} WAT</time>;
}
function Mappings({ mappings }: { mappings: readonly SourceFieldMapping[] }) {
  return <div className="cv-table-scroll"><table className="cv-table">
    <thead><tr><th scope="col">SOURCE FIELD</th><th scope="col">VERIQ FIELD</th><th scope="col">HANDLING</th></tr></thead>
    <tbody>{mappings.map((entry) => <tr key={entry.source}>
      <td><code>{entry.source}</code></td><td><code>{entry.target}</code></td><td>{entry.handling}</td>
    </tr>)}</tbody>
  </table></div>;
}
function Metrics({ metrics }: { metrics: ConnectorVariantSnapshot["metrics"] }) {
  return <div className="cv-metrics">{metrics.map((item) => <div className="cv-panel cv-metric" key={item.label}>
    <span className="cv-eyebrow cv-quiet">{item.label}</span>
    <strong>{item.value}</strong>
    <small>{item.detail}</small>
  </div>)}</div>;
}
function ActionLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} className={`cv-action${primary ? " cv-action-primary" : ""}`}>{children}</Link>;
}
function RowList({ rows }: { rows: readonly { label: string; content: ReactNode }[] }) {
  return <dl className="cv-info-rows">{rows.map((row) => <div key={row.label}>
    <dt>{row.label}</dt><dd>{row.content}</dd>
  </div>)}</dl>;
}

function KnowledgeScreen({ snapshot }: { snapshot: KnowledgeConnectorVariant }) {
  const [selectedId, setSelectedId] = useState("ROUTE-0297");
  const record = snapshot.records.find((r) => r.id === selectedId) ?? snapshot.records[0];
  return <article className="cv-page" aria-labelledby="cv-heading">
    <header className="cv-header"><div className="cv-overline">ADMINISTRATION / CONNECTORS / KNOWLEDGE</div>
      <h1 id="cv-heading">Knowledge Connector · {snapshot.connector.id}</h1>
      <p>Inspect authorized bank source versions, field mapping, validation decisions and resulting institutional knowledge.</p>
    </header>
    <Section title="Connector readiness and knowledge acceptance"><Metrics metrics={snapshot.metrics}/></Section>
    <Section title="Original source records and versions"><div className="cv-columns cv-source-columns">
      <Panel><div className="cv-table-scroll"><table className="cv-table cv-record-table">
        <thead><tr><th scope="col">SOURCE RECORD / VERSION</th><th scope="col">VALIDATION</th><th scope="col">KNOWLEDGE STATE</th></tr></thead>
        <tbody>{snapshot.records.map((item) => <tr key={item.id} className={item.id===selectedId ? "cv-row-selected" : undefined}>
          <td><button type="button" className="cv-record-button" aria-pressed={item.id===selectedId} onClick={()=>setSelectedId(item.id)}>{item.id} · {item.version}</button><small>{item.description}</small></td>
          <td>{item.validation === "invalid" ? "Invalid · missing field" : item.validation === "historic" ? "Validated · historic" : "Validated"}</td>
          <td>{item.knowledgeState}</td>
        </tr>)}</tbody>
      </table></div><p className="cv-context">A source version can contain accepted and rejected individual records.</p></Panel>
      <Panel className="cv-inspector"><div className="cv-eyebrow">SELECTED SOURCE / {record.id}</div>
        <h3>Gateway {record.gateway} · {record.validation === "historic" ? "historical routing" : "configured routing"}</h3>
        <dl className="cv-description-grid">
          <LabeledValue label="BANK SOURCE OWNER">{snapshot.owner}</LabeledValue>
          <LabeledValue label="SOURCE CONNECTOR">{snapshot.connector.id} · read-only</LabeledValue>
          <LabeledValue label="SCHEMA RULE">{record.schema} · {record.validation === "invalid" ? "failed" : "validated"}</LabeledValue>
          <LabeledValue label="EFFECTIVE FROM"><DisplayTime value={record.effectiveFrom}/></LabeledValue>
          <LabeledValue label="ORIGINAL EVENT"><DisplayTime value={record.originalEventAt}/></LabeledValue>
          <LabeledValue label="INGESTED INTO VERIQ"><DisplayTime value={record.ingestedAt}/></LabeledValue>
        </dl>
      </Panel>
    </div></Section>
    <Section title="Bank-source mapping and accepted relationship"><div className="cv-columns cv-mapping-columns">
      <Panel><Mappings mappings={snapshot.mappings}/><p className="cv-context">Original validity and version must remain separate from ingestion time.</p></Panel>
      <Panel className="cv-policy"><div className="cv-eyebrow">STRUCTURED SOURCE ACCEPTANCE</div><h3>Policy-controlled acceptance</h3>
        <dl className="cv-description-grid">
          <LabeledValue label="AUTHORITY">Approved source registry and scope · example</LabeledValue>
          <LabeledValue label="SCHEMA">Required fields validated per record</LabeledValue>
          <LabeledValue label="TIME">Original valid time and version checked</LabeledValue>
          <LabeledValue label="POLICY RESULT">{record.validation === "invalid" ? "Blocked" : "Accepted in source-policy example"} · {record.id}</LabeledValue>
          <LabeledValue label="REJECTED SOURCE">ROUTE-0298 · missing effective_from</LabeledValue>
        </dl>
      </Panel>
    </div></Section>
    <Section title="From authorized sources to navigable institutional knowledge"><Panel className="cv-handoff">
      <div className="cv-eyebrow">SOURCE → VALIDATE → ACCEPT / REVIEW → KNOWLEDGE EXPLORER</div>
      <RowList rows={[
        {label:"Record received",content:"ROUTE-0297 and original v8 source preserved"},
        {label:"Source validator",content:"Schema v8 and effective date checked; ROUTE-0298 blocked"},
        {label:"Policy decision",content:"ROUTE-0297 accepted as a documented route relation"},
        {label:"Explorer linkage",content:"Instant Transfer → Gateway G3 / v8"},
        {label:"Investigation context",content:"Actual route usage requires independent operational evidence"},
      ]}/>
      <div className="cv-actions"><ActionLink href="/data-sources">Inspect V07 source</ActionLink><ActionLink href="/knowledge/processing">Review V08 processing</ActionLink><ActionLink primary href="/knowledge">Explore V09 relations</ActionLink></div>
    </Panel></Section>
  </article>;
}

function CustomerScreen({ snapshot }: { snapshot: CustomerConnectorVariant }) {
  const [selectedId, setSelectedId] = useState("CX-0081");
  const record = snapshot.contacts.find((c) => c.id === selectedId) ?? snapshot.contacts[0];
  return <article className="cv-page" aria-labelledby="cv-heading">
    <header className="cv-header"><div className="cv-overline">ADMINISTRATION / CONNECTORS / CUSTOMER EXPERIENCE</div>
      <h1 id="cv-heading">Customer Feed · {snapshot.connector.id}</h1>
      <p>Inspect channel authorization, original messages, normalized interactions and classification provenance.</p>
    </header>
    <Section title="Connector permissions and channel readiness"><Metrics metrics={snapshot.metrics}/></Section>
    <Section title="Authorized source channels and original interactions"><div className="cv-columns cv-source-columns">
      <Panel><div className="cv-table-scroll"><table className="cv-table cv-record-table">
        <thead><tr><th scope="col">ORIGINAL SOURCE</th><th scope="col">RECEIVED</th><th scope="col">PROCESSING</th></tr></thead>
        <tbody>{snapshot.contacts.map((contact)=><tr key={contact.id} className={selectedId === contact.id ? "cv-row-selected" : undefined}>
          <td><button className="cv-record-button" aria-pressed={selectedId === contact.id} onClick={()=>setSelectedId(contact.id)} type="button">{contact.id} · {contact.channel}</button><small>{contact.summary}</small></td>
          <td><DisplayTime value={contact.receivedAt}/></td><td>{contact.status}</td>
        </tr>)}</tbody></table></div>
        <p className="cv-context">Three original records shown from {snapshot.contactTotal} contacts. Unique customers: {snapshot.uniqueCustomers ?? "Unknown"}.</p>
      </Panel>
      <Panel className="cv-inspector"><div className="cv-eyebrow">BANK-SCOPED CUSTOMER EVIDENCE</div><h3>Source owner · {snapshot.sourceOwner}</h3>
        <dl className="cv-description-grid">
          <LabeledValue label="PERMITTED CHANNELS">In-app, call centre, branch</LabeledValue>
          <LabeledValue label="CUSTOMER IDENTITY">Masked; links require approved scope</LabeledValue>
          <LabeledValue label="ORIGINAL SOURCE IDS">Preserved and inspectable</LabeledValue>
          <LabeledValue label="SENSITIVE MESSAGE FIELDS">Minimized per source policy</LabeledValue>
          <LabeledValue label="SECRETS">Protected server-side references</LabeledValue>
          <LabeledValue label="INDEPENDENT OPERATIONS">Not required for complaint ingestion</LabeledValue>
        </dl>
      </Panel>
    </div></Section>
    <Section title="From bank-native interaction to Veriq interpretation"><div className="cv-columns cv-mapping-columns">
      <Panel><div className="cv-eyebrow">ORIGINAL REPORT / {record.id}</div>
        <div className="cv-original"><div className="cv-eyebrow cv-quiet">SOURCE MESSAGE · {record.channel.toUpperCase()}</div>
          <blockquote>{record.originalStatement ?? record.summary}</blockquote>
          <small>Source {record.id} · Case {record.caseId} · <DisplayTime value={record.receivedAt}/></small>
        </div>
        <div className="cv-eyebrow cv-spaced">NORMALIZED CUSTOMER INTERACTION / REVIEWABLE</div>
        {record.suggestedCategory ? <RowList rows={[
          {label:"issue_category",content:record.suggestedCategory},
          {label:"claimed_outcome",content:record.claimedOutcome ?? "Unknown"},
          {label:"transaction_link",content:record.transactionLink ? `${record.transactionLink} · association unverified` : "Not linked"},
          {label:"case_reference",content:record.caseId},
        ]}/> : <p className="cv-context">No normalized classification detail is supplied for this source record.</p>}
        {record.id === "CX-0081" && <ActionLink href="/customer-experience/CX-0081/classification">Inspect classification</ActionLink>}
      </Panel>
      <Panel className="cv-policy"><div className="cv-eyebrow">AI TASK + NORMALIZATION TRACE</div><h3>Interpretation ≠ financial verification</h3>
        <dl className="cv-description-grid">
          <LabeledValue label="PROCESSING TASK">classify-customer-interaction</LabeledValue>
          <LabeledValue label="INFERENCE LOCATION">Approved bank-local runtime · policy</LabeledValue>
          <LabeledValue label="MODEL IDENTITY">From task result, not assumed</LabeledValue>
          <LabeledValue label="SOURCE EVIDENCE">{record.id} original source record</LabeledValue>
          <LabeledValue label="PROCESSING OUTPUT">{record.suggestedCategory ? "Proposed category and extracted claim" : "Not available for selected record"}</LabeledValue>
          <LabeledValue label="HUMAN STATE">Review if policy requires</LabeledValue>
          <LabeledValue label="OPERATIONAL ASSOCIATION">Not assumed from message</LabeledValue>
        </dl>
      </Panel>
    </div></Section>
    <Section title="Channel mapping and intelligence handoff"><Panel className="cv-handoff">
      <div className="cv-eyebrow">SOURCE-TO-INTERACTION FIELD CONTRACT</div><Mappings mappings={snapshot.mappings}/>
      <div className="cv-actions"><ActionLink href="/customer-experience">Open V11 interactions</ActionLink><ActionLink primary href="/customer-experience/emerging-issues">Explore V12 emerging issues</ActionLink></div>
      <p className="cv-context">Customer reports are interaction evidence; independent operational monitoring can initiate investigations separately.</p>
    </Panel></Section>
  </article>;
}

export function ConnectorVariantScreen({ snapshot }: { snapshot: ConnectorVariantSnapshot }) {
  return snapshot.variant === "knowledge" ? <KnowledgeScreen snapshot={snapshot}/> : <CustomerScreen snapshot={snapshot}/>;
}

