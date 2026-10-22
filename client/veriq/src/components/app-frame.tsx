"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdminShell } from "@/components/admin-shell";

import { SessionButton } from "./session-button";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/"))
    return <>{children}</>;
  if (pathname === "/administration" || pathname.startsWith("/administration/"))
    return <AdminShell><div style={{ textAlign: "right" }}><SessionButton/></div>{children}</AdminShell>;
  return <WorkspaceShell><div style={{ textAlign: "right" }}><SessionButton/></div>{children}</WorkspaceShell>;
}
