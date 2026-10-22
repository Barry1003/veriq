import { DEFAULT_DASHBOARD_API_PATH, getApiDashboardSummary } from "./api/dashboard";
import { getMockDashboardSummary } from "./adapters/dashboard";

const DEFAULT_API_BASE_URL = "http://localhost:8100";
const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

export const dashboardService = {
  getSummary: () =>
    source === "mock"
      ? getMockDashboardSummary()
      : getApiDashboardSummary(
        process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
        process.env.NEXT_PUBLIC_API_DASHBOARD_PATH ?? DEFAULT_DASHBOARD_API_PATH,
      ),
};
