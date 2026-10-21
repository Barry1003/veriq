export type RuntimeEvidenceState =
  "configured-example" | "unknown" | "not-tested";

export type RuntimeMetric = {
  id: "location" | "registration" | "reachability" | "validation";
  label: string;
  value: string;
  supportingText: string;
  state: RuntimeEvidenceState;
};

export type RuntimeDetail = { id: string; label: string; value: string };

export type RuntimeCheck = {
  id: string;
  order: number;
  title: string;
  requirement: string;
  state: "not-tested";
};

export type RuntimeReviewRule = {
  id: string;
  label: string;
  requirement: string;
};

export type LocalAiRuntimeSnapshot = {
  kind: "synthetic-preview";
  institution: string;
  metrics: readonly RuntimeMetric[];
  modelName: string;
  configuration: readonly RuntimeDetail[];
  boundary: readonly RuntimeDetail[];
  checks: readonly RuntimeCheck[];
  reviewRules: readonly RuntimeReviewRule[];
  failSafeNotes: readonly string[];
  latestTest: {
    state: "not-run";
    latency: "not-measured";
    modelResponse: "not-validated";
    outboundPolicy: "not-tested";
  };
};
