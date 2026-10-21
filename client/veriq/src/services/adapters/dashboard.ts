import { dashboardSummary } from "@/data/dashboard";
import type { DashboardSummary } from "@/types/domains";

export async function getMockDashboardSummary(): Promise<DashboardSummary> {
  return dashboardSummary;
}
