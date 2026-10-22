export type EvidenceReference = { label: string; value: string };

export type SourceComparison = {
  label: string;
  statement: string;
  context: string;
};

export type ReviewCandidate = {
  id: string;
  title: string;
  description: string;
  sourceSummary: string;
  sourceCollectionIds: readonly string[];
  status: "needs-review";
  inspectionTitle: string;
  evidence: readonly EvidenceReference[];
  verificationGap: string;
  comparisons: readonly SourceComparison[];
  suggestedRationale: string;
};

export type ReviewTimelineEvent = {
  timestamp: string;
  title: string;
  detail: string;
};

export type KnowledgeProcessingSnapshot = {
  kind: "synthetic-preview";
  candidates: readonly ReviewCandidate[];
  timelineByCandidate: Readonly<
    Record<string, readonly ReviewTimelineEvent[]>
  >;
};

export type LocalReviewDecision = "approve" | "reject" | "defer";

export type ReviewDraft = {
  candidateId: string;
  decision: LocalReviewDecision;
  rationale: string;
};
