import { institutionalKnowledgeFixture } from "@/data/institutional-knowledge";
import type { InstitutionalKnowledgeDataset } from "@/types/institutional-knowledge";

export async function getMockInstitutionalKnowledge(): Promise<InstitutionalKnowledgeDataset> {
  return institutionalKnowledgeFixture;
}
