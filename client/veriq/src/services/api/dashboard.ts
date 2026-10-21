import type { DashboardSummary } from "@/types/domains";

export async function getApiDashboardSummary(
  baseUrl: string,
): Promise<DashboardSummary> {
  const response = await fetch(`${baseUrl}/dashboard/summary`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Could not load dashboard summary (${response.status})`);
  }

  return (await response.json()) as DashboardSummary;
}
