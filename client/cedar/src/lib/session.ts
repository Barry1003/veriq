import "server-only";
import { cookies } from "next/headers";
import { cookieName, readSession, authorize, type Role } from "../../../shared/server/demo-session";
export async function requireSession(allowed?: readonly Role[]) {
  const session = readSession("cedar", (await cookies()).get(cookieName("cedar"))?.value);
  if (allowed) authorize(session, allowed);
  return session;
}
