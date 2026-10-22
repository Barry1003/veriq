import { KnowledgeProcessingScreen } from "@/features/institutional-knowledge/knowledge-processing-screen";
import { getKnowledgeProcessing } from "@/services/knowledge-processing";
import { getKnowledgeSources } from "@/services/knowledge-sources";
import "./knowledge-processing.css";

export default async function KnowledgeProcessingPage() {
  const result = await Promise.all([
    getKnowledgeProcessing(),
    getKnowledgeSources(),
  ])
    .then(([processing, sources]) => ({ processing, sources, failed: false }))
    .catch(() => ({ processing: null, sources: null, failed: true }));

  if (result.failed || !result.processing || !result.sources) {
    return (
      <section className="kp-page" aria-labelledby="kp-unavailable">
        <h1 id="kp-unavailable">Knowledge processing unavailable</h1>
        <p>Review records could not be loaded.</p>
      </section>
    );
  }

  return (
    <KnowledgeProcessingScreen
      processing={result.processing}
      sources={result.sources}
    />
  );
}
