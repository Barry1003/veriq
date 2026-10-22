import { requireSession } from "@/lib/session";
import { pendingRequests } from "@/lib/request-store";
import Link from "next/link";
import { bankGet, dataMode, type BankRow, type Transaction, type Knowledge } from "@/lib/cedar-api";
import { OperatorControls } from "./operator-controls";
import "./operator.css";
export default async function OperatorPage() {
    const saved = dataMode === "api" ? await pendingRequests(await requireSession(["operator"])) : { transfer: null, report: null };
    const [result, config] = await Promise.all([bankGet<BankRow<Transaction>[]>("/v1/transactions"), bankGet<BankRow<Knowledge>[]>("/v1/institutional/configurations")]);
    const pending = result.data?.filter(row => row.data.status === "pending").map(row => ({ id: row.data.transaction_id, route: row.data.route_id })) ?? [];
    return <div className="cedar-operator"><header className="operator-header"><span>CEDAR BANK / RESTRICTED OPERATIONS</span><h1>Controlled simulation console</h1></header>
    <div className="operator-content"><div className="operator-topline"><span>RESTRICTED OPERATIONS · AUTHORIZED OPERATORS</span><Link href="/staff" className="operator-return">← Back to staff operations</Link></div>
      <div className="operator-notice"><strong>SIMULATION SAFETY AND SOURCE PROVENANCE</strong><p>Authorized operators create Cedar-side scenario events. Downstream access follows approved bank-source connectors. Simulator ground truth must not be treated as Veriq evidence.</p></div>
      <h2>Scenario catalog</h2><div className="operator-grid">{[
            ["S01 · OPERATIONAL TELEMETRY", "Gateway G1 timeouts", "Control synthetic gateway timeouts and generate source observations through the banking API."],
            ["S02 · INSTITUTIONAL KNOWLEDGE", "Institutional source update", "Submit a source-side institutional document that Veriq may later ingest through approved feeds."],
            ["S03 · CUSTOMER EXPERIENCE", "Customer transfer and complaint", "Initiate a simulated transfer and create an original support interaction."],
            ["S04 · RECONCILIATION", "Permitted outcome update", "Settle or release only an existing pending transaction with an authorized operator decision."],
        ].map(([label, title, detail], index) => <a className="operator-scenario" key={label} href={["/operator/gateway-observation", "/operator/knowledge-source-change", "/operator/customer-contact-burst", "/operator/reconciliation-evidence"][index]}><span>{label}</span><h3>{title}</h3><p>{detail}</p><strong>Inspect scenario details →</strong></a>)}</div>
      <div className="operator-notice compact"><strong>Simulation origin</strong><p>{dataMode === "api" ? "Live Cedar v0.4 API. Only explicit authorized actions create records. No automatic truth reveal endpoint exists." : "Figma preview mode. Actions are disabled and no bank records will be written."}</p></div>
      <OperatorControls pendingTransfer={saved.transfer} pendingReport={saved.report} pending={pending} configurations={config.data ?? []} active={dataMode === "api"}/>
    </div>
  </div>;
}

