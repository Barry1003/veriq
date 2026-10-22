import { knowledgeSourcesFixture } from "@/data/knowledge-sources";
import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";

export async function getMockKnowledgeSources(): Promise<KnowledgeSourceSnapshot> {
  return knowledgeSourcesFixture;
}
