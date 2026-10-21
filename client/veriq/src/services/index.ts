import { getApiDashboardSummary } from "./api/dashboard";
import { getMockDashboardSummary } from "./adapters/dashboard";
const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
export const dashboardService = {
  getSummary: () =>
    source === "mock"
      ? getMockDashboardSummary()
      : getApiDashboardSummary(
          process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
        ),
};
