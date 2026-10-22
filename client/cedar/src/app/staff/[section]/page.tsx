import { ReconcileControl } from "@/components/reconcile-control";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bankGet, bankGetRecentOperationalFeed, dataMode, dateLabel, naira, type BankRow, type Transaction, type Interaction, type Knowledge, type Channel, } from "@/lib/cedar-api";
import { authorizations, institutionalSources, interactions, transactions } from "@/data/operations";
import { observationsFromFeed, latestObservationForGateway } from "@/lib/telemetry";
const descriptions: Record<string, string> = {
    "payment-routes": "Inspect original gateway telemetry with a defined window, route scope and source qualifications.",
    transactions: "Inspect transaction statuses and settlement evidence.",
    "support-channels": "Nine logged interactions across three channels; unique-customer count not determined.",
    "institutional-sources": "Versioned Cedar documentation, routes and procedures.",
    authorizations: "Review the bank-to-Veriq source categories and their authorization boundaries.",
};
function Header({ heading, description, live }: {
    heading: string;
    description: string;
    live: boolean;
}) {
    return <header className="cedar-screen-head"><div><h2>{heading}</h2><p>{description}</p></div><span className={`cedar-badge ${live ? "" : "neutral"}`}>{live ? "CEDAR API" : "FIGMA PREVIEW"}</span></header>;
}
function Missing({ message }: {
    message?: string | null;
}) {
    return <div className="cedar-placeholder"><div><strong>Source not available</strong>{message ?? "No permitted records were returned."}</div></div>;
}
function Context({ rows }: {
    rows: {
        title: string;
        text: string;
    }[];
}) {
    return <aside className="cedar-card cedar-block"><span className="cedar-label">SOURCE CONTEXT</span><h3>Evidence boundaries</h3><div className="cedar-detail-stack">{rows.map(item => <div key={item.title} className="cedar-kv"><span>{item.title}</span><strong>{item.text}</strong></div>)}</div></aside>;
}
async function PaymentRoutes() {
    const result = await bankGetRecentOperationalFeed();
    const live = dataMode === "api";
    const observations = observationsFromFeed(result.data);
    const latestG1 = result.data?.coverage_complete ? latestObservationForGateway(observations, "G1") : null;
    const latestG2 = result.data?.coverage_complete ? latestObservationForGateway(observations, "G2") : null;
    const rows = live ? observations.slice(0, 40).map(item => ({
        id: item.id,
        gateway: item.gateway,
        route: item.route,
        count: String(item.timeouts),
        attempts: item.attempts.toLocaleString("en-NG"),
        rate: `${item.rate.toFixed(1)}%`,
        detail: `${item.id} · ${item.windowSeconds}s window · ${dateLabel(item.eventTime)}`,
    })) : [
        { id: "OPS-00128", gateway: "G1", route: "R2", count: "41", attempts: "1,000", rate: "4.1%", detail: "OPS-00128 · 300s window · 21 Oct 2026 · 14:06 WAT" },
        { id: "OPS-00129", gateway: "G2", route: "R3", count: "8", attempts: "1,000", rate: "0.8%", detail: "OPS-00129 · 300s window · 21 Oct 2026 · 14:06 WAT" },
    ];
    return <><Header heading="Payment route monitoring" description={descriptions["payment-routes"]} live={live}/>
    <div className="cedar-card cedar-block"><span className="cedar-label">SERVICE / SOURCE WINDOW</span><h3>{live ? "Gateway source telemetry" : "Instant Transfers · 21 Oct 2026 · 14:00–14:05 WAT"}</h3><p>Every row is an original bank observation. Separate sample windows and routes are not combined into an invented five-minute aggregate.</p></div>
    <div className="cedar-grid-four">
      {[
            ["G1 · LATEST OBSERVED RATE", live ? latestG1 ? `${latestG1.rate.toFixed(1)}%` : "Unavailable" : "4.1%", live ? latestG1 ? `${latestG1.timeouts} of ${latestG1.attempts} in ${latestG1.windowSeconds}s` : "No sample returned" : "41 timeout observations / 1,000 requests"],
            ["G2 · LATEST OBSERVED RATE", live ? latestG2 ? `${latestG2.rate.toFixed(1)}%` : "Unavailable" : "0.8%", live ? latestG2 ? `${latestG2.timeouts} of ${latestG2.attempts} in ${latestG2.windowSeconds}s` : "No G2 source returned" : "8 timeout observations / 1,000 requests"],
            ["HISTORICAL REFERENCE", live ? "Unverified" : "0.9%", "Baseline scope needs confirmation"],
            ["LATEST G1 EVENT", live ? dateLabel(latestG1?.eventTime) : "14:07", "Veriq ingestion not verified"],
        ].map(([label, value, hint]) => <div className="cedar-card cedar-stat" key={label}><span className="cedar-label">{label}</span><strong>{value}</strong><small>{hint}</small></div>)}
    </div>
    <div className="cedar-content-grid"><section className="cedar-card cedar-block"><span className="cedar-label">ROUTE MEASUREMENT EVIDENCE</span><h3>Gateway observations by route</h3><p>Rate = recorded timeouts ÷ observed attempts within that individual source window.</p>
      {rows.length ? <div className="cedar-table-container"><table className="cedar-table"><thead><tr><th>GATEWAY / ROUTE</th><th>TIMEOUTS</th><th>REQUESTS</th><th>OBSERVED RATE</th></tr></thead><tbody>{rows.map(x => <tr key={`${x.id}-${x.route}`}><td><strong>{x.gateway} · {x.route}</strong><p>{x.detail}</p></td><td>{x.count}</td><td>{x.attempts}</td><td><strong>{x.rate}</strong></td></tr>)}</tbody></table></div> : <Missing message={result.error}/>}
      <div className="cedar-note">{live ? `${observations.length} recent retrieved observations. ${result.error ?? "Feed pages scanned to the end."} ` : ""}A timeout does not establish that a transfer failed, settled or was reversed.</div>
    </section><Context rows={[
            { title: "Source identifier", text: live ? latestG1?.id ?? "No permitted observation" : "OPS-00128 · Cedar gateway telemetry" },
            { title: "Bank event time", text: live ? dateLabel(latestG1?.eventTime) : "21 Oct · 14:06:15 WAT" },
            { title: "Observed sample window", text: live ? latestG1 ? `${latestG1.windowSeconds}s` : "Unavailable" : "300s" },
            { title: "Veriq ingestion", text: "Not established by Cedar source reads" },
            { title: "Missing evidence", text: "Transaction-level reconciliation" },
        ]}/></div>
    <section className="cedar-card cedar-block"><span className="cedar-label">OPERATIONAL FOLLOW-THROUGH</span><h3>Next source checks</h3><div className="cedar-line-list"><div className="cedar-line"><strong>Inspect original telemetry</strong><span>Check time window, counts and source identity.</span></div><Link className="cedar-line cedar-link" href="/staff/transactions">Review settlement records →</Link><Link className="cedar-line cedar-link" href="/staff/institutional-sources">Check approved routing versions →</Link></div></section>
  </>;
}
async function Transactions({ selected }: {
    selected?: string;
}) {
    const result = await bankGet<BankRow<Transaction>[]>("/v1/transactions");
    const live = dataMode === "api";
    const records = live ? result.data?.map(item => ({ id: item.data.transaction_id, status: item.data.status, evidence: item.data.response, amount: naira(item.data.amount_minor), route: item.data.gateway_id, source: item })) ?? [] : transactions.map(item => ({ ...item, source: null }));
    const detail = selected ? records.find(x => x.id === selected) : records[0];
    return <><Header heading="Transaction and reconciliation records" description={descriptions.transactions} live={live}/>
    <div className="cedar-content-grid"><section className="cedar-card cedar-block"><span className="cedar-label">AUTHORITATIVE BANK RECORDS</span><h3>Transaction records</h3><p>Processing stage and final status are based only on Cedar&apos;s bank-owned records.</p>
      {records.length ? <div className="cedar-table-container"><table className="cedar-table"><thead><tr><th>REFERENCE</th><th>SOURCE OUTCOME</th><th>AMOUNT</th><th>EVIDENCE</th></tr></thead><tbody>{records.map(tx => <tr key={tx.id}><td><Link href={`/staff/transactions?tx=${encodeURIComponent(tx.id)}`}>{tx.id}</Link></td><td><span className={`cedar-status${tx.status === "completed" || tx.status === "Successful" ? " done" : ""}`}>{tx.status}</span></td><td>{tx.amount}</td><td>{tx.evidence}</td></tr>)}</tbody></table></div> : <Missing message={result.error}/>}
      <div className="cedar-note">A timeout, complaint, or support-case closure cannot independently change the financial outcome.</div>
    </section><Context rows={[
            { title: "Current selection", text: detail?.id ?? "No record selected" },
            { title: "Processing state", text: detail?.status ?? "Unavailable" },
            { title: "Gateway", text: detail?.route ?? "Unavailable" },
            { title: "Reconciliation", text: detail?.evidence ?? "No source record" },
            { title: "Authorized export", text: "Cedar may expose scoped evidence through authorized feeds" },
        ]}/></div>
    <ReconcileControl active={live} transactions={records.filter(tx => tx.status === "pending").map(tx => tx.id)}/>
  </>;
}
async function SupportChannels() {
    const [result, channelResult] = await Promise.all([
        bankGet<BankRow<Interaction>[]>("/v1/interactions"),
        bankGet<Channel[]>("/v1/channels", "channel"),
    ]);
    const live = dataMode === "api";
    const records = live ? result.data?.map(row => ({ id: row.id, time: dateLabel(row.data.occurred_at ?? row.created_at), channel: row.data.channel.replaceAll("_", " "), title: row.data.text, detail: row.data.transaction_id ? `Linked transfer · ${row.data.transaction_id}` : "No transaction link", caseId: row.id })) ?? [] : interactions;
    return <><Header heading="Customer interaction feed" description={live ? "Customer reports from the bank's native intake channels." : descriptions["support-channels"]} live={live}/>
    <div className="cedar-content-grid"><section className="cedar-card cedar-block"><span className="cedar-label">CUSTOMER REPORTS · ORIGINAL BANK RECORDS</span><h3>Latest interactions</h3><p>Each contact is an observation about customer experience, not a verified transaction outcome.</p>
      {records.length ? <div className="cedar-line-list">{records.map(item => <Link key={item.id} className="cedar-line cedar-link" href={`/staff/cases/${encodeURIComponent(item.caseId)}`}><div><small>{item.time} · {item.channel}</small><strong>{item.title}</strong><small>{item.detail}</small></div><span>Review →</span></Link>)}</div> : <Missing message={result.error}/>}
      <div className="cedar-note">Nine contacts do not necessarily represent nine unique customers or nine failed transfers.</div>
    </section><aside className="cedar-card cedar-block"><span className="cedar-label">SOURCE CONTEXT</span><h3>Original customer statements</h3><div className="cedar-detail-stack"><div className="cedar-kv"><span>Channel visibility</span><strong>{live ? channelResult.data ? `${channelResult.data.length} channel adapters` : channelResult.error ?? "Unavailable" : "In-app, call centre, branch"}</strong></div><div className="cedar-kv"><span>Count interpretation</span><strong>Interactions ≠ unique customers</strong></div><div className="cedar-kv"><span>Case linkage</span><strong>Preserve transaction evidence boundaries</strong></div><div className="cedar-kv"><span>Case backend</span><strong>{live ? "No dedicated Cedar case endpoint in v0.4.0" : "Preview-only case number"}</strong></div></div></aside></div>
  </>;
}
async function Sources() {
    const [configurations, documents] = await Promise.all([
        bankGet<BankRow<Knowledge>[]>("/v1/institutional/configurations"),
        bankGet<BankRow<{
            text: string;
        }>[]>("/v1/institutional/documents"),
    ]);
    const live = dataMode === "api";
    const values = !live ? institutionalSources.map((s, i) => ({ id: String(i), name: s.title, version: s.version, detail: `${s.date} · Owner: ${s.owner}` })) : [
        ...(configurations.data ?? []).map(r => ({ id: r.id, name: "Cedar routing and service configuration", version: r.data.knowledge?.valid_from ? `Effective ${dateLabel(r.data.knowledge.valid_from)}` : "Effective date unavailable", detail: `${r.data.knowledge?.entities.length ?? 0} entities · ${r.data.knowledge?.relationships.length ?? 0} source relationships` })),
        ...(documents.data ?? []).map(r => ({ id: r.id, name: "Institutional document", version: dateLabel(r.created_at), detail: `${r.data.text.slice(0, 100)}${r.data.text.length > 100 ? "…" : ""}` })),
    ];
    return <><Header heading="Authoritative source registry" description={descriptions["institutional-sources"]} live={live}/>
    <div className="cedar-content-grid"><section className="cedar-card cedar-block"><span className="cedar-label">HISTORICAL RECORDS AND EFFECTIVE DATES</span><h3>Institutional knowledge sources</h3><p>Versions and effective dates remain visible. Older records are retained for historical investigations.</p>
      {values.length ? <div className="cedar-line-list">{values.map(v => <div key={v.id} className="cedar-line"><div><small>{v.version}</small><strong>{v.name}</strong><small>{v.detail}</small></div><span className="cedar-status done">Source record</span></div>)}</div> : <Missing message={configurations.error ?? documents.error}/>}
    </section><Context rows={[
            { title: "Bank knowledge", text: "Original source records belong to Cedar" },
            { title: "Historical validity", text: "Different versions can apply at different times" },
            { title: "Provenance", text: "Source identity and effective dates must be preserved" },
            { title: "Veriq processing", text: "A separate intelligence layer, not Cedar bank truth" },
        ]}/></div><div className="cedar-actions"><Link className="cedar-button secondary" href="/operator/knowledge-source-change">Update bank knowledge source →</Link></div>
  </>;
}
async function Authorizations() {
    const live = dataMode === "api";
    return <><Header heading="Integration authorization" description={descriptions.authorizations} live={live}/>
    <div className="cedar-content-grid"><section className="cedar-card cedar-block"><span className="cedar-label">INSTITUTION-CONTROLLED INTEGRATIONS</span><h3>Source category permissions</h3><p>Cedar keeps banking records. Veriq receives only eligible material through explicitly granted feeds.</p>
      <div className="cedar-line-list">{authorizations.map(item => <div className="cedar-line" key={item.title}><div><strong>{item.title}</strong><small>{item.description}</small></div><span className={`cedar-status${!live ? " done" : ""}`}>{live ? "Not verified" : item.status}</span></div>)}</div>
      <div className="cedar-note">{live ? "The Cedar v0.4 API does not expose a staff grant-list or mutation endpoint. No authorization state is inferred from working API reads." : "Preview authorization labels are synthetic design fixtures, not a live check of the Veriq source policy."}</div>
    </section><Context rows={[
            { title: "Four source categories", text: "Knowledge, operational, customer and case evidence" },
            { title: "Bank-side access", text: "Scope and read permissions require the bank's approval" },
            { title: "Data handling", text: "Source authorization differs from successful ingestion" },
            { title: "Veriq boundary", text: "Knowledge and analytical conclusions are maintained independently" },
        ]}/></div>
  </>;
}
export default async function StaffSection({ params, searchParams }: {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<{
        tx?: string;
    }>;
}) {
    const { section } = await params;
    const query = await searchParams;
    if (!(section in descriptions))
        notFound();
    switch (section) {
        case "payment-routes": return <PaymentRoutes />;
        case "transactions": return <Transactions selected={query.tx}/>;
        case "support-channels": return <SupportChannels />;
        case "institutional-sources": return <Sources />;
        case "authorizations": return <Authorizations />;
        default: notFound();
    }
}

