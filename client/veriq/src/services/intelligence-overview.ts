import { getMockIntelligenceOverview } from "./adapters/intelligence-overview";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
import { requireVeriqApi, type VeriqApi } from "./api/veriq";
import { getLiveIntelligenceOverview } from "./adapters/live-intelligence-overview";
export async function getIntelligenceOverview(api?: VeriqApi): Promise<IntelligenceOverviewData> {
  const mode = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockIntelligenceOverview();
  if (mode === "api")
    return getLiveIntelligenceOverview(requireVeriqApi(api));
  throw new Error(`Unsupported data source: ${mode}`);
}
