"use client";
import { useState, type FormEvent } from "react";
export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: fields.get("username"), password: fields.get("password") }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Sign-in failed.");
      window.location.assign(body.location);
    } catch (error) { setError(error instanceof Error ? error.message : "Sign-in unavailable."); setBusy(false); }
  }
  return <main style={{ maxWidth: 420, margin: "10vh auto", padding: 24 }}><h1>Veriq sign in</h1><form onSubmit={submit} style={{ display: "grid", gap: 16 }}><label>Username<input name="username" autoComplete="username" required style={{ display: "block", width: "100%", padding: 10 }}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required style={{ display: "block", width: "100%", padding: 10 }}/></label><button disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>{error && <p role="alert">{error}</p>}</form></main>;
}
