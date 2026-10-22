import type { KnowledgeProcessingSnapshot, ReviewCandidate } from "@/types/knowledge-processing";
import { object, string, type VeriqApi } from "../api/veriq";

export async function getLiveKnowledgeProcessing(api: VeriqApi): Promise<KnowledgeProcessingSnapshot> {
  const [assertions, reviews] = await Promise.all([api.rows("assertions"), api.rows("reviews")]);
  const decisions = new Map<string, string>();
  // The backend orders rows by created_at; compare instants to avoid transport order assumptions.
  for (const review of [...reviews].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)))
    decisions.set(string(review.data.assertion_id), string(review.data.decision));
  const candidates: ReviewCandidate[] = assertions
    .filter(assertion => (decisions.get(assertion.id) ?? "candidate") === "candidate")
    .map(({ id, data }) => {
      const sourceId = string(data.source_id);
      const evidenceId = string(data.evidence_id);
      const knowledge = object(data.knowledge);
      return {
        id, title: `Knowledge assertion ${id}`, description: `Method: ${string(data.method)}`,
        sourceSummary: sourceId, sourceCollectionIds: [sourceId], status: "needs-review",
        inspectionTitle: "Candidate assertion",
        evidence: [{ label: "Source", value: sourceId }, { label: "Evidence", value: evidenceId }, { label: "Effective from", value: string(knowledge.valid_from) }],
        verificationGap: "Candidate assertion requires an authorized evidence review.", comparisons: [], suggestedRationale: "",
      };
    });
  return {
    kind: "live", candidates,
    timelineByCandidate: Object.fromEntries(candidates.map(candidate => [candidate.id, reviews
      .filter(review => review.data.assertion_id === candidate.id)
      .map(review => ({ timestamp: review.created_at, title: string(review.data.decision), detail: string(review.data.rationale) }))])),
  };
}
