import type { ConnectorRecord } from "@/types/connector-registry";

export type SourceFieldMapping = Readonly<{
  source: string;
  target: string;
  handling: string;
}>;
export type ConnectorMetric = Readonly<{
  label: string;
  value: string;
  detail: string;
}>;
export type ConnectorVariantBase = Readonly<{
  kind: "synthetic-preview";
  connector: ConnectorRecord;
  metrics: readonly ConnectorMetric[];
  mappings: readonly SourceFieldMapping[];
}>;
export type KnowledgeOriginalRecord = Readonly<{
  id: string;
  version: "v7" | "v8";
  description: string;
  validation: "validated" | "historic" | "invalid";
  knowledgeState: string;
  gateway: "G2" | "G3";
  effectiveFrom: string | null;
  originalEventAt: string | null;
  ingestedAt: string | null;
  schema: string;
}>;
export type KnowledgeConnectorVariant = ConnectorVariantBase & Readonly<{
  variant: "knowledge";
  records: readonly KnowledgeOriginalRecord[];
  sourceCollectionId: string;
  owner: string;
  routingRevisions: readonly string[];
}>;
export type CustomerSourceContact = Readonly<{
  id: string;
  channel: string;
  receivedAt: string;
  status: string;
  summary: string;
  caseId: string;
  originalStatement: string | null;
  suggestedCategory: string | null;
  claimedOutcome: string | null;
  transactionLink: string | null;
}>;
export type CustomerConnectorVariant = ConnectorVariantBase & Readonly<{
  variant: "customer";
  contacts: readonly CustomerSourceContact[];
  contactTotal: number;
  channelTotal: number;
  uniqueCustomers: number | null;
  sourceOwner: string;
  emergingIssueId: string;
}>;
export type ConnectorVariantSnapshot = KnowledgeConnectorVariant | CustomerConnectorVariant;

