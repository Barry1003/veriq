import { requireVeriqApi, type VeriqApi } from "./api/veriq";
import { getLiveKnowledgeSources } from "./adapters/live-knowledge-sources";
import { getMockKnowledgeSources } from "@/services/adapters/knowledge-sources";
import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";

export async function getKnowledgeSources(api?: VeriqApi): Promise<KnowledgeSourceSnapshot> {
  const source = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockKnowledgeSources();
  if (source === "api") return getLiveKnowledgeSources(requireVeriqApi(api));
  throw new Error(`Unsupported Veriq data source: ${source}`);
}
