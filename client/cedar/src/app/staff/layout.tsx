import { Suspense, type ReactNode } from "react";
import { StaffShell } from "@/components/staff-shell";
import "./staff.css";

export default function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="cedar-content" role="status">
          Loading Cedar workspace…
        </main>
      }
    >
      <StaffShell>{children}</StaffShell>
    </Suspense>
  );
}
