"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { postCedarAction } from "@/lib/cedar-actions";
export function ReconcileControl({ active, transactions }: { active: boolean; transactions: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState("completed");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true);
    try {
      await postCedarAction({ action: "reconcile", transaction_id: fields.get("transaction_id"), outcome: fields.get("outcome"), rationale: fields.get("rationale"), beneficiary_verified: fields.get("beneficiary_verified") === "on" });
      setMessage("Cedar recorded the reconciliation."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Reconciliation unavailable."); }
    finally { setBusy(false); }
  }
  return <section className="cedar-card cedar-block"><h3>Reconcile a pending transfer</h3><form className="cedar-form" onSubmit={submit}><label>Transaction<select name="transaction_id" required>{transactions.map(id => <option key={id}>{id}</option>)}</select></label><label>Recorded outcome<select name="outcome" value={outcome} onChange={event => setOutcome(event.target.value)}><option value="completed">Completed</option><option value="failed">Failed</option></select></label><label>Bank rationale<input name="rationale" minLength={5} maxLength={2000} required/></label><label><input name="beneficiary_verified" type="checkbox" disabled={outcome === "failed"} style={{ width: "auto" }}/> Beneficiary receipt verified by bank evidence</label><button className="cedar-button" disabled={!active || busy || !transactions.length}>Record reconciliation</button></form>{message && <p role="status">{message}</p>}</section>;
}
