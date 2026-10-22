"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseNgnMinor } from "@/lib/amount";
import type { BankRow, Knowledge } from "@/lib/cedar-api";

type Props = {
  pending: { id: string; route: string }[];
  configurations: BankRow<Knowledge>[];
  active: boolean;
  scenario?: number;
};

type CedarResult = { id?: string; error?: string; detail?: string; data?: { transaction_id?: string; status?: string }; count?: number; recorded?: number; batch_id?: string };

export function OperatorControls({ pending, configurations, active, scenario }: Props) {
  const router = useRouter();
  const [operatorKey, setOperatorKey] = useState("");
  const [gateway, setGateway] = useState("G2");
  const [timeout, setTimeoutValue] = useState(true);
  const [documentText, setDocumentText] = useState("Gateway service dependency map: G2 is the Cedar secondary gateway. This is an institution-supplied description, not a verified cause of incidents.");
  const [account, setAccount] = useState("A1");
  const [route, setRoute] = useState("R2");
  const [amount, setAmount] = useState("50000");
  const [customer, setCustomer] = useState("C1");
  const [message, setMessage] = useState("I was debited but the recipient has not confirmed the transfer.");
  const [transaction, setTransaction] = useState("");
  const [outcome, setOutcome] = useState<"completed" | "failed">("completed");
  const [verified, setVerified] = useState(false);
  const [rationale, setRationale] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("R2");
  const [selectedGateway, setSelectedGateway] = useState("G1");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const observationKey = useRef<string | null>(null);
  const transferKey = useRef<string | null>(null);
  const interactionIdentity = useRef<{ id: string; at: string } | null>(null);
  const burstIdentity = useRef<{ id: string; startedAt: string } | null>(null);

  const latest = configurations.at(-1)?.data;
  const routes = latest ? Object.keys(latest.routes) : [];
  const gateways = latest?.knowledge.entities.filter(e => e.kind === "gateway").map(e => e.native_id) ?? [];
  const routeForGateway = Object.entries(latest?.routes ?? {}).find(([, gatewayId]) => gatewayId === gateway)?.[0];

  async function run(body: Record<string, unknown>, onSuccess?: (value: CedarResult) => void) {
    if (!active || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/cedar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cedar-action-key": operatorKey },
        body: JSON.stringify(body),
      });
      const result = await response.json() as CedarResult;
      if (!response.ok) throw new Error(result.error ?? (typeof result.detail === "string" ? result.detail : `Cedar rejected the action (${response.status}).`) + (typeof result.recorded === "number" ? ` ${result.recorded} contacts were recorded before the interruption.` : ""));
      onSuccess?.(result);
      const detail = result.data?.transaction_id ? `Transaction: ${result.data.transaction_id} · ${result.data.status ?? "recorded"}` : result.count ? `${result.count} original channel records created or confirmed.` : result.id ? `Record: ${result.id}` : "Source state updated.";
      setFeedback(`Cedar confirmed the operation. ${detail}`);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The bank action could not be confirmed.");
    } finally {
      setBusy(false);
    }
  }

  const submit = (event: FormEvent, body: Record<string, unknown>, onSuccess?: (value: CedarResult) => void) => {
    event.preventDefault();
    void run(body, onSuccess);
  };

  function transferBody(from: string, selected: string, rawAmount: string, identity: { current: string | null }) {
    const minor = parseNgnMinor(rawAmount);
    if (!minor) return null;
    if (!identity.current) identity.current = crypto.randomUUID();
    return { action: "transfer", account_id: from, route_id: selected, amount_minor: minor, idempotency_key: identity.current };
  }

  function createConfiguration(event: FormEvent) {
    event.preventDefault();
    if (!latest || !latest.knowledge || !routes.length || !gateways.length) {
      setFeedback("Seed Cedar first, then choose a configured route and gateway.");
      return;
    }
    const effective = new Date().toISOString();
    if (new Date(latest.knowledge.valid_from).getTime() >= Date.parse(effective)) {
      setFeedback("The latest source version is already at or after the current time. A later effective instant is required.");
      return;
    }
    const targetRoute = routes.includes(selectedRoute) ? selectedRoute : routes[0];
    const targetGateway = gateways.includes(selectedGateway) ? selectedGateway : gateways[0];
    const relationships = latest.knowledge.relationships.map(edge => edge.subject === targetRoute && edge.predicate === "uses_gateway" ? { ...edge, object: targetGateway } : edge);
    void run({ action: "configuration", knowledge: { entities: latest.knowledge.entities, relationships, valid_from: effective } });
  }

  function createBurst(event: FormEvent) {
    event.preventDefault();
    if (!burstIdentity.current) burstIdentity.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString() };
    const { id, startedAt } = burstIdentity.current;
    void run({ action: "contact_burst", batch_id: id, started_at: startedAt, customer_id: customer, text: message, ...(transaction ? { transaction_id: transaction } : {}) }, () => { burstIdentity.current = null; });
  }

  const pendingOptions = pending.some(item => item.id === transaction) ? pending : transaction ? [...pending, { id: transaction, route }] : pending;

  return <>
    <div className="operator-access"><label htmlFor="operator-key">Operator authorization key</label><input id="operator-key" type="password" autoComplete="off" value={operatorKey} onChange={event => setOperatorKey(event.target.value)} placeholder="Locally provisioned restricted operator key"/>{feedback && <output role="status">{feedback}</output>}</div>
    <div className="operator-grid operator-panels">
      <section id="scenario-1" className="operator-form-card" hidden={scenario !== undefined && scenario !== 1}>
        <span>S01 · GATEWAY OBSERVATION</span><h3>Source-side timeout condition</h3><p>Cedar records an operational observation when a transfer is processed. Changing a gateway condition alone produces no telemetry event.</p>
        <button type="button" className="operator-action secondary" disabled={!active || busy || !operatorKey} onClick={() => void run({ action: "seed" })}>Seed synthetic bank</button>
        <form onSubmit={event => submit(event, { action: "condition", gateway_id: gateway, timeout })}>
          <label>Gateway<select value={gateway} onChange={event => setGateway(event.target.value)}><option value="G1">G1 · Primary</option><option value="G2">G2 · Secondary</option></select></label>
          <label>Simulated response<select value={timeout ? "timeout" : "success"} onChange={event => setTimeoutValue(event.target.value === "timeout")}><option value="timeout">Timeout</option><option value="success">Accepted</option></select></label>
          <button className="operator-action" disabled={!active || busy || !operatorKey}>Update gateway condition</button>
        </form>
        <form onSubmit={event => {
          event.preventDefault();
          const body = routeForGateway ? transferBody("A1", routeForGateway, "10.00", observationKey) : null;
          if (body) void run(body, () => { observationKey.current = null; });
        }}>
          <p>After setting the condition, initiate a synthetic ₦10 transfer on {routeForGateway ?? "a configured route"} for {gateway}. Cedar emits a transaction status and an original observation with its actual backend sample window.</p>
          <button className="operator-action secondary" disabled={!active || busy || !operatorKey || !routeForGateway}>Initiate payment observation</button>
        </form>
      </section>
      <section id="scenario-2" className="operator-form-card" hidden={scenario !== undefined && scenario !== 2}>
        <span>S02 · INSTITUTIONAL KNOWLEDGE</span><h3>Update effective-dated routing</h3><p>Submit a new Cedar configuration from the latest bank source. Prior source versions stay in the registry.</p>
        <form onSubmit={createConfiguration}>
          <label>Configured route<select value={routes.includes(selectedRoute) ? selectedRoute : routes[0] ?? ""} onChange={event => setSelectedRoute(event.target.value)}>{routes.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Gateway<select value={gateways.includes(selectedGateway) ? selectedGateway : gateways[0] ?? ""} onChange={event => setSelectedGateway(event.target.value)}>{gateways.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <button className="operator-action" disabled={!active || busy || !operatorKey || !latest}>Publish routing configuration</button>
        </form>
        <form onSubmit={event => submit(event, { action: "document", text: documentText })}>
          <label>Institutional document<textarea minLength={1} maxLength={50000} value={documentText} onChange={event => setDocumentText(event.target.value)}/></label>
          <button className="operator-action secondary" disabled={!active || busy || !operatorKey || !documentText.trim()}>Submit source document</button>
        </form>
      </section>
      <section id="scenario-3" className="operator-form-card" hidden={scenario !== undefined && scenario !== 3}>
        <span>S03 · CUSTOMER EXPERIENCE</span><h3>Payment and original customer statements</h3>
        <form onSubmit={event => {
          event.preventDefault();
          const body = transferBody(account, route, amount, transferKey);
          if (!body) { setFeedback("Enter a valid NGN transfer amount."); return; }
          void run(body, result => { transferKey.current = null; if (result.data?.transaction_id) setTransaction(result.data.transaction_id); });
        }}>
          <label>Account<input value={account} onChange={event => { setAccount(event.target.value); transferKey.current = null; }} required/></label>
          <label>Route<input value={route} onChange={event => { setRoute(event.target.value); transferKey.current = null; }} required/></label>
          <label>Amount (NGN)<input type="number" min="0.01" step="0.01" value={amount} onChange={event => { setAmount(event.target.value); transferKey.current = null; }} required/></label>
          <button className="operator-action" disabled={!active || busy || !operatorKey || parseNgnMinor(amount) === null}>Initiate synthetic transfer</button>
        </form>
        <form onSubmit={event => {
          event.preventDefault();
          if (!interactionIdentity.current) interactionIdentity.current = { id: crypto.randomUUID(), at: new Date().toISOString() };
          void run({ action: "interaction", message_id: interactionIdentity.current.id, sent_at: interactionIdentity.current.at, customer_id: customer, text: message, ...(transaction ? { transaction_id: transaction } : {}) }, () => { interactionIdentity.current = null; });
        }}>
          <label>Customer<input value={customer} onChange={event => { setCustomer(event.target.value); burstIdentity.current = null; interactionIdentity.current = null; }} required/></label>
          <label>Related transaction (optional)<input value={transaction} onChange={event => { setTransaction(event.target.value); burstIdentity.current = null; interactionIdentity.current = null; }}/></label>
          <label>Original report<textarea minLength={1} value={message} onChange={event => { setMessage(event.target.value); burstIdentity.current = null; interactionIdentity.current = null; }} required/></label>
          <button className="operator-action secondary" disabled={!active || busy || !operatorKey || !message.trim()}>Record in-app interaction</button>
        </form>
        <form onSubmit={createBurst}>
          <p>Record nine distinct synthetic source messages across in-app, contact-centre and branch channels. The bank preserves each native channel ID. Repeat a failed request with its original batch identity.</p>
          <button className="operator-action" disabled={!active || busy || !operatorKey || !message.trim()}>Record nine channel contacts</button>
        </form>
      </section>
      <section id="scenario-4" className="operator-form-card" hidden={scenario !== undefined && scenario !== 4}>
        <span>S04 · BANK FINANCIAL EVIDENCE</span><h3>Authorize a bank reconciliation</h3><p>Only pending bank transactions can be reconciled. An AI outcome does not authorize this action.</p>
        <form onSubmit={event => submit(event, { action: "reconcile", transaction_id: transaction, outcome, rationale, beneficiary_verified: outcome === "completed" && verified })}>
          <label>Pending transaction<select value={pendingOptions.some(item => item.id === transaction) ? transaction : ""} onChange={event => setTransaction(event.target.value)} required><option value="">Select a pending record</option>{pendingOptions.map(item => <option key={item.id} value={item.id}>{item.id} · {item.route}</option>)}</select></label>
          <label>Bank-confirmed outcome<select value={outcome} onChange={event => { setOutcome(event.target.value as "completed" | "failed"); if (event.target.value === "failed") setVerified(false); }}><option value="completed">Completed</option><option value="failed">Failed</option></select></label>
          <label className="operator-checkbox"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} disabled={outcome === "failed"}/>Independently verified beneficiary receipt</label>
          <label>Supporting rationale<textarea minLength={5} maxLength={2000} required value={rationale} onChange={event => setRationale(event.target.value)} placeholder="Describe the bank-side supporting evidence"/></label>
          <button className="operator-action" disabled={!active || busy || !operatorKey || !transaction || rationale.trim().length < 5}>Record reconciliation outcome</button>
        </form>
      </section>
    </div>
  </>;
}
