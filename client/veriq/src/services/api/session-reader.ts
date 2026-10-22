import "server-only";
import { requireSession } from "../../lib/session";
import { createVeriqApi, VeriqApiError } from "./veriq";
export async function sessionVeriqApi() {
  if ((process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") !== "api") return undefined;
  const session = await requireSession(["admin", "investigator"]);
  const token = process.env[session.role === "admin" ? "VERIQ_ADMIN_TOKEN" : "VERIQ_INVESTIGATOR_TOKEN"];
  if (!token) throw new VeriqApiError("The server credential for this role is unavailable.", 503);
  return createVeriqApi({ baseUrl: process.env.VERIQ_API_URL ?? "http://127.0.0.1:8610", token });
}
