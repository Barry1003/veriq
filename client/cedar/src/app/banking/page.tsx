import { bankGet, dataMode, type Account, type Transaction, type Interaction, type BankRow } from "@/lib/cedar-api";
import { BankingClient } from "./banking-client";
import "./banking.css";
import { requireSession } from "@/lib/session";
import { pendingRequests, type ReportRequest } from "@/lib/request-store";
import type { TransferRequest } from "@/lib/transfer-request";
export default async function BankingPage() {
    const [accounts, transactions, interactions] = await Promise.all([
        bankGet<BankRow<Account>[]>("/v1/accounts", "customer"),
        bankGet<BankRow<Transaction>[]>("/v1/transactions", "customer"),
        bankGet<BankRow<Interaction>[]>("/v1/interactions", "customer"),
    ]);
    let pendingTransfer: TransferRequest | null = null;
    let recoveryError: string | null = null;
    let pendingReport: ReportRequest | null = null;
    if (dataMode === "api") {
        try {
            const saved = await pendingRequests(await requireSession(["customer"]));
            pendingTransfer = saved.transfer;
            pendingReport = saved.report;
        } catch { recoveryError = "Saved instructions cannot be recovered. Staff must inspect bank records before another transfer."; }
    }

    return <BankingClient active={dataMode === "api"} accounts={accounts.data ?? []} transactions={transactions.data ?? []} interactions={interactions.data ?? []} pendingTransfer={pendingTransfer} pendingReport={pendingReport} recoveryError={recoveryError} errors={[accounts.error, transactions.error, interactions.error].filter((x): x is string => Boolean(x))}/>;
}

