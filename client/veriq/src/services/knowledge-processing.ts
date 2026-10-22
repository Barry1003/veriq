import { requireVeriqApi, type VeriqApi } from "./api/veriq";
import { getLiveKnowledgeProcessing } from "./adapters/live-knowledge-processing";
import { getMockKnowledgeProcessing } from "@/services/adapters/knowledge-processing";
import type { KnowledgeProcessingSnapshot } from "@/types/knowledge-processing";

export async function getKnowledgeProcessing(api?: VeriqApi): Promise<KnowledgeProcessingSnapshot> {
  const source = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockKnowledgeProcessing();
  if (source === "api") return getLiveKnowledgeProcessing(requireVeriqApi(api));
  throw new Error(`Unsupported Veriq data source: ${source}`);
}
