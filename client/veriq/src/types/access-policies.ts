export type AccessRoleId =
  | "platform-admin"
  | "investigation-analyst"
  | "knowledge-reviewer"
  | "audit-observer";
export type AccessDecision = "allow" | "deny" | "scoped";
export type AccessCapabilityId =
  | "configure-connectors"
  | "inspect-evidence"
  | "approve-knowledge"
  | "read-audit"
  | "change-policy";

export type AccessRole = {
  id: AccessRoleId;
  label: string;
  allowedWork: string;
  governanceLimit: string;
};

export type CapabilityRow = {
  id: AccessCapabilityId;
  label: string;
  decisions: Readonly<Record<AccessRoleId, AccessDecision>>;
};

export type StaffExample = {
  id: string;
  displayName: string;
  role: AccessRoleId;
  note: string;
};

export type ExampleAccessDecision = {
  actorId: string;
  request: string;
  resource: string;
  result: string;
  reason: string;
};

export type AnalystRoleContext = {
  caseAccess: string;
  knowledgeExplorer: string;
  operationalMonitoring: string;
  connectorConfiguration: string;
  accessPolicyChanges: string;
  humanCauseValidation: string;
};

export type AccessPoliciesSnapshot = {
  kind: "synthetic-preview";
  institution: string;
  roles: readonly AccessRole[];
  capabilities: readonly CapabilityRow[];
  staff: readonly StaffExample[];
  analystContext: AnalystRoleContext;
  sampleDecision: ExampleAccessDecision;
};
