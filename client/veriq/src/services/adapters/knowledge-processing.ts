import { knowledgeProcessingFixture } from "@/data/knowledge-processing";
import type { KnowledgeProcessingSnapshot } from "@/types/knowledge-processing";

export async function getMockKnowledgeProcessing(): Promise<KnowledgeProcessingSnapshot> {
  return knowledgeProcessingFixture;
}
