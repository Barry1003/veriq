import Link from "next/link";
import { attentionRecords, feeds, overviewCards } from "@/data/operations";
import { bankGet, bankGetRecentOperationalFeed, dataMode, dateLabel, type BankRow, type Transaction, type Interaction } from "@/lib/cedar-api";
import { observationsFromFeed, latestObservationForGateway } from "@/lib/telemetry";
export default async function OperationsOverview() {
    const [transactions, interactions, telemetry] = await Promise.all([
        bankGet<BankRow<Transaction>[]>("/v1/transactions"),
        bankGet<BankRow<Interaction>[]>("/v1/interactions"),
        bankGetRecentOperationalFeed(),
    ]);
    const live = dataMode === "api";
    const pending = transactions.data?.filter(item => item.data.status === "pending") ?? [];
    const observations = observationsFromFeed(telemetry.data);
    const g2 = observations.filter(item => item.gateway === "G2");
    const latestG2 = telemetry.data?.coverage_complete ? latestObservationForGateway(observations, "G2") : null;
    const stats = !live ? overviewCards : [
        { label: "G2 TIMEOUT OBSERVATION", value: latestG2 ? `${latestG2.rate.toFixed(1)}%` : "Unavailable", detail: telemetry.error ?? (latestG2 ? `${latestG2.timeouts} / ${latestG2.attempts} · ${latestG2.windowSeconds}s window · ${dateLabel(latestG2.eventTime)}` : "No gateway G2 sample returned"), href: "/staff/payment-routes" },
        { label: "UNRESOLVED SOURCE STATES", value: transactions.data ? `${pending.length} records` : "Unavailable", detail: transactions.error ?? "Pending does not establish transfer failure", href: "/staff/transactions" },
        { label: "SUPPORT INTERACTIONS", value: interactions.data ? `${interactions.data.length} contacts` : "Unavailable", detail: interactions.error ?? "Logged source reports · customers may repeat", href: "/staff/support-channels" },
        { label: "AUTHORIZED FEED SCOPES", value: "Unverified", detail: "Cedar has no staff grant-list API", href: "/staff/authorizations" },
    ];
    const followUps = !live ? attentionRecords : [
        ...(g2.length ? [{ eyebrow: "01 · GATEWAY OBSERVATION", title: "Gateway G2 observations", subtitle: `${g2.length} returned observations · ${latestG2 ? `latest ${dateLabel(latestG2.eventTime)}` : "feed coverage incomplete"}`, caveat: "Timeout evidence does not establish transfer failure.", href: "/staff/payment-routes" }] : []),
        ...pending.slice(0, 1).map(item => ({ eyebrow: "02 · FINANCIAL STATUS CHECK", title: `${item.data.transaction_id} remains pending`, subtitle: `Gateway ${item.data.gateway_id} · ${item.data.response}`, caveat: "A pending status does not establish final credit or failure.", href: `/staff/transactions?tx=${encodeURIComponent(item.data.transaction_id)}` })),
        ...(interactions.data?.length ? [{ eyebrow: "03 · SUPPORT SOURCE REVIEW", title: `${interactions.data.length} customer interaction records`, subtitle: "Original messages available through Cedar", caveat: "Customer statements remain unverified reports.", href: "/staff/support-channels" }] : []),
    ];
    return <>
    <p className="cedar-intro">Bank-side operational visibility, pending records and source-backed staff follow-through.</p>
    <div className="cedar-metrics">{stats.map(item => <Link className="cedar-metric" key={item.label} href={item.href}><span className="cedar-label">{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></Link>)}</div>
    <div className="cedar-dual">
      <section className="cedar-card cedar-panel"><span className="cedar-label">SOURCE-BACKED OPERATIONAL FOLLOW-THROUGH</span><h2>Bank records to review</h2><p>These are Cedar observations and unresolved records—not verified incidents or causes.</p>
        <div className="cedar-records">{followUps.length ? followUps.map(item => <Link key={item.eyebrow} className="cedar-record" href={item.href}><span className="cedar-label">{item.eyebrow}</span><strong>{item.title}</strong><span>{item.subtitle}</span><span>{item.caveat}</span></Link>) : <div className="cedar-placeholder">No source-backed review items are available.</div>}</div><p className="cedar-footnote">Select an item to inspect the corresponding Cedar source workspace.</p>
      </section>
      <section className="cedar-card cedar-panel"><span className="cedar-label">BANK DATA COVERAGE</span><h2>Authorization is not health</h2><p>Do not infer feed freshness from approval.</p>
        <div className="cedar-feeds">{feeds.map(feed => <Link key={feed.id} href={feed.href} className="cedar-feed"><strong>{feed.id} · {feed.label}</strong><span>{live ? "Authorization, delivery and freshness require separate verification" : feed.detail}</span></Link>)}</div>
      </section>
    </div>
    <section className="cedar-boundary"><h2>CEDAR OPERATIONS → APPROVED FEEDS → VERIQ INTELLIGENCE</h2><div className="cedar-boundary-grid">
      <article><span className="cedar-label">CEDAR SOURCE RECORDS</span><p>Payment telemetry, transaction status, support contacts and versioned knowledge.</p></article>
      <article><span className="cedar-label">BANK-SIDE ACCESS</span><p>Cedar approves source scopes and provides permitted event/document feeds.</p></article>
      <article><span className="cedar-label">SEPARATE VERIQ ANALYSIS</span><p>Veriq evaluates the evidence independently; Cedar does not insert AI findings.</p></article>
    </div></section>
    <p className="cedar-note">{live ? "LIVE CEDAR API · Missing or unauthorized sources appear as unavailable, never as synthetic results." : "FIGMA PREVIEW · All displayed counts and records are illustrative synthetic examples, not API responses."}</p>
  </>;
}

