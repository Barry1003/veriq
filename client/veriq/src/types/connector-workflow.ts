export type ConnectorSourceClass =
  | "knowledge"
  | "operational"
  | "customer"
  | "investigation";

export interface ConnectorConfigurationDraft {
  connectorId: string;
  sourceClass: ConnectorSourceClass;
  institutionOwner: string;
  sourceAdapter: string;
  privateEndpointReference: string;
  approvalReference: string;
  sourceScope: string;
  secretReference: string;
  mappingProfile: string;
}

export interface ConnectorSourceOption {
  id: ConnectorSourceClass;
  label: string;
  description: string;
  defaults: ConnectorConfigurationDraft;
}

export type ConnectorGateState =
  | "approved"
  | "connected"
  | "received"
  | "failed"
  | "blocked"
  | "unknown"
  | "not-run";

export interface ConnectorTestStage {
  id: string;
  title: string;
  state: ConnectorGateState;
  detail: string;
}

export interface OriginalConnectorRecord {
  connectorId: string;
  recordId: string;
  sourceRouteId: string;
  sourceVersion: string;
  sourceEventTime: string;
  effectiveFrom: string | null;
}

export interface ConnectorValidationExample {
  kind: "example";
  connectorId: string;
  stages: readonly ConnectorTestStage[];
  original: OriginalConnectorRecord;
  validationError: {
    code: string;
    detail: string;
  };
}

export type ConnectorValidationView =
  | ConnectorValidationExample
  | {
      kind: "not-run";
      connectorId: string;
      stages: readonly ConnectorTestStage[];
    };

