import type { JsonObject, Row } from "@/services/api/veriq";
export type InvestigationSummary = {
  id: string;
  triggerType: string;
  triggerId: string;
  state: string;
  revision: number;
  latestRevisionId: string;
  createdAt: string;
  updatedAt: string | null;
  evidenceCount: number | null;
  reviewRequired: boolean;
};
export type Observation = {
  record: Row;
  route: string;
  gateway: string;
  source: string;
  at: string;
  windowSeconds: number;
  attempts: number;
  timeouts: number;
  rate: number | null;
  incidentIds: string[];
};
export type Incident = {
  record: Row;
  route: string;
  gateway: string;
  source: string;
  state: string;
  rule: string;
  start: string;
  end: string;
  attempts: number;
  timeouts: number;
  rate: number;
  evidenceIds: string[];
  investigationIds: string[];
  contactTimes: string[];
};
export type Contact = {
  record: Row;
  text: string;
  channel: string;
  source: string;
  nativeId: string;
  customerId: string;
  transactionId: string | null;
  at: string;
  category: string;
  evidenceId: string;
};
export type Statement = { details: JsonObject; evidenceIds: string[] };
export type AssessmentViewModel = {
  state: string;
  qualification: string;
  acceptance: string;
  sourceFacts: Statement[];
  findings: Statement[];
  hypotheses: Statement[];
  contradictions: Statement[];
  unknowns: string[];
  nextChecks: string[];
};
export type Revision = {
  record: Row;
  number: number;
  context: JsonObject;
  evidenceIds: string[];
  findings: Statement[];
  hypotheses: Statement[];
  correlations: Statement[];
  unknowns: string[];
  recommendations: Statement[];
};
export type TaskTrace = {
  task: Row;
  redacted: boolean;
  reason: string | null;
  steps: Row[];
  error: string | null;
};
export type QueueData = {
  kind: "queue";
  investigations: InvestigationSummary[];
};
export type OperationsData = {
  kind: "operations";
  observations: Observation[];
  incidents: Incident[];
  contacts: Contact[];
  warnings: string[];
  observedAt: string;
};
export type WorkspaceData = {
  kind: "workspace";
  investigation: InvestigationSummary;
  revisions: Revision[];
  evidence: Row[];
  reviews: Row[];
  tasks: TaskTrace[];
  assessments: Record<string, AssessmentViewModel>;
  warnings: string[];
  canReview: boolean;
};
export type IssuesData = {
  kind: "issues";
  issues: {
    record: Row;
    category: string;
    count: number;
    channels: string[];
    meaning: string;
    evidenceIds: string[];
    contacts: Contact[];
  }[];
  contacts: Contact[];
};
export type IntelligenceData =
  | QueueData
  | OperationsData
  | WorkspaceData
  | IssuesData;
