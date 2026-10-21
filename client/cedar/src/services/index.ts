import { getApiDashboardSummary } from "./api/dashboard";
import { getMockDashboardSummary } from "./adapters/dashboard";

const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const dashboardService = {
  getSummary: () => source === "mock" ? getMockDashboardSummary() : getApiDashboardSummary(apiBaseUrl),
};
