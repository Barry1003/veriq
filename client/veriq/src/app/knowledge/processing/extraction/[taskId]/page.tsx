import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiExtractionEvidenceScreen } from "@/features/institutional-knowledge/ai-extraction-evidence-screen";
import { getKnowledgeExtractionTask } from "@/services/knowledge-extraction";
import "../../knowledge-processing.css";
import "./ai-extraction-evidence.css";

export const metadata: Metadata = {
  title: "AI Extraction Evidence | Veriq",
  description: "Original institutional source, model task provenance and reviewable extracted claim",
};

export default async function AiExtractionEvidencePage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const evidence = await getKnowledgeExtractionTask(taskId);
  if (!evidence) notFound();
  return <AiExtractionEvidenceScreen evidence={evidence} />;
}
