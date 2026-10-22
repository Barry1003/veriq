import { KnowledgeExplorer } from "@/features/institutional-knowledge/knowledge-explorer";
import { getInstitutionalKnowledge } from "@/services/institutional-knowledge";
import { getKnowledgeSources } from "@/services/knowledge-sources";
import { getKnowledgeProcessing } from "@/services/knowledge-processing";
import "./knowledge.css";

export default async function KnowledgePage() {
  let pageData: {
    knowledge: Awaited<ReturnType<typeof getInstitutionalKnowledge>>;
    sourceCatalog: Awaited<ReturnType<typeof getKnowledgeSources>>;
    processing: Awaited<ReturnType<typeof getKnowledgeProcessing>>;
  } | null = null;

  try {
    const [knowledge, sourceCatalog, processing] = await Promise.all([
      getInstitutionalKnowledge(),
      getKnowledgeSources(),
      getKnowledgeProcessing(),
    ]);
    pageData = { knowledge, sourceCatalog, processing };
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
      processedRecordCount={pageData.sourceCatalog.previewTotals.processedRecords}
      sourceRecordLabel={pageData.sourceCatalog.recordCountLabel}
      pendingReviewCount={pageData.processing.candidates.filter((candidate) => candidate.status === "needs-review").length}
    />
  );
}
