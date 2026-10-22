import { getMockKnowledgeSources } from "@/services/adapters/knowledge-sources";
import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";

export async function getKnowledgeSources(): Promise<KnowledgeSourceSnapshot> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockKnowledgeSources();
  if (source === "api") {
    throw new Error("Knowledge sources API contract has not been provided.");
  }
  throw new Error(`Unsupported Veriq data source: ${source}`);
}
