export type TransferRequest = {
  account_id: string;
  route_id: string;
  amount_minor: number;
  idempotency_key: string;
};

const validKey = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value);

export function isTransferRequest(value: unknown): value is TransferRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  return validKey(request.account_id) && validKey(request.route_id) &&
    validKey(request.idempotency_key) && typeof request.amount_minor === "number" &&
    Number.isSafeInteger(request.amount_minor) && request.amount_minor > 0 &&
    request.amount_minor <= 10_000_000_000;
}

export function sameTransfer(left: TransferRequest, right: TransferRequest): boolean {
  return left.account_id === right.account_id && left.route_id === right.route_id &&
    left.amount_minor === right.amount_minor && left.idempotency_key === right.idempotency_key;
}
