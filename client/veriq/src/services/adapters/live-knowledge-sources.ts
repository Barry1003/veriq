import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";
import { array, number, string, type VeriqApi } from "../api/veriq";

export async function getLiveKnowledgeSources(api: VeriqApi): Promise<KnowledgeSourceSnapshot> {
  const sources = await api.rows("sources");
  const collections = sources.map(({ data }) => {
    const received = number(data.ingested);
    const authorization = string(data.authorization_state);
    const lastError = typeof data.last_error === "string" ? data.last_error : null;
    return {
      id: string(data.source_id), name: string(data.name), owner: "Source owner not provided",
      scope: array(data.record_types, string).join(", "),
      lastReceivedAt: typeof data.last_received_at === "string" ? data.last_received_at : null,
      connected: authorization === "active" && received > 0 && !lastError,
      authorizationState: authorization, lastError,
      deliveryLabel: authorization === "revoked" ? "Revoked" : lastError ? "Polling error" : received ? "Records received" : "No records received",
      recordCount: received,
    };
  });
  return { recordCountLabel: "Ingested source records", collections, previewTotals: { processedRecords: collections.reduce((sum, item) => sum + item.recordCount, 0) } };
}
