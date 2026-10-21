import type { DashboardSummary } from "@/types/domains";

/** Synthetic records only. Keep all Cedar business fixtures in src/data. */
export const dashboardSummary: DashboardSummary = {
  metrics: [
    { id: "accounts-monitored", label: "Accounts monitored", value: 1280, changePercent: 4.2 },
    { id: "pending-operations", label: "Pending operations", value: 76, changePercent: -2.4 },
  ],
  updatedAt: "2026-10-21T09:00:00.000Z",
};
