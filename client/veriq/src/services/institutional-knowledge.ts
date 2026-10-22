import { requireVeriqApi, type VeriqApi } from "./api/veriq";
import { getLiveInstitutionalKnowledge } from "./adapters/live-institutional-knowledge";
import { getMockInstitutionalKnowledge } from "./adapters/institutional-knowledge";
import type { InstitutionalKnowledgeDataset } from "@/types/institutional-knowledge";

export async function getInstitutionalKnowledge(api?: VeriqApi): Promise<InstitutionalKnowledgeDataset> {
  const source = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockInstitutionalKnowledge();
  if (source === "api") return getLiveInstitutionalKnowledge(requireVeriqApi(api));
  throw new Error(`Unsupported Veriq data source: ${source}`);
}
