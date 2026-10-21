import { getApiDashboardSummary } from "./api/dashboard";
import { getMockDashboardSummary } from "./adapters/dashboard";

const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const dashboardService = {
  getSummary: () => {
    if (source === "mock") return getMockDashboardSummary();
    if (source === "api") return getApiDashboardSummary(baseUrl);
    throw new Error(`Unsupported NEXT_PUBLIC_DATA_SOURCE: ${source}`);
  },
};
