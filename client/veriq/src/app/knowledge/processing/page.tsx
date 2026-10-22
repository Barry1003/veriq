import { requireSession } from "@/lib/session";
import { sessionVeriqApi } from "@/services/api/session-reader";
import { KnowledgeProcessingScreen } from "@/features/institutional-knowledge/knowledge-processing-screen";
import { getKnowledgeProcessing } from "@/services/knowledge-processing";
import { getKnowledgeSources } from "@/services/knowledge-sources";
import "./knowledge-processing.css";

export default async function KnowledgeProcessingPage() {
  const api = await sessionVeriqApi();
  const canReadSources = !api || (await requireSession()).role === "admin";
  const result = await Promise.all([
    getKnowledgeProcessing(api),
    canReadSources ? getKnowledgeSources(api) : Promise.resolve(null),
  ])
    .then(([processing, sources]) => ({ processing, sources, failed: false }))
    .catch(() => ({ processing: null, sources: null, failed: true }));

  if (result.failed || !result.processing) {
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
