import type { BankRow, Transaction } from "@/lib/cedar-api";

export const bankingTransactions: BankRow<Transaction>[] = [
  { id: "TX-10482", kind: "transaction", classification: "internal", created_at: "2026-10-21T13:08:00+01:00", data: { transaction_id: "TX-10482", amount_minor: 2500000, status: "pending", response: "timeout", currency: "NGN", occurred_at: "2026-10-21T13:08:00+01:00", customer_id: "C1", account_id: "A1", route_id: "R2", gateway_id: "G2", version: 1 } },
  { id: "TX-10481", kind: "transaction", classification: "internal", created_at: "2026-10-20T13:08:00+01:00", data: { transaction_id: "TX-10481", amount_minor: 8500000, status: "completed", response: "accepted", currency: "NGN", occurred_at: "2026-10-20T13:08:00+01:00", customer_id: "C1", account_id: "A1", route_id: "R1", gateway_id: "G1", version: 1 } },
];
