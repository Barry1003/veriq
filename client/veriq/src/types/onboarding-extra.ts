export type AdditionalSetupState =
  | "administrator-binding-failed"
  | "local-ai-unavailable"
  | "core-ready-limited"
  | "activation-complete";

export type SetupValidationResult =
  | { kind: "identity_binding_failed"; description: string; code: string }
  | { kind: "local_ai_unavailable"; description: string; code: string }
  | { kind: "core_ready_limited"; description: string; evidenceReference: string }
  | { kind: "activated"; description: string; activationRecord: string };

export function isAdditionalSetupState(x: string): x is AdditionalSetupState {
  return x === "administrator-binding-failed" || x === "local-ai-unavailable" || x === "core-ready-limited" || x === "activation-complete";
}

