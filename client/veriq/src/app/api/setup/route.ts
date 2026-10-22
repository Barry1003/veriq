import { NextRequest, NextResponse } from "next/server";
import { checkMutation, cookieName, readSession, SessionError } from "../../../../../shared/server/demo-session";
import { sessionVeriqApi } from "@/services/api/session-reader";
import { requireSession } from "@/lib/session";

const jsonHeaders = { "Cache-Control": "no-store" };

function errorResponse(error: unknown) {
  const status = error instanceof SessionError ? error.status : 502;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Setup service unavailable." },
    { status, headers: jsonHeaders },
  );
}

async function upstream(path: string, init?: RequestInit) {
  await requireSession(["admin"]);
  const token = process.env.VERIQ_ADMIN_TOKEN;
  if (!token) throw new Error("The server credential for the administrator is unavailable.");
  const base = new URL(process.env.VERIQ_API_URL ?? "http://127.0.0.1:8610");
  const response = await fetch(new URL(path, base), {
    ...init,
    cache: "no-store",
    redirect: "error",
    headers: { Accept: "application/json", ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({ error: "Invalid response from Veriq." }));
  if (!response.ok) {
    const error = new Error(typeof body?.detail === "string" ? body.detail : "Setup request was rejected.");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body;
}

export async function GET(request: NextRequest) {
  try {
    const api = await sessionVeriqApi();
    const query = request.nextUrl.searchParams.get("view") ?? "all";
    const setup = query === "readiness" ? null : await api?.snapshot("setup");
    const readiness = query === "setup" ? null : await api?.snapshot("readiness");
    const sources = query === "setup" || query === "readiness" ? null : await api?.rows("sources");
    return NextResponse.json({ setup, readiness, sources }, { headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = readSession("veriq", request.cookies.get(cookieName("veriq"))?.value);
    checkMutation(request, "veriq", session);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") throw new SessionError("Invalid setup request.", 400);
    const body = payload as Record<string, unknown>;
    if (body.action === "activate") {
      const result = await upstream("/v1/setup/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const response = NextResponse.json(result, { headers: jsonHeaders });
      response.cookies.set("veriq-onboarding-complete", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      return response;
    }
    if (body.action !== "save-profile" || typeof body.institution_name !== "string" || typeof body.deployment_label !== "string") {
      throw new SessionError("Institution name and deployment label are required.", 400);
    }
    return NextResponse.json(await upstream("/v1/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institution_name: body.institution_name, deployment_label: body.deployment_label, synthetic_development: true }),
    }), { headers: jsonHeaders });
  } catch (error) {
    const response = errorResponse(error);
    const status = (error as Error & { status?: number }).status;
    if (status) return NextResponse.json({ error: error instanceof Error ? error.message : "Setup request was rejected." }, { status, headers: jsonHeaders });
    return response;
  }
}
