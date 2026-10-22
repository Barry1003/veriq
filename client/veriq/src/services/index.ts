import { getApiDashboardSummary } from "./api/dashboard";
import { getMockDashboardSummary } from "./adapters/dashboard";
import { requireVeriqApi, type VeriqApi } from "./api/veriq";

export const dashboardService = {
  getSummary: (api?: VeriqApi) => {
    const source = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
    if (source === "mock") return getMockDashboardSummary();
    if (source === "api") return getApiDashboardSummary(requireVeriqApi(api));
    throw new Error(`Unsupported Veriq data source: ${source}`);
  },
};
