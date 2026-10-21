
export type VerifiedGate = "verified" | "failed" | "not-verified";
export interface BackendReadiness {
  applicationService: VerifiedGate;
  persistence: VerifiedGate;
  administratorAccess: VerifiedGate;
  policyBoundary: VerifiedGate;
  auditPersistence: VerifiedGate;
  activationAllowed: boolean;
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