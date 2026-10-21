import type { LocalAiRuntimeSnapshot } from "@/types/local-ai-runtime";

export const localAiRuntimeFixture: LocalAiRuntimeSnapshot = {
  kind: "synthetic-preview",
  institution: "Cedar Bank",
  metrics: [
    {
      id: "location",
      label: "INFERENCE LOCATION",
      value: "Bank local",
      supportingText: "Institution-controlled environment",
      state: "configured-example",
    },
    {
      id: "registration",
      label: "MODEL REGISTRATION",
      value: "Configured",
      supportingText: "Illustrative approved model slot",
      state: "configured-example",
    },
    {
      id: "reachability",
      label: "RUNTIME REACHABILITY",
      value: "Unknown",
      supportingText: "No live health probe shown",
      state: "unknown",
    },
    {
      id: "validation",
      label: "MODEL VALIDATION",
      value: "Test pending",
      supportingText: "No verified evaluation response",
      state: "not-tested",
    },
  ],
  modelName: "Bank-approved model slot · illustrative",
  configuration: [
    {
      id: "runtime",
      label: "RUNTIME TYPE",
      value: "Institution-hosted model server",
    },
    {
      id: "endpoint",
      label: "ENDPOINT",
      value: "Bank-controlled private endpoint",
    },
    {
      id: "selected",
      label: "SELECTED MODEL",
      value: "Configured profile · identity illustrative",
    },
    {
      id: "owner",
      label: "APPROVAL OWNER",
      value: "Bank AI governance administrator",
    },
    {
      id: "policy",
      label: "INFERENCE POLICY",
      value: "Local only · no external fallback",
    },
    {
      id: "credentials",
      label: "SECRET HANDLING",
      value: "Credential reference · masked",
    },
  ],
  boundary: [
    {
      id: "permitted",
      label: "PERMITTED INFERENCE",
      value: "Authorized investigation evidence only",
    },
    {
      id: "selection",
      label: "MODEL SELECTION",
      value: "Replaceable approved local models",
    },
    {
      id: "external",
      label: "EXTERNAL REQUESTS",
      value: "No automatic provider fallback",
    },
    {
      id: "access",
      label: "ACCESS POLICY",
      value: "Roles and source scopes apply",
    },
    {
      id: "handling",
      label: "EVIDENCE HANDLING",
      value: "Prompt provenance and case links",
    },
    {
      id: "output",
      label: "OUTPUT CLASSIFICATION",
      value: "Suggestions, not verified causes",
    },
  ],
  checks: [
    {
      id: "approval",
      order: 1,
      title: "Validate model approval",
      requirement: "Check active bank governance policy",
      state: "not-tested",
    },
    {
      id: "endpoint",
      order: 2,
      title: "Verify local endpoint",
      requirement: "Require a live authenticated health response",
      state: "not-tested",
    },
    {
      id: "input",
      order: 3,
      title: "Run permitted test input",
      requirement: "Use synthetic payload under defined scope",
      state: "not-tested",
    },
    {
      id: "provenance",
      order: 4,
      title: "Inspect output provenance",
      requirement: "Track model/version, time and source context",
      state: "not-tested",
    },
    {
      id: "fallback",
      order: 5,
      title: "Check external fallback",
      requirement: "Reject non-approved network/provider routes",
      state: "not-tested",
    },
  ],
  reviewRules: [
    {
      id: "records",
      label: "Original records",
      requirement: "Link all cited source IDs and event times",
    },
    {
      id: "identity",
      label: "Model identity",
      requirement: "Persist approved model/version identifier",
    },
    {
      id: "audit",
      label: "Inference audit",
      requirement: "Record authorized actor, case and invocation",
    },
    {
      id: "category",
      label: "Result category",
      requirement: "Hypothesis, observation or supported finding",
    },
    {
      id: "human",
      label: "Human decision",
      requirement: "Review before any verified cause claim",
    },
  ],
  failSafeNotes: [
    "If the model is down, stale, unauthorized or unvalidated, preserve the investigation and display the actual limitation.",
    "Never fill missing evidence with invented confidence percentages, scripted findings or assumed financial outcomes.",
  ],
  latestTest: {
    state: "not-run",
    latency: "not-measured",
    modelResponse: "not-validated",
    outboundPolicy: "not-tested",
  },
};
