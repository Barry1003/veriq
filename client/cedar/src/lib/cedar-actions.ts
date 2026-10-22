import type { BankRow, Transaction } from "./cedar-api";
import type { TransferRequest } from "./transfer-request";

export async function postCedarAction(body: Record<string, unknown>): Promise<unknown> {
  const sessionResponse = await fetch("/api/session", { cache: "no-store" });
  if (!sessionResponse.ok) throw new Error("Sign in again before submitting this action.");
  const session = await sessionResponse.json();
  const response = await fetch("/api/cedar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": session.csrf },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = result && typeof result === "object" ? result as Record<string, unknown> : {};
    throw new Error(typeof error.error === "string" ? error.error : typeof error.detail === "string" ? error.detail : `Cedar returned HTTP ${response.status}.`);
  }
  return result;
}

export function isTransferResponse(value: unknown, request: TransferRequest): value is BankRow<Transaction> {
  if (!value || typeof value !== "object" || !("data" in value) || !value.data || typeof value.data !== "object") return false;
  const data = value.data as Record<string, unknown>;
  return typeof data.transaction_id === "string" && data.account_id === request.account_id &&
    data.amount_minor === request.amount_minor && data.route_id === request.route_id &&
    (data.status === "pending" || data.status === "completed" || data.status === "failed");
}

export async function acknowledgeTransfer(request: TransferRequest): Promise<boolean> {
  try {
    await postCedarAction({ ...request, action: "acknowledge_transfer" });
    return true;
  } catch {
    // The bank response is already known. Leave recovery locked if acknowledgement fails.
    return false;
  }
}
