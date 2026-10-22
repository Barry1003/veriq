"use client";
import { useState } from "react";
export function SessionButton() {
  const [error, setError] = useState("");
  async function logout() {
    try {
      const current = await fetch("/api/session", { cache: "no-store" });
      if (!current.ok) { window.location.assign(new URL("/login", window.location.origin).href); return; }
      const session = await current.json();
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json", "x-csrf-token": session.csrf }, body: JSON.stringify({ action: "logout" }) });
      if (!response.ok) throw new Error("Sign-out failed. Try again.");
      // Clear prefetched views when switching identities.
      window.location.assign(new URL("/login", window.location.origin).href);
    } catch (error) { setError(error instanceof Error ? error.message : "Sign-out unavailable."); }
  }
  return <span><button type="button" onClick={logout}>Sign out</button>{error && <span role="alert">{error}</span>}</span>;
}
