import { KnowledgeSourcesScreen } from "@/features/institutional-knowledge/knowledge-sources-screen";
import { getKnowledgeSources } from "@/services/knowledge-sources";
import "./knowledge-sources.css";

export default async function KnowledgeSourcesPage() {
  const result = await getKnowledgeSources()
    .then((snapshot) => ({ snapshot, failed: false }))
    .catch(() => ({ snapshot: null, failed: true }));

  if (result.failed || !result.snapshot) {
    return (
      <section className="ks-page" aria-labelledby="ks-unavailable">
        <h1 id="ks-unavailable">Knowledge sources unavailable</h1>
        <p>Source collections could not be loaded.</p>
      </section>
    );
  }

  return <KnowledgeSourcesScreen snapshot={result.snapshot} />;
}
