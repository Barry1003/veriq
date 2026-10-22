import type { AccessPoliciesSnapshot } from "@/types/access-policies";

export const accessPoliciesFixture: AccessPoliciesSnapshot = {
  kind: "synthetic-preview",
  institution: "Cedar Bank · Demo environment",
  roles: [
    {
      id: "platform-admin",
      label: "Platform administrator",
      allowedWork: "Runtime, connectors, access",
      governanceLimit: "No assumed case sign-off",
    },
    {
      id: "investigation-analyst",
      label: "Investigation analyst",
      allowedWork: "Evidence, hypotheses, cases",
      governanceLimit: "No connector secrets",
    },
    {
      id: "knowledge-reviewer",
      label: "Knowledge reviewer",
      allowedWork: "Source claim review",
      governanceLimit: "Source-bound approval only",
    },
    {
      id: "audit-observer",
      label: "Audit observer",
      allowedWork: "Read authorized audit records",
      governanceLimit: "Read-only, scoped",
    },
  ],
  capabilities: [
    {
      id: "configure-connectors",
      label: "Configure connectors",
      decisions: {
        "platform-admin": "allow",
        "investigation-analyst": "deny",
        "knowledge-reviewer": "deny",
        "audit-observer": "deny",
      },
    },
    {
      id: "inspect-evidence",
      label: "Inspect assigned investigation evidence",
      decisions: {
        "platform-admin": "scoped",
        "investigation-analyst": "scoped",
        "knowledge-reviewer": "scoped",
        "audit-observer": "scoped",
      },
    },
    {
      id: "approve-knowledge",
      label: "Approve extracted knowledge claims",
      decisions: {
        "platform-admin": "deny",
        "investigation-analyst": "deny",
        "knowledge-reviewer": "scoped",
        "audit-observer": "deny",
      },
    },
    {
      id: "read-audit",
      label: "Read audit trail",
      decisions: {
        "platform-admin": "scoped",
        "investigation-analyst": "scoped",
        "knowledge-reviewer": "scoped",
        "audit-observer": "scoped",
      },
    },
    {
      id: "change-policy",
      label: "Change roles or policies",
      decisions: {
        "platform-admin": "allow",
        "investigation-analyst": "deny",
        "knowledge-reviewer": "deny",
        "audit-observer": "deny",
      },
    },
  ],
  staff: [
    {
      id: "staff-01",
      displayName: "A. Bello",
      role: "investigation-analyst",
      note: "Cases assigned · read evidence",
    },
    {
      id: "staff-02",
      displayName: "N. Ade",
      role: "platform-admin",
      note: "Runtime / connector admin",
    },
    {
      id: "staff-03",
      displayName: "F. Ajayi",
      role: "knowledge-reviewer",
      note: "Source claim approvals",
    },
    {
      id: "staff-04",
      displayName: "R. Okafor",
      role: "audit-observer",
      note: "Authorized event access",
    },
  ],
  analystContext: {
    caseAccess: "Assigned, authorized investigations",
    knowledgeExplorer: "Read approved source evidence",
    operationalMonitoring: "Read authorized measurements",
    connectorConfiguration: "Denied",
    accessPolicyChanges: "Denied",
    humanCauseValidation: "Review with supporting evidence",
  },
  sampleDecision: {
    actorId: "staff-01",
    request: "Read original source OPS-00128",
    resource: "INV-014 / authorized case evidence",
    result: "Scoped access · illustrative",
    reason: "Case assignment + source authorization",
  },
};
