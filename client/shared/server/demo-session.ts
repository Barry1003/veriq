import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type App = "cedar" | "veriq";
export type Role = "customer" | "staff" | "operator" | "admin" | "investigator";
export type Session = { app: App; role: Role; subject: string; csrf: string; expires: number; binding: string };
export class SessionError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
const roles: Record<App, Role[]> = { cedar: ["customer", "staff", "operator"], veriq: ["admin", "investigator"] };
const lifetime = 4 * 60 * 60;
export const cookieName = (app: App) => `${app}-demo-session`;
const equal = (a: string, b: string) => {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
};
export function sessionConfig(app: App) {
  const prefix = app.toUpperCase();
  const secret = process.env[`${prefix}_SESSION_SECRET`];
  const origin = new URL(process.env[`${prefix}_UI_ORIGIN`] ?? "invalid:");
  if (process.env.DEMO_AUTH_ENABLED !== "true" || !secret || secret.length < 32 ||
      !["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash ||
      !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname))
    throw new SessionError("Local demo authentication is not configured.", 503);
  const users = roles[app].map(role => ({
    role, username: process.env[`${prefix}_${role.toUpperCase()}_USERNAME`] ?? "",
    password: process.env[`${prefix}_${role.toUpperCase()}_PASSWORD`] ?? "",
  }));
  if (users.some(user => !user.username || user.password.length < 12) || new Set(users.map(user => user.username)).size !== users.length)
    throw new SessionError("Separate demo accounts must be configured by the administrator.", 503);
  return { secret, origin: origin.origin, secure: origin.protocol === "https:", users };
}
const sign = (value: string, secret: string) => createHmac("sha256", secret).update(value).digest("base64url");
const binding = (username: string, password: string) => createHash("sha256").update(JSON.stringify([username, password])).digest("hex");
export function authenticate(app: App, username: string, password: string) {
  const config = sessionConfig(app);
  const user = config.users.find(user => equal(user.username, username) && equal(user.password, password));
  if (!user) throw new SessionError("Invalid username or password.", 401);
  const session: Session = { app, role: user.role, subject: user.username, csrf: randomBytes(32).toString("base64url"), expires: Math.floor(Date.now() / 1000) + lifetime, binding: binding(user.username, user.password) };
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { session, value: `${body}.${sign(body, config.secret)}` };
}
export function readSession(app: App, value?: string): Session {
  const config = sessionConfig(app);
  if (!value || value.length > 2000) throw new SessionError("Sign in to continue.", 401);
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra || !equal(signature, sign(body, config.secret))) throw new SessionError("Sign in to continue.", 401);
  let session: Session;
  try { session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { throw new SessionError("Sign in to continue.", 401); }
  const user = config.users.find(user => user.role === session.role && user.username === session.subject);
  const now = Math.floor(Date.now() / 1000);
  if (session.app !== app || !user || !Number.isSafeInteger(session.expires) || session.expires <= now || session.expires > now + lifetime ||
      typeof session.csrf !== "string" || session.csrf.length !== 43 || session.binding !== binding(user.username, user.password))
    throw new SessionError("The session expired. Sign in again.", 401);
  return session;
}
export function authorize(session: Session, allowed: readonly Role[]) {
  if (!allowed.includes(session.role)) throw new SessionError("This account cannot perform that action.", 403);
}
export function checkMutation(request: Request, app: App, session?: Session) {
  const config = sessionConfig(app);
  if (request.headers.get("origin") !== config.origin || request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
    throw new SessionError("Request origin or content type is not permitted.", 403);
  if (session && !equal(request.headers.get("x-csrf-token") ?? "", session.csrf))
    throw new SessionError("Refresh the page before submitting this action.", 403);
}
export const landing = (app: App, role: Role) => app === "veriq" ? "/" : role === "customer" ? "/banking" : role === "staff" ? "/staff" : "/operator";
export function pageRoles(app: App, path: string): Role[] {
  if (app === "cedar") return path === "/banking" || path.startsWith("/banking/") ? ["customer"] : path === "/staff" || path.startsWith("/staff/") ? ["staff"] : ["operator"];
  return /^\/(admin|administration|data-sources|onboarding)(\/|$)/.test(path) ? ["admin"] : ["admin", "investigator"];
}
const attempts = new Map<App, { count: number; until: number }>();
export async function sessionResponse(request: Request, app: App, value?: string) {
  try {
    const config = sessionConfig(app);
    if (request.method === "GET") {
      const session = readSession(app, value);
      return Response.json({ role: session.role, csrf: session.csrf, expires: session.expires }, { headers: { "Cache-Control": "no-store" } });
    }
    checkMutation(request, app);
    const raw = await request.text();
    if (raw.length > 2048) throw new SessionError("Request too large.", 413);
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object") throw new SessionError("Invalid login request.", 400);
    const body = payload as Record<string, unknown>;
    let cookie = "";
    let result: Record<string, unknown>;
    if (body.action === "logout") {
      checkMutation(request, app, readSession(app, value));
      result = { signedOut: true };
    } else {
      const prior = attempts.get(app);
      if (prior && prior.until > Date.now() && prior.count >= 10) throw new SessionError("Too many sign-in attempts. Try again in a minute.", 429);
      attempts.set(app, { count: prior && prior.until > Date.now() ? prior.count + 1 : 1, until: prior && prior.until > Date.now() ? prior.until : Date.now() + 60_000 });
      if (typeof body.username !== "string" || typeof body.password !== "string") throw new SessionError("Enter your username and password.", 400);
      const authenticated = authenticate(app, body.username, body.password);
      cookie = authenticated.value;
      result = { location: landing(app, authenticated.session.role) };
    }
    return Response.json(result, { headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `${cookieName(app)}=${cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${cookie ? lifetime : 0}${config.secure ? "; Secure" : ""}`,
    } });
  } catch (error) {
    return Response.json({ error: error instanceof SessionError ? error.message : "Invalid session request." }, { status: error instanceof SessionError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
  }
}
