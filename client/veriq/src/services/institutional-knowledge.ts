import { getMockInstitutionalKnowledge } from "./adapters/institutional-knowledge";
import type { InstitutionalKnowledgeDataset } from "@/types/institutional-knowledge";

export async function getInstitutionalKnowledge(): Promise<InstitutionalKnowledgeDataset> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockInstitutionalKnowledge();
  if (source === "api") {
    throw new Error(
      "Institutional Knowledge API contract has not been provided yet.",
    );
  }
  throw new Error(`Unsupported Veriq data source: ${source}`);
}
