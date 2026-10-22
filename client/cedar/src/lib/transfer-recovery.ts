import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { isTransferRequest, type TransferRequest } from "./transfer-request";

export const transferCookieName = "cedar-transfer-request";

function encryptionKey(): Buffer {
  const secret = process.env.CEDAR_REQUEST_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Transfer recovery is not configured.");
  return createHash("sha256").update(secret).digest();
}

function principalScope(): Buffer {
  const token = process.env.CEDAR_CUSTOMER_TOKEN;
  if (!token) throw new Error("Customer credential unavailable.");
  // Bind the sealed instruction to this deployment's existing customer credential.
  // This is request recovery, not a replacement for browser authentication.
  return createHash("sha256").update(token).digest();
}

export function sealTransfer(request: TransferRequest): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(principalScope());
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(request), "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function recoverTransfer(value: string): TransferRequest {
  const sealed = Buffer.from(value, "base64url");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), sealed.subarray(0, 12));
  cipher.setAAD(principalScope());
  cipher.setAuthTag(sealed.subarray(12, 28));
  const request: unknown = JSON.parse(Buffer.concat([
    cipher.update(sealed.subarray(28)), cipher.final(),
  ]).toString("utf8"));
  if (!isTransferRequest(request)) throw new Error("Invalid transfer recovery record.");
  return request;
}

export const transferCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};
