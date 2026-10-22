import { getMockKnowledgeProcessing } from "@/services/adapters/knowledge-processing";
import type { KnowledgeProcessingSnapshot } from "@/types/knowledge-processing";

export async function getKnowledgeProcessing(): Promise<KnowledgeProcessingSnapshot> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockKnowledgeProcessing();
  if (source === "api") {
    throw new Error("Knowledge review API contract is not configured.");
  }
  throw new Error(`Unsupported Veriq data source: ${source}`);
}
