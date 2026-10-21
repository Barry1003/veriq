import type { DashboardSummary } from "@/types/domains";

/** Synthetic development fixture. Keep production records out of this directory. */
export const dashboardSummary: DashboardSummary = {
  metrics: [
    { id: "metric-one", label: "Accounts monitored", value: 1280, changePercent: 4.2 },
    { id: "metric-two", label: "Pending operations", value: 76, changePercent: -2.4 },
    { id: "metric-three", label: "Cases resolved", value: 94, changePercent: 5.1 },
  ],
  updatedAt: "2026-10-21T09:00:00.000Z",
};
