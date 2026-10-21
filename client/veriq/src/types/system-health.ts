export type EvidenceState =
  "unknown" | "historical" | "pending" | "not-connected";

export type HealthService = {
  id: string;
  name: string;
  purpose: string;
  evidence: string;
  state: EvidenceState;
  statusLabel: string;
};

export type SourceActivity = {
  id: string;
  description: string;
  lastEvent: string | null;
  freshness: string;
  state: EvidenceState;
};

export type RequiredCheck = {
  id: string;
  title: string;
  requirement: string;
  state: "not-tested";
};

export type SystemHealthSnapshot = {
  kind: "synthetic-preview";
  institution: string;
  environment: string;
  hostingLabel: string;
  inferenceStatus: string;
  healthCertainty: string;
  services: readonly HealthService[];
  sources: readonly SourceActivity[];
  requiredChecks: readonly RequiredCheck[];
};
