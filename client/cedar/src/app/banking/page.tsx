import { bankGet, dataMode, type Account, type Transaction, type Interaction, type BankRow } from "@/lib/cedar-api";
import { BankingClient } from "./banking-client";
import "./banking.css";
export default async function BankingPage() {
    const [accounts, transactions, interactions] = await Promise.all([
        bankGet<BankRow<Account>[]>("/v1/accounts", "customer"),
        bankGet<BankRow<Transaction>[]>("/v1/transactions", "customer"),
        bankGet<BankRow<Interaction>[]>("/v1/interactions", "customer"),
    ]);
    return <BankingClient active={dataMode === "api"} accounts={accounts.data ?? []} transactions={transactions.data ?? []} interactions={interactions.data ?? []} errors={[accounts.error, transactions.error, interactions.error].filter((x): x is string => Boolean(x))}/>;
}

