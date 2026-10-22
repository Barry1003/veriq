export type VerifiedGate = "verified" | "failed" | "not-verified";
export interface BackendReadiness {
  applicationService: VerifiedGate;
  persistence: VerifiedGate;
  administratorAccess: VerifiedGate;
  policyBoundary: VerifiedGate;
  auditPersistence: VerifiedGate;
  activationAllowed: boolean;
}

export interface SetupReadinessResponse {
  state: "ready_unqualified" | "ready_limited" | "blocked";
  activation_allowed: boolean;
  activation_valid: boolean;
  checks: Record<string, boolean>;
  sources: Array<{
    source_id: string;
    authorization_state: string;
    record_types: string[];
    ingested: boolean;
    ai_enabled: boolean;
    last_received_at: string | null;
    last_pull_at: string | null;
    last_error: string | null;
    delivery: string;
  }>;
  ai: Record<string, unknown>;
  limitations: string[];
  activation: unknown;
}

export interface SetupResponse {
  scope: string;
  profile: { data: Record<string, unknown> } | null;
  administrator: { subject: string; roles: string[]; clearance: string };
  identity_provider_verified: false;
  configuration_owner: "deployment_administrator";
}

export function getUnverifiedReadiness(): BackendReadiness {
  return {
    applicationService: "not-verified",
    persistence: "not-verified",
    administratorAccess: "not-verified",
    policyBoundary: "not-verified",
    auditPersistence: "not-verified",
    activationAllowed: false,
  };
}
