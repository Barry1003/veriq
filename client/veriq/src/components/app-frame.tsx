"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return <>{children}</>;
  }
  return <WorkspaceShell>{children}</WorkspaceShell>;
}