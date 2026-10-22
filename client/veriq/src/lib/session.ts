import "server-only";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { cookieName, readSession, authorize, type Role } from "../../../shared/server/demo-session";
export async function requireSession(allowed?: readonly Role[]) {
  await connection();
  const session = readSession("veriq", (await cookies()).get(cookieName("veriq"))?.value);
  if (allowed) authorize(session, allowed);
  return session;
}
