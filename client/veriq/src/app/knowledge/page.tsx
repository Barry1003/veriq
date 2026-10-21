import { KnowledgeExplorer } from "@/features/institutional-knowledge/knowledge-explorer";
import { getInstitutionalKnowledge } from "@/services/institutional-knowledge";
import type { InstitutionalKnowledgeDataset } from "@/types/institutional-knowledge";
import "./knowledge.css";

export default async function KnowledgePage() {
  let dataset: InstitutionalKnowledgeDataset;
  try {
    dataset = await getInstitutionalKnowledge();
  }
  catch { return <section className="kn-page"><h1>Knowledge source unavailable</h1><p>No authorized Knowledge API contract is configured. Enable mock preview mode to inspect synthetic source relationships.</p></section>; }
  return <KnowledgeExplorer dataset={dataset} />;
}
