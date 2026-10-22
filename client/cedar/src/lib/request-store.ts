import "server-only";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { SessionError, type Session } from "../../../shared/server/demo-session";
import { recoverTransfer, sealTransfer } from "./transfer-recovery";
import type { TransferRequest } from "./transfer-request";
export type ReportRequest = { message_id: string; sent_at: string; customer_id: string; text: string; transaction_id?: string };
export type RequestState = { transfer?: string; confirmed?: string; report?: ReportRequest; reportConfirmed?: boolean; batch?: string };

// One durable request registry per fixed demo principal and bank deployment, across tabs/logins.
// A lock serializes staging and bank calls; a lost response leaves the original instruction intact.
export async function withRequests<T>(session: Session, operation: (state: RequestState, checkpoint: () => Promise<void>) => Promise<T>): Promise<T> {
  const token = process.env.CEDAR_CUSTOMER_TOKEN;
  if (!token) throw new SessionError("Bank identity is not configured.", 503);
  const directory = process.env.CEDAR_REQUEST_STORE || ".cedar-demo";
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const key = createHash("sha256").update(`${process.env.CEDAR_API_URL ?? "http://127.0.0.1:8611"}:${session.role === "customer" ? "C1" : session.role}`).digest("hex");
  const file = join(directory, key + ".json");
  const lock = file + ".lock";
  let handle;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { handle = await open(lock, "wx", 0o600); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  if (!handle) throw new SessionError("Another banking request is still being confirmed. Retry the original instruction.", 409);
  try {
    let state: RequestState;
    try { state = JSON.parse(await readFile(file, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new SessionError("Saved request state cannot be read. Staff must inspect bank records.", 503); state = {}; }
    if (!state || typeof state !== "object" || Array.isArray(state)) throw new SessionError("Saved banking state is invalid. Staff must inspect bank records.", 503);
    async function checkpoint() {
      const temporary = file + "." + randomUUID();
      const writer = await open(temporary, "wx", 0o600);
      try { await writer.writeFile(JSON.stringify(state)); await writer.sync(); }
      finally { await writer.close(); }
      await rename(temporary, file);
      // This private runtime directory is created locally and must never be bundled.
      const parent = await open(/* turbopackIgnore: true */ directory, "r");
      try { await parent.sync(); } finally { await parent.close(); }
    }
    const result = await operation(state, checkpoint);
    await checkpoint();
    return result;
  } finally { await handle.close(); await unlink(lock); }
}
export async function pendingRequests(session: Session) {
  return withRequests(session, async state => ({ transfer: state.transfer ? recoverTransfer(state.transfer) : null, report: state.report ?? null }));
}
export function saveTransfer(state: RequestState, request: TransferRequest) { state.transfer = sealTransfer(request); }
