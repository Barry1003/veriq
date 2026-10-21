"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdminShell } from "@/components/admin-shell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/"))
    return <>{children}</>;
  if (pathname === "/administration" || pathname.startsWith("/administration/"))
    return <AdminShell>{children}</AdminShell>;
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
