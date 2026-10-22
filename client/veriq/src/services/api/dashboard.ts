import type { DashboardSummary } from "@/types/domains";

export const DEFAULT_DASHBOARD_API_PATH = "/api/dashboard/summary";

export async function getApiDashboardSummary(
  baseUrl: string,
  path = DEFAULT_DASHBOARD_API_PATH,
): Promise<DashboardSummary> {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`Could not load dashboard summary (${response.status})`);
  return (await response.json()) as DashboardSummary;
}
