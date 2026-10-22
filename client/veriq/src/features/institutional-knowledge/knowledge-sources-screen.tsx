import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";
import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";

export function KnowledgeSourcesScreen({ snapshot }: { snapshot: KnowledgeSourceSnapshot }) {
  return (
    <section className="ks-page" aria-labelledby="ks-title">
      <header className="ks-heading">
        <div>
          <p className="ks-overline">INSTITUTIONAL KNOWLEDGE / V07</p>
          <h1 id="ks-title">Knowledge Sources</h1>
          <p>Review source ownership, scope, and received records.</p>
        </div>
        <Link className="ks-action" href="/knowledge/processing">
          View processing <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <div className="ks-summary" aria-label="Source summary">
        <article><Database size={20} aria-hidden="true" /><span>Source collections</span><strong>{snapshot.collections.length}</strong></article>
        <article><span>Processed records</span><strong>{snapshot.previewTotals.processedRecords}</strong></article>
        <article><span>Connected sources</span><strong>{snapshot.collections.filter((item) => item.connected).length}</strong></article>
      </div>
      <h2>Registered collections</h2>
      <div className="ks-table-wrap">
        <table className="ks-table">
          <thead><tr><th>Collection</th><th>Owner</th><th>Authorized scope</th><th>Records</th><th>Connection</th><th>Last received</th></tr></thead>
          <tbody>
            {snapshot.collections.map((source) => (
              <tr key={source.id}>
                <td><strong>{source.name}</strong><small>{source.id}</small></td>
                <td>{source.owner}</td>
                <td>{source.scope}</td>
                <td>{source.recordCount}</td>
                <td><span className={`ks-status${source.connected ? " is-connected" : ""}`}>{source.connected ? "Connected" : "Not connected"}</span></td>
                <td>{source.lastReceivedAt ?? "No records received"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
