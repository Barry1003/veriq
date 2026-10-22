import { knowledgeExtractionExample } from "@/data/knowledge-extraction";
import type { ExtractionTaskDetail } from "@/types/knowledge-extraction";

export async function getMockKnowledgeExtractionTask(taskId: string): Promise<ExtractionTaskDetail | null> {
  return taskId === knowledgeExtractionExample.taskId ? knowledgeExtractionExample : null;
}
