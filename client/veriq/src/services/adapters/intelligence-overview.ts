import { intelligenceOverviewFixture } from "@/data/intelligence-overview";
import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
export async function getMockIntelligenceOverview(): Promise<IntelligenceOverviewData> { return intelligenceOverviewFixture; }
