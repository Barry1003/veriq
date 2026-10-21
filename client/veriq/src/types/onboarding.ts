export type SetupStage = 1 | 2 | 3 | 4 | 5;
export type SourceId = "knowledge" | "operations" | "customer" | "reconciliation";

export interface OnboardingDraft {
  institutionName: string;
  deploymentLabel: string;
  hostingBoundary: string;
  region: string;
  identityProvider: string;
  identityIssuer: string;
  administratorIdentity: string;
  privilegedRole: string;
  groupMapping: string;
  inferenceRuntime: string;
  inferenceEndpoint: string;
  modelProfile: string;
  modelVersion: string;
  selectedSources: Record<SourceId, boolean>;
  sourceScopes: Record<SourceId, string>;
}

export const INITIAL_ONBOARDING_DRAFT: OnboardingDraft = {
  institutionName: "Cedar Bank (synthetic example)",
  deploymentLabel: "Cedar demo · bank-controlled",
  hostingBoundary: "Institution-managed environment",
  region: "Africa/Lagos · WAT",
  identityProvider: "Institution OIDC / SSO · sample",
  identityIssuer: "",
  administratorIdentity: "",
  privilegedRole: "VERIQ_PLATFORM_ADMIN",
  groupMapping: "",
  inferenceRuntime: "Institution-hosted inference server",
  inferenceEndpoint: "",
  modelProfile: "Institution-selected local model · pending",
  modelVersion: "",
  selectedSources: { knowledge: true, operations: true, customer: true, reconciliation: false },
  sourceScopes: { knowledge: "", operations: "", customer: "", reconciliation: "" },
};

export const ONBOARDING_STEPS = [
  { id: 1, label: "Institution profile", description: "Institution and environment" },
  { id: 2, label: "Administrator access", description: "Administrator Access" },
  { id: 3, label: "Local model policy", description: "Local AI & Model Policy" },
  { id: 4, label: "Approved bank sources", description: "Approved Bank Sources" },
  { id: 5, label: "Readiness verification", description: "Readiness & Activation" },
] as const;