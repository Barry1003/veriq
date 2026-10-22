import type { KnowledgeProcessingSnapshot } from "@/types/knowledge-processing";

export const knowledgeProcessingFixture: KnowledgeProcessingSnapshot = {
  kind: "synthetic-preview",
  candidates: [
    {
      id: "KNW-CAND-021",
      title: "Possible route/version mismatch",
      description: "Scope and source time need confirmation",
      sourceSummary: "OPS-00128 vs. SRC-ROUTE-01 / v8",
      sourceCollectionIds: ["SRC-ROUTE-01"],
      status: "needs-review",
      inspectionTitle: "G2 observation after G3 revision",
      evidence: [
        { label: "OPERATIONAL SOURCE", value: "OPS-00128 · G2 at 14:06:15 WAT" },
        { label: "INSTITUTIONAL DOCUMENT", value: "SRC-ROUTE-01 / v8 · Gateway G3" },
        { label: "EFFECTIVE DATE", value: "v8 effective from 20 Oct 2026" },
        { label: "DOCUMENT SOURCE OWNER", value: "Cedar Payments Engineering" },
        { label: "CANDIDATE CLASS", value: "Possible inconsistency · unverified" },
      ],
      verificationGap:
        "Route changes may have different scopes or alternate paths. Confirm source event time and coverage before declaring a conflict or cause.",
      comparisons: [
        {
          label: "V7 · HISTORICAL RELATIONSHIP",
          statement: "Instant Transfer → Gateway G2",
          context: "Previous route version; retain as historical",
        },
        {
          label: "V8 · CURRENT DOCUMENTED RELATIONSHIP",
          statement: "Instant Transfer → Gateway G3",
          context: "Published as current from 20 Oct",
        },
        {
          label: "OPS-00128 · OPERATIONAL EVIDENCE",
          statement: "Observed record references Gateway G2",
          context: "21 Oct event; may have alternate path or scope",
        },
      ],
      suggestedRationale:
        "Check gateway scope, event-time route selection, original source owner and reconciliation context.",
    },
    {
      id: "KNW-CAND-022",
      title: "Exception SOP to service dependency",
      description: "Procedure relation requires owner review",
      sourceSummary: "SRC-SOP-03 / v3 · service map v5",
      sourceCollectionIds: ["SRC-SOP-03", "SRC-DEP-02"],
      status: "needs-review",
      inspectionTitle: "Procedure and service dependency claim",
      evidence: [
        { label: "PROCEDURE SOURCE", value: "SRC-SOP-03 / v3 · Exception handling SOP" },
        { label: "DEPENDENCY SOURCE", value: "SRC-DEP-02 / v5 · Service dependency map" },
        { label: "SOURCE OWNER", value: "Cedar Bank Operations · procedure" },
        { label: "CANDIDATE CLASS", value: "Proposed relationship · unverified" },
      ],
      verificationGap:
        "The procedure and service map must be checked against their original versions and ownership scope before their relationship is approved.",
      comparisons: [
        {
          label: "PROCEDURE / V3",
          statement: "SRC-SOP-03 · Exception handling SOP",
          context: "Requires source-owner review",
        },
        {
          label: "DEPENDENCY MAP / V5",
          statement: "SRC-DEP-02 · Service dependency map",
          context: "Relationship not yet established by reviewed evidence",
        },
      ],
      suggestedRationale:
        "Request original SOP and service-map review with matching effective dates and authorized source owner.",
    },
  ],
  timelineByCandidate: {
    "KNW-CAND-021": [
      {
        timestamp: "20 Oct · 09:20 WAT",
        title: "Cedar routing source updated · v8",
        detail: "Bank source event; original retained",
      },
      {
        timestamp: "21 Oct · 14:03 WAT",
        title: "SRC-ROUTE-01 / v8 ingested",
        detail: "Veriq ingestion event",
      },
      {
        timestamp: "21 Oct · 14:04 WAT",
        title: "KNW-CAND-021 extracted",
        detail: "Candidate relationship; unverified",
      },
      {
        timestamp: "21 Oct · 14:12 WAT",
        title: "Analyst review requested",
        detail: "Approval or rejection not yet recorded",
      },
    ],
    "KNW-CAND-022": [],
  },
};
