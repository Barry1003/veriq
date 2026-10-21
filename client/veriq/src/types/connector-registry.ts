export type ConnectorCategory =
  "knowledge" | "operational" | "customer" | "investigation";
export type ConnectorConnection = "connected-example" | "not-connected";
export type ConnectorProcessing =
  | "processed-example"
  | "review-required"
  | "observations-received"
  | "interactions-received"
  | "no-records";

export type ConnectorRecord = {
  id: string;
  category: ConnectorCategory;
  sourceDescription: string;
  bankOwner: string;
  authorization: "approved-example";
  permissionLabel: string;
  connection: ConnectorConnection;
  processing: ConnectorProcessing;
  processingLabel: string;
  lastSourceEventAt: string | null;
  retainedSourceReferences: readonly string[];
  sourceScope: string;
};

export type ConnectorRegistrySnapshot = {
  kind: "synthetic-preview";
  institution: string;
  connectors: readonly ConnectorRecord[];
};

export type ConnectorDraft = {
  id: string;
  category: ConnectorCategory;
  sourceName: string;
  bankOwner: string;
  proposedScope: string;
};
