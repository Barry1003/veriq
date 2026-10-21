import { getMockIntelligenceOverview } from "./adapters/intelligence-overview";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
/** Do not invent an overview endpoint until Daniel provides the contract. */
export async function getIntelligenceOverview(): Promise<IntelligenceOverviewData> {
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockIntelligenceOverview();
  if (mode === "api") throw new Error("Intelligence Overview API contract has not been agreed with the backend team.");
  throw new Error(`Unsupported data source: ${mode}`);
}
