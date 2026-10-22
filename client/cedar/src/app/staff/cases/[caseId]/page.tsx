import Link from "next/link";
import { bankGet, dataMode, dateLabel, type BankRow, type Interaction, type Transaction } from "@/lib/cedar-api";
export default async function SupportCasePage({ params }: {
    params: Promise<{
        caseId: string;
    }>;
}) {
    const { caseId } = await params;
    const live = dataMode === "api";
    const [interaction, transactions] = await Promise.all([
        bankGet<BankRow<Interaction>[]>("/v1/interactions"),
        bankGet<BankRow<Transaction>[]>("/v1/transactions"),
    ]);
    const current = live ? interaction.data?.find(i => i.id === caseId) : null;
    const linkedId = current?.data.transaction_id;
    const linked = linkedId ? transactions.data?.find(t => t.data.transaction_id === linkedId) : null;
    return <><div className="cedar-screen-head"><div><h2>{live ? "Customer interaction detail" : "Delayed transfer inquiry"}</h2><p>{live ? `Source record ${caseId}` : "Review CASE-0192 and the underlying bank/source records."}</p></div><span className="cedar-badge neutral">{live ? "BANK RECORD" : "FIGMA PREVIEW"}</span></div>
    <div className="cedar-content-grid"><section className="cedar-card cedar-block"><span className="cedar-label">BANK-SIDE SOURCE CASE</span><h3>{live ? "Original customer statement" : "Delayed transfer inquiry"}</h3><div className="cedar-detail-stack">
      <div className="cedar-kv"><span>Record reference</span><strong>{caseId}</strong></div>
      <div className="cedar-kv"><span>Case stage</span><strong>{live ? "Not exposed by Cedar v0.4 API" : "Awaiting transaction review"}</strong></div>
      <div className="cedar-kv"><span>Originating channel</span><strong>{live ? current?.data.channel ?? "Unavailable" : "Cedar mobile banking"}</strong></div>
      <div className="cedar-kv"><span>Linked transfer</span><strong>{live ? current?.data.transaction_id ?? "Not linked" : "TX-10482 · outcome unknown"}</strong></div>
      <div className="cedar-kv"><span>Financial state</span><strong>{live ? linked?.data.status ?? "Not established" : "Unknown · requires authorized evidence"}</strong></div>
      <div className="cedar-kv"><span>Reported at</span><strong>{live ? dateLabel(current?.data.occurred_at) : "21 Oct 2026 · 14:08 WAT"}</strong></div>
    </div><div className="cedar-note">{live ? current?.data.text ?? interaction.error ?? "No source record found." : "Customer says they were debited but the recipient has not confirmed credit. This statement is not conclusive evidence of financial outcome."}</div></section>
    <aside className="cedar-card cedar-block"><span className="cedar-label">SOURCE CONTEXT</span><h3>Staff case · source status</h3><div className="cedar-line-list"><div className="cedar-line"><div><strong>Customer report</strong><small>Original reported statement remains unchanged.</small></div></div><div className="cedar-line"><div><strong>Bank resolution</strong><small>Support-case closure differs from financial settlement.</small></div></div><div className="cedar-line"><div><strong>Verification</strong><small>Link a transfer only through authorized source evidence.</small></div></div></div></aside></div>
    <div className="cedar-actions"><Link className="cedar-button secondary" href="/staff/support-channels">← Back to customer interactions</Link><Link className="cedar-button" href="/staff/transactions">Review transactions →</Link></div>
  </>;
}

