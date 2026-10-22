import { bankGet, dataMode, type Account, type Transaction, type Interaction, type BankRow } from "@/lib/cedar-api";
import { BankingClient } from "./banking-client";
import "./banking.css";
import { cookies } from "next/headers";
import { recoverTransfer, transferCookieName } from "@/lib/transfer-recovery";
import type { TransferRequest } from "@/lib/transfer-request";
export default async function BankingPage() {
    const [accounts, transactions, interactions] = await Promise.all([
        bankGet<BankRow<Account>[]>("/v1/accounts", "customer"),
        bankGet<BankRow<Transaction>[]>("/v1/transactions", "customer"),
        bankGet<BankRow<Interaction>[]>("/v1/interactions", "customer"),
    ]);
    let pendingTransfer: TransferRequest | null = null;
    let recoveryError: string | null = null;
    if (dataMode === "api") {
        const sealed = (await cookies()).get(transferCookieName)?.value;
        if (sealed) {
            try { pendingTransfer = recoverTransfer(sealed); }
            catch { recoveryError = "An earlier transfer instruction cannot be recovered. Ask staff to check bank records before attempting another transfer."; }
        }
    }
    return <BankingClient active={dataMode === "api"} accounts={accounts.data ?? []} transactions={transactions.data ?? []} interactions={interactions.data ?? []} pendingTransfer={pendingTransfer} recoveryError={recoveryError} errors={[accounts.error, transactions.error, interactions.error].filter((x): x is string => Boolean(x))}/>;
}

