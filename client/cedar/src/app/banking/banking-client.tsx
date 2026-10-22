"use client";
import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeftRight, LifeBuoy, ClipboardList, ChevronRight, Eye, EyeOff } from "lucide-react";
import { naira, dateLabel } from "@/lib/format";
import { parseNgnMinor } from "@/lib/amount";
import type { Account, Transaction, Interaction, BankRow } from "@/lib/cedar-api";
type Screen = "home" | "transfer" | "review" | "status" | "support" | "cases";
type Props = {
    active: boolean;
    accounts: BankRow<Account>[];
    transactions: BankRow<Transaction>[];
    interactions: BankRow<Interaction>[];
    errors: string[];
};
export function BankingClient({ active, accounts, transactions, interactions, errors }: Props) {
    const router = useRouter();
    const [screen, setScreen] = useState<Screen>("home");
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [accessKey, setAccessKey] = useState("");
    const idempotencyKey = useRef<string | null>(null);
    const reportIdentity = useRef<{ id: string; at: string } | null>(null);
    const [confirmedTransaction, setConfirmedTransaction] = useState<BankRow<Transaction> | null>(null);
    const [account, setAccount] = useState(accounts[0]?.data.account_id ?? "A1");
    const [route, setRoute] = useState("R2");
    const [amount, setAmount] = useState("50000");
    const [narration, setNarration] = useState("Interbank transfer");
    const [issueType, setIssueType] = useState("Transfer delayed or uncertain");
    const [report, setReport] = useState("My account was debited but the recipient hasn't confirmed receipt.");
    const [reference, setReference] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [resultId, setResultId] = useState("");
    const currentAccount = accounts.find(row => row.data.account_id === account) ?? accounts[0];
    const accountId = currentAccount?.data.account_id ?? account;

    const transactionsList = active ? transactions : [
        { id: "TX-10482", data: { transaction_id: "TX-10482", amount_minor: 2500000, status: "pending", response: "timeout", currency: "NGN", occurred_at: "2026-10-21T13:08:00+01:00", customer_id: "C1", account_id: "A1", route_id: "R2", gateway_id: "G2", version: 1 }, created_at: "2026-10-21T13:08:00+01:00", kind: "transaction", classification: "internal" as const },
        { id: "TX-10481", data: { transaction_id: "TX-10481", amount_minor: 8500000, status: "completed", response: "accepted", currency: "NGN", occurred_at: "2026-10-20T13:08:00+01:00", customer_id: "C1", account_id: "A1", route_id: "R1", gateway_id: "G1", version: 1 }, created_at: "2026-10-20T13:08:00+01:00", kind: "transaction", classification: "internal" as const },
    ];
    const latest = resultId ? transactionsList.find(row => row.data.transaction_id === resultId) ?? (confirmedTransaction?.data.transaction_id === resultId ? confirmedTransaction : undefined) : undefined;
    const accountAmount = active ? currentAccount ? naira(currentAccount.data.balance_minor - currentAccount.data.reserved_minor) : "Unavailable" : "₦125,000.00";
    async function submit(body: Record<string, unknown>, next: Screen) {
        if (!active || busy)
            return;
        setBusy(true);
        setStatus("");
        try {
            const response = await fetch("/api/cedar", { method: "POST", headers: { "Content-Type": "application/json", "x-cedar-action-key": accessKey }, body: JSON.stringify(body) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(typeof result.detail === "string" ? result.detail : typeof result.error === "string" ? result.error : `Cedar returned ${response.status}`);
            const txid = result?.data?.transaction_id as string | undefined;
            if (body.action === "transfer" && !txid) throw new Error("The bank did not return a transaction reference. Check source records before retrying.");
            if (body.action === "interaction") reportIdentity.current = null;
            if (txid) {
                setResultId(txid);
                setConfirmedTransaction(result as BankRow<Transaction>);
                idempotencyKey.current = null;
            }
            setStatus(txid ? `Transaction reference: ${txid}. Bank-side response: ${String(result?.data?.status ?? "unknown")}.` : `Your report has been recorded with source ID ${String(result.id ?? "unavailable")}.`);
            setScreen(next);
            router.refresh();
        }
        catch (e) {
            setStatus(e instanceof Error ? e.message : "The request could not be completed.");
        }
        finally {
            setBusy(false);
        }
    }
    const confirm = (event: FormEvent) => { event.preventDefault(); const minor = parseNgnMinor(amount); if (!minor) { setStatus("Enter a valid transfer amount in naira and kobo."); return; } if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID(); void submit({ action: "transfer", account_id: accountId, route_id: route, amount_minor: minor, idempotency_key: idempotencyKey.current }, "status"); };
    const sendReport = (event: FormEvent) => { event.preventDefault(); if (!currentAccount) { setStatus("No authorized customer account is available."); return; } if (!reportIdentity.current) reportIdentity.current = { id: crypto.randomUUID(), at: new Date().toISOString() }; void submit({ action: "interaction", message_id: reportIdentity.current.id, sent_at: reportIdentity.current.at, customer_id: currentAccount.data.customer_id, transaction_id: reference.trim() || undefined, text: `${issueType}\n${report}` }, "cases"); };
    const tabs = [
        { id: "home" as Screen, label: "Home", icon: Home },
        { id: "transfer" as Screen, label: "Transfers", icon: ArrowLeftRight },
        { id: "support" as Screen, label: "Support", icon: LifeBuoy },
        { id: "cases" as Screen, label: "My Cases", icon: ClipboardList },
    ];
    return <div className="banking-page"><div className="banking-device">
    <header className="banking-header"><Image src="/icons/cedar-mark.svg" width={27} height={30} alt="" priority/><strong>Cedar</strong><span>{active ? "SYNTHETIC BANKING" : "FIGMA PREVIEW"}</span></header>
    {active && <div className="banking-access"><label>Customer action key<input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} placeholder="Required for customer actions"/></label></div>}
    {errors.length > 0 && <div className="banking-alert">{errors.join(" · ")}</div>}
    {screen === "home" && <main className="banking-body"><span className="banking-eyebrow">YOUR ACCOUNT</span><h1>Welcome to Cedar</h1><div className="banking-balance"><span>Available balance</span><button onClick={() => setBalanceVisible(!balanceVisible)} aria-label={balanceVisible ? "Hide balance" : "Show balance"}>{balanceVisible ? <Eye size={19}/> : <EyeOff size={19}/>}</button><strong>{balanceVisible ? accountAmount : "••••••••"}</strong><small>NGN · Cedar synthetic account {currentAccount?.data.account_id ?? "A1"}</small><button className="banking-primary" onClick={() => setScreen("transfer")}>Make a transfer →</button></div><div className="banking-section-label">Recent activity</div><div className="banking-list">{transactionsList.slice(0, 4).map(row => <button key={row.data.transaction_id} className="banking-row" onClick={() => { setResultId(row.data.transaction_id); setConfirmedTransaction(null); setStatus(""); setScreen("status"); }}><span><strong>{naira(row.data.amount_minor)}</strong><small>{dateLabel(row.data.occurred_at)}</small></span><span><small>{row.data.status === "pending" ? "Outcome not confirmed" : "Recorded as completed"}</small><ChevronRight size={16}/></span></button>)}</div></main>}
    {screen === "transfer" && <main className="banking-body"><span className="banking-eyebrow">SEND MONEY</span><h1>Initiate transfer</h1><p>Select a synthetic payment route. This backend does not implement bank-list/name-enquiry or beneficiary account confirmation.</p><form className="banking-form" onSubmit={e => { e.preventDefault(); setScreen("review"); }}><label>From account<select value={accountId} onChange={e => { setAccount(e.target.value); idempotencyKey.current = null; }}>{(accounts.length ? accounts.map(x => x.data.account_id) : ["A1"]).map(id => <option key={id} value={id}>{id}</option>)}</select></label><label>Transfer route<select value={route} onChange={e => { setRoute(e.target.value); idempotencyKey.current = null; }}><option value="R1">R1 · Primary payment route</option><option value="R2">R2 · Alternative payment route</option></select></label><label>Amount (NGN)<input type="number" min="0.01" max="100000000" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); idempotencyKey.current = null; }} required/></label><label>Local note (not recorded by API)<input value={narration} onChange={e => setNarration(e.target.value)} maxLength={100}/></label><button className="banking-primary">Review transfer</button></form></main>}
    {screen === "review" && <main className="banking-body"><span className="banking-eyebrow">VERIFY DETAILS</span><h1>Review transfer</h1><div className="banking-sheet"><div><span>Account</span><strong>{account}</strong></div><div><span>Route</span><strong>{route}</strong></div><div><span>Amount</span><strong>{naira(parseNgnMinor(amount) ?? 0)}</strong></div><div><span>Local note</span><strong>{narration} · not included in bank record</strong></div></div><div className="banking-alert">This sends an actual instruction to the synthetic Cedar API. A timeout does not establish that the recipient was not credited.</div><form onSubmit={confirm}><button className="banking-primary" disabled={busy || !active || !accessKey || !currentAccount || parseNgnMinor(amount) === null}>{busy ? "Sending..." : "Confirm synthetic transfer"}</button></form>{status && <div role="status" className="banking-alert">{status}</div>}<button className="banking-text-button" onClick={() => setScreen("transfer")}>← Edit transfer details</button></main>}
    {screen === "status" && <main className="banking-body"><span className="banking-eyebrow">TRANSACTION RECORD</span><h1>Transfer status</h1><div className="banking-state"><span>{resultId || "No transaction selected"}</span><strong>{latest?.data.status === "completed" ? "Completed" : latest?.data.status === "failed" ? "Recorded failure" : latest?.data.status === "pending" ? "Outcome not confirmed" : "Status unavailable"}</strong><p>{!latest ? "The selected transaction has not been returned by Cedar yet. No other transaction status will be substituted." : latest.data.status === "pending" ? "The final outcome is not yet confirmed by Cedar's banking records." : "Status reflects Cedar's recorded evidence. A support report does not change financial finality."}</p></div>{status && <div role="status" className="banking-alert">{status}</div>}<button className="banking-primary" onClick={() => { setReference(resultId); setScreen("support"); }}>Report a problem</button><button className="banking-text-button" onClick={() => router.refresh()}>Refresh recorded status</button></main>}
    {screen === "support" && <main className="banking-body"><span className="banking-eyebrow">CUSTOMER SUPPORT</span><h1>Get support</h1><p>Tell Cedar what happened. Linking a transfer is optional; your report is not a verified financial outcome.</p><form className="banking-form" onSubmit={sendReport}><label>Issue type<select value={issueType} onChange={e => { setIssueType(e.target.value); reportIdentity.current = null; }}><option>Transfer delayed or uncertain</option><option>Other service concern</option></select></label><label>Related transaction (optional)<input value={reference} onChange={e => { setReference(e.target.value); reportIdentity.current = null; }} placeholder="Cedar transaction reference"/></label><label>Your message<textarea minLength={1} maxLength={10000} value={report} onChange={e => { setReport(e.target.value); reportIdentity.current = null; }} required/></label><button className="banking-primary" disabled={!active || busy || !accessKey}>Submit support request</button></form></main>}
    {screen === "cases" && <main className="banking-body"><span className="banking-eyebrow">BANK CUSTOMER SERVICE</span><h1>My support cases</h1><p>Track recorded customer contacts and statements. Case-resolution state is not exposed by this version of Cedar&apos;s API.</p>{status && <div className="banking-alert" role="status">{status}</div>}<div className="banking-list">{active ? (interactions.length ? interactions.slice(0, 10).map(x => <div className="banking-row" key={x.id}><span><strong>{x.data.channel.replaceAll("_", " ")}</strong><small>{x.data.text.slice(0, 110)}</small></span><small>{dateLabel(x.created_at)}</small></div>) : <div className="banking-alert">No customer support records returned.</div>) : ["CASE-0192 · Awaiting transaction review", "CASE-0185 · Under review", "CASE-0171 · Closed"].map(s => <div key={s} className="banking-row"><strong>{s}</strong><small>Preview only</small></div>)}</div><button className="banking-primary" onClick={() => setScreen("support")}>New support request</button></main>}
    <nav className="banking-tabbar" aria-label="Customer banking navigation">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={screen === id || (id === "transfer" && (screen === "review" || screen === "status")) ? "active" : ""} onClick={() => { if (id === "support" && screen !== "status") { setReference(""); reportIdentity.current = null; } setScreen(id); }}><Icon size={19}/><span>{label}</span></button>)}</nav>
  </div><aside className="banking-side"><strong>Cedar digital banking</strong><p>{active ? "Connected to the synthetic bank API, subject to individual role and account scope." : "Mobile C01–C05 · Figma-aligned synthetic preview. No transfer or case is persisted in preview mode."}</p><Link href="/staff">Open staff operations →</Link></aside></div>;
}

