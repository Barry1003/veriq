import type { CustomerInteractionSnapshot } from "@/types/customer-interactions";

export type IssueEvidenceKind =
  | "source-backed-observation"
  | "candidate-association"
  | "unverified-hypothesis"
  | "missing-authoritative-source";

export type IssueEvidence = {
  readonly kind: IssueEvidenceKind;
  readonly summary: string;
};

export type SourceTimeWindow = {
  readonly label: string;
  readonly count: number;
};

export type EmergingIssue = {
  readonly id: string;
  readonly title: string;
  readonly theme: string;
  readonly classification: "candidate-under-review";
  readonly linkedInvestigation: string;
  readonly linkedOperationalSource: string;
  readonly historicalKnowledgeVersions: readonly string[];
  readonly financialOutcome: "unknown";
  readonly verifiedCauses: number;
  readonly verifiedFailureCount: null;
  readonly historicalBaseline: null;
  readonly sourceWindows: readonly SourceTimeWindow[];
  readonly evidence: readonly IssueEvidence[];
};

export type EmergingIssueSnapshot = {
  readonly kind: "synthetic-preview";
  readonly customer: CustomerInteractionSnapshot;
  readonly issues: readonly EmergingIssue[];
};

