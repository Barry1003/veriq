import type { EmergingIssue } from "@/types/emerging-issues";

export const emergingIssueFixture: readonly EmergingIssue[] = [
  {
    id: "EMG-009",
    title: "Similar delayed-transfer reports",
    theme: "Delayed or uncertain transfers",
    classification: "candidate-under-review",
    linkedInvestigation: "INV-014",
    linkedOperationalSource: "OPS-00128",
    historicalKnowledgeVersions: ["SRC-ROUTE-01/v7", "SRC-ROUTE-01/v8"],
    financialOutcome: "unknown",
    verifiedCauses: 0,
    verifiedFailureCount: null,
    historicalBaseline: null,
    sourceWindows: [
      { label: "14:00–14:14", count: 1 },
      { label: "14:15–14:29", count: 1 },
      { label: "14:30–14:44", count: 2 },
      { label: "14:45–14:59", count: 5 },
    ],
    evidence: [
      { kind: "source-backed-observation", summary: "9 logged interactions across 3 channels" },
      { kind: "candidate-association", summary: "Customer reports and operational telemetry overlap in time" },
      { kind: "unverified-hypothesis", summary: "Routing behavior could be contributing" },
      { kind: "missing-authoritative-source", summary: "Transaction reconciliation is not yet available" },
    ],
  },
];

