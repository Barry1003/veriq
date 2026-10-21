import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Veriq | Intelligence Workspace",
  description: "Institutional intelligence platform",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-product="veriq">
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}