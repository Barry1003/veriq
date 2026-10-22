import type { ConnectorRecord } from "@/types/connector-registry";

export type ConnectorFlowStage = {
  id: string;
  step: number;
  category: string;
  heading: string;
  detail: string;
  caption: string;
};

export type ConnectorFieldMapping = {
  sourceField: string;
  evidenceField: string;
  handling: string;
};

export type ConnectorTimelineEvent = {
  id: string;
  occurredAt: string;
  title: string;
  description: string;
  classification: string;
  reference: string;
};

export type ConnectorDetailEvidence = {
  kind: "synthetic-preview";
  connectorId: "OPS-FEED-02";
  sourceEventId: string;
  eventTime: string;
  ingestionTime: string;
  signalId: string;
  incidentId: string;
  investigationId: string;
  measuredPeakPercent: number;
  baselinePercent: number;
  flow: readonly ConnectorFlowStage[];
  mappings: readonly ConnectorFieldMapping[];
  events: readonly ConnectorTimelineEvent[];
  permittedRecords: string;
  prohibitedRecords: string;
};

export type ConnectorDetailSnapshot = {
  kind: "synthetic-preview";
  connector: ConnectorRecord;
  evidence: ConnectorDetailEvidence;
};
