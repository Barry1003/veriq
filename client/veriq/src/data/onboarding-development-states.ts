import type { AdditionalSetupState, SetupValidationResult } from "@/types/onboarding-extra";

export const developmentSetupStates: Record<AdditionalSetupState, SetupValidationResult> = {
  "administrator-binding-failed": {
    kind: "identity_binding_failed",
    code: "IDP_ISSUER_MISMATCH",
    description: "Expected the bank-approved identity issuer; no privilege granted.",
  },
  "local-ai-unavailable": {
    kind: "local_ai_unavailable",
    code: "INFERENCE_ENDPOINT_UNAVAILABLE",
    description: "Institution-approved inference endpoint could not be reached. External fallback remains disabled.",
  },
  "core-ready-limited": {
    kind: "core_ready_limited",
    evidenceReference: "DEV-CORE-READINESS-EXAMPLE",
    description: "Required core checks passed; optional source and AI checks remain limited.",
  },
  "activation-complete": {
    kind: "activated",
    activationRecord: "DEV-ACTIVATION-EXAMPLE",
    description: "Example of a backend-authorized activation response, not an actual activation.",
  },
};

