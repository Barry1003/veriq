import { sessionVeriqApi } from "@/services/api/session-reader";
import { KnowledgeExplorer } from "@/features/institutional-knowledge/knowledge-explorer";
import { getInstitutionalKnowledge } from "@/services/institutional-knowledge";
import { getKnowledgeProcessing } from "@/services/knowledge-processing";
import "./knowledge.css";

export default async function KnowledgePage() {
  const api = await sessionVeriqApi();
  let pageData: {
    knowledge: Awaited<ReturnType<typeof getInstitutionalKnowledge>>;
    processing: Awaited<ReturnType<typeof getKnowledgeProcessing>>;
  } | null = null;

  try {
    const [knowledge, processing] = await Promise.all([
      getInstitutionalKnowledge(api),
      getKnowledgeProcessing(api),
    ]);
    pageData = { knowledge, processing };
  } catch {
    return (
      <section className="kn-page kn-unavailable" role="status">
        <h1>Knowledge Explorer unavailable</h1>
        <p>Knowledge records could not be loaded. Check the configured data connection.</p>
      </section>
    );
  }

  return (
    <KnowledgeExplorer
      dataset={pageData.knowledge}
      processedRecordCount={pageData.knowledge.sources.length}
      sourceRecordLabel={"Retrieved evidence records"}
      pendingReviewCount={pageData.processing.candidates.filter((candidate) => candidate.status === "needs-review").length}
    />
  );
}
