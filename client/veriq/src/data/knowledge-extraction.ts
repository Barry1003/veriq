import type { ExtractionTaskDetail } from "@/types/knowledge-extraction";

export const knowledgeExtractionExample: ExtractionTaskDetail = {
  kind: "synthetic-example",
  taskId: "TASK-KNW-0027",
  candidateId: "KNW-CAND-022",
  source: {
    id: "SRC-SOP-03",
    version: "v3",
    section: "4.2",
    title: "Exception response operating procedure",
    excerpt: "When a transfer remains unresolved after the initial service check, operations requests supporting settlement evidence from the reconciliation service.",
    originalReference: "SRC-SOP-03 / v3 · section 4.2",
  },
  task: {
    status: "completed",
    purpose: "extract-institutional-relations",
    inferenceBoundary: "Bank-approved local endpoint",
    modelId: null,
    processedAt: "21 Oct 2026 · 14:09 WAT",
    outputState: "candidate-produced",
  },
  candidate: {
    from: "Exception escalation",
    to: "Reconciliation service",
    proposedRelationship: "Requests supporting settlement evidence",
    verificationStatus: "needs-review",
    effectiveFrom: null,
  },
  checks: [
    { field: "Source authority", observedEvidence: "Approved bank SOP v3 · document original", assessment: "Source present, scope check pending", state: "needs-review" },
    { field: "Excerpt attribution", observedEvidence: "Section 4.2 · source offsets retained", assessment: "Traceable candidate", state: "traceable" },
    { field: "Extracted entities", observedEvidence: "Exception escalation / reconciliation service", assessment: "Entities reviewable", state: "reviewable" },
    { field: "Temporal applicability", observedEvidence: "Document effective time not established", assessment: "Missing evidence", state: "missing" },
    { field: "Institutional claim", observedEvidence: "Procedure requests settlement evidence", assessment: "Human policy review needed", state: "needs-review" },
  ],
};
