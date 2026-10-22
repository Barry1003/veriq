import { getMockKnowledgeExtractionTask } from "@/services/adapters/knowledge-extraction";
import type { ExtractionTaskDetail } from "@/types/knowledge-extraction";

export async function getKnowledgeExtractionTask(taskId: string): Promise<ExtractionTaskDetail | null> {
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockKnowledgeExtractionTask(taskId);
  if (mode === "api") throw new Error("Knowledge extraction task API adapter has not been integrated.");
  throw new Error(`Unknown frontend data source: ${mode}`);
}
