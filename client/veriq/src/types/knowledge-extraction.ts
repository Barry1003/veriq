export type ExtractionCheckAssessment = "traceable" | "reviewable" | "missing" | "needs-review";

export interface ExtractionEvidenceCheck {
  readonly field: string;
  readonly observedEvidence: string;
  readonly assessment: string;
  readonly state: ExtractionCheckAssessment;
}

export interface ExtractionTaskDetail {
  readonly kind: "synthetic-example";
  readonly taskId: string;
  readonly candidateId: string;
  readonly source: {
    readonly id: string;
    readonly version: string;
    readonly section: string;
    readonly title: string;
    readonly excerpt: string;
    readonly originalReference: string;
  };
  readonly task: {
    readonly status: "completed";
    readonly purpose: string;
    readonly inferenceBoundary: string;
    readonly modelId: string | null;
    readonly processedAt: string;
    readonly outputState: "candidate-produced";
  };
  readonly candidate: {
    readonly from: string;
    readonly to: string;
    readonly proposedRelationship: string;
    readonly verificationStatus: "needs-review";
    readonly effectiveFrom: string | null;
  };
  readonly checks: readonly ExtractionEvidenceCheck[];
}

export interface EvidenceRequestDraft {
  readonly taskId: string;
  readonly candidateId: string;
  readonly requestedEvidence: string;
  readonly sourceReferences: readonly string[];
}
