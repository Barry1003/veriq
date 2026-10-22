import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isTransferRequest, sameTransfer } from "../../../lib/transfer-request";
import { recoverTransfer, sealTransfer, transferCookieName, transferCookieOptions } from "../../../lib/transfer-recovery";


const validKey = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value);
const matches = (provided: string, expected: string) => {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const body = value as Record<string, unknown>;
  if (typeof body.error === "string") return body.error;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) return "Cedar rejected one or more input fields.";
  return fallback;
}

async function callCedar(path: string, body: Record<string, unknown> | null, token: string) {
  const response = await fetch(new URL(path, process.env.CEDAR_API_URL ?? "http://127.0.0.1:8101"), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: body === null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { value = { error: `Cedar returned HTTP ${response.status}.` }; }
  return { ok: response.ok, status: response.status, value };
}

const allowedActions = ["seed", "condition", "prepare_transfer", "acknowledge_transfer", "transfer", "reconcile", "interaction", "document", "configuration", "contact_burst"];
const operatorOnly = new Set(["seed", "condition", "reconcile", "document", "configuration", "contact_burst"]);

export async function POST(request: NextRequest) {
  if (process.env.CEDAR_DATA_SOURCE !== "api")
    return NextResponse.json({ error: "Preview mode does not create bank records." }, { status: 409 });
  let trustedOrigin: string;
  try {
    const configured = new URL(process.env.CEDAR_UI_ORIGIN ?? "");
    if (!["https:", "http:"].includes(configured.protocol) || configured.username || configured.password)
      throw new Error();
    trustedOrigin = configured.origin;
  } catch {
    return NextResponse.json({ error: "The Cedar browser origin is not configured." }, { status: 503 });
  }
  if (request.headers.get("origin") !== trustedOrigin || request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    return NextResponse.json({ error: "Request origin or content type is not permitted." }, { status: 403 });

  let payload: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 55_000) return NextResponse.json({ error: "Request exceeds the allowed size." }, { status: 413 });
    const json: unknown = JSON.parse(text);
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error();
    payload = json as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const action = payload.action;
  if (typeof action !== "string" || !allowedActions.includes(action))
    return NextResponse.json({ error: "Unsupported Cedar banking operation." }, { status: 422 });

  const operatorKey = process.env.CEDAR_OPERATOR_KEY;
  const customerKey = process.env.CEDAR_CUSTOMER_ACTION_KEY;
  const supplied = request.headers.get("x-cedar-action-key") ?? "";
  const operatorAuthorized = Boolean(operatorKey && matches(supplied, operatorKey));
  const customerAuthorized = Boolean(customerKey && matches(supplied, customerKey));
  if (operatorOnly.has(action) ? !operatorAuthorized : !operatorAuthorized && !customerAuthorized)
    return NextResponse.json({ error: "A valid key for this action is required." }, { status: 403 });

  if (["prepare_transfer", "transfer", "acknowledge_transfer"].includes(action)) {
    const instruction: unknown = payload;
    if (!isTransferRequest(instruction))
      return NextResponse.json({ error: "Invalid transfer instruction." }, { status: 422 });
    try {
      const sealed = request.cookies.get(transferCookieName)?.value;
      const pending = sealed ? recoverTransfer(sealed) : null;
      if (pending && !sameTransfer(pending, instruction))
        return NextResponse.json({ error: "An earlier transfer needs confirmation. Recover its original instruction before starting another transfer." }, { status: 409 });
      if (action === "prepare_transfer") {
        const original = { account_id: instruction.account_id, route_id: instruction.route_id, amount_minor: instruction.amount_minor, idempotency_key: instruction.idempotency_key };
        const response = NextResponse.json({ prepared: true }, { headers: { "Cache-Control": "no-store" } });
        // Stage recovery in the browser before any request can reach the bank.
        response.cookies.set(transferCookieName, sealTransfer(original), transferCookieOptions);
        return response;
      }
      if (!pending)
        return NextResponse.json({ error: "Prepare the transfer before submitting it." }, { status: 409 });
      if (action === "acknowledge_transfer") {
        const response = NextResponse.json({ acknowledged: true }, { headers: { "Cache-Control": "no-store" } });
        response.cookies.set(transferCookieName, "", { ...transferCookieOptions, maxAge: 0 });
        return response;
      }
    } catch {
      return NextResponse.json({ error: "The original transfer instruction cannot be recovered. Staff must check bank records before another transfer is attempted." }, { status: 503 });
    }
  }

  let path = "";
  let body: Record<string, unknown> | null = null;
  let tokenName: "CEDAR_CUSTOMER_TOKEN" | "CEDAR_STAFF_TOKEN" | "CEDAR_SIMULATOR_TOKEN" = "CEDAR_STAFF_TOKEN";

  if (action === "seed") {
    path = "/v1/simulator/seed";
    tokenName = "CEDAR_SIMULATOR_TOKEN";
  } else if (action === "condition" && validKey(payload.gateway_id) && typeof payload.timeout === "boolean") {
    path = "/v1/simulator/conditions";
    tokenName = "CEDAR_SIMULATOR_TOKEN";
    body = { gateway_id: payload.gateway_id, timeout: payload.timeout };
  } else if (action === "transfer" && validKey(payload.account_id) && validKey(payload.route_id) && validKey(payload.idempotency_key) && typeof payload.amount_minor === "number" && Number.isSafeInteger(payload.amount_minor) && payload.amount_minor > 0 && payload.amount_minor <= 10_000_000_000) {
    path = "/v1/transfers";
    tokenName = "CEDAR_CUSTOMER_TOKEN";
    body = { account_id: payload.account_id, route_id: payload.route_id, idempotency_key: payload.idempotency_key, amount_minor: payload.amount_minor };
  } else if (action === "reconcile" && validKey(payload.transaction_id) && (payload.outcome === "completed" || payload.outcome === "failed") && typeof payload.rationale === "string" && payload.rationale.trim().length >= 5 && payload.rationale.length <= 2000) {
    path = `/v1/transactions/${encodeURIComponent(payload.transaction_id)}/reconcile`;
    body = { outcome: payload.outcome, rationale: payload.rationale.trim(), beneficiary_verified: payload.outcome === "completed" && payload.beneficiary_verified === true };
  } else if (action === "interaction" && validKey(payload.customer_id) && validKey(payload.message_id) && typeof payload.sent_at === "string" && !Number.isNaN(Date.parse(payload.sent_at)) && typeof payload.text === "string" && payload.text.trim().length > 0 && payload.text.length <= 10000 && (payload.transaction_id == null || payload.transaction_id === "" || validKey(payload.transaction_id))) {
    path = "/v1/channels/in-app/messages";
    tokenName = "CEDAR_CUSTOMER_TOKEN";
    body = { message_id: payload.message_id, sent_at: payload.sent_at, customer_id: payload.customer_id, message: payload.text.trim(), ...(payload.transaction_id ? { transaction_id: payload.transaction_id } : {}) };
  } else if (action === "document" && typeof payload.text === "string" && payload.text.trim().length > 0 && payload.text.length <= 50000) {
    path = "/v1/institutional/documents";
    body = { text: payload.text.trim() };
  } else if (action === "configuration" && payload.knowledge && typeof payload.knowledge === "object" && !Array.isArray(payload.knowledge)) {
    const knowledge = payload.knowledge as Record<string, unknown>;
    if (Array.isArray(knowledge.entities) && knowledge.entities.length <= 500 && Array.isArray(knowledge.relationships) && knowledge.relationships.length <= 1000 && typeof knowledge.valid_from === "string") {
      path = "/v1/institutional/configurations";
      body = { entities: knowledge.entities, relationships: knowledge.relationships, valid_from: knowledge.valid_from };
    }
  } else if (action === "contact_burst" && validKey(payload.customer_id) && validKey(payload.batch_id) && typeof payload.started_at === "string" && !Number.isNaN(Date.parse(payload.started_at)) && typeof payload.text === "string" && payload.text.trim().length > 0 && payload.text.length <= 5000 && (payload.transaction_id == null || payload.transaction_id === "" || validKey(payload.transaction_id))) {
    const token = process.env.CEDAR_STAFF_TOKEN;
    if (!token) return NextResponse.json({ error: "Staff recorder permission is not configured." }, { status: 503 });
    const customer = payload.customer_id;
    const batch = payload.batch_id;
    const at = payload.started_at;
    const reference = payload.transaction_id ? { transaction_reference: payload.transaction_id } : {};
    const created: Array<{ id: string; channel: string }> = [];
    const channels = ["in_app", "contact_centre", "branch"] as const;
    try {
      for (let index = 0; index < 9; index++) {
        const channel = channels[index % channels.length];
        const id = `${batch}-${index + 1}`;
        const line = `${payload.text.trim()} (synthetic contact ${index + 1}, ${channel.replaceAll("_", " ")})`;
        const endpoint = channel === "in_app" ? "/v1/channels/in-app/messages" : channel === "contact_centre" ? "/v1/channels/contact-centre/transcripts" : "/v1/channels/branch/visits";
        const record: Record<string, unknown> = channel === "in_app"
          ? { message_id: id, customer_id: customer, message: line, sent_at: at, ...(payload.transaction_id ? { transaction_id: payload.transaction_id } : {}) }
          : channel === "contact_centre"
            ? { call_id: id, customer_id: customer, transcript: line, started_at: at, ...reference }
            : { visit_id: id, customer_id: customer, notes: line, recorded_at: at, ...reference };
        const outcome = await callCedar(endpoint, record, token);
        if (!outcome.ok) return NextResponse.json({ error: errorMessage(outcome.value, `Contact ${index + 1} could not be recorded.`), recorded: created.length, batch_id: batch }, { status: outcome.status >= 500 ? 502 : outcome.status });
        const row = outcome.value as { id?: string };
        created.push({ id: row.id ?? id, channel });
      }
      return NextResponse.json({ count: created.length, records: created, batch_id: batch }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Contact batch interrupted; retry with the same batch identity.", recorded: created.length, batch_id: batch }, { status: 502 });
    }
  } else {
    return NextResponse.json({ error: "Unsupported or invalid Cedar banking fields." }, { status: 422 });
  }

  if (!path) return NextResponse.json({ error: "Unsupported or invalid Cedar banking fields." }, { status: 422 });
  const token = process.env[tokenName];
  if (!token) return NextResponse.json({ error: "Required Cedar role credential is not configured." }, { status: 503 });
  try {
    const outcome = await callCedar(path, body, token);
    return NextResponse.json(outcome.value, { status: outcome.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The Cedar request could not be confirmed. Check source records before retrying with the same request identity." }, { status: 502 });
  }
}
