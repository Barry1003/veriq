import type {
  ConnectorConfigurationDraft,
  ConnectorSourceClass,
  ConnectorSourceOption,
  ConnectorValidationExample,
  ConnectorValidationView,
} from "@/types/connector-workflow";

function defaults(
  sourceClass: ConnectorSourceClass,
  connectorId: string,
  institutionOwner: string,
  sourceAdapter: string,
  sourceScope: string,
  mappingProfile: string,
): ConnectorConfigurationDraft {
  return {
    connectorId,
    sourceClass,
    institutionOwner,
    sourceAdapter,
    privateEndpointReference: "",
    approvalReference: "",
    sourceScope,
    secretReference: "",
    mappingProfile,
  };
}

export const connectorSourceOptions: readonly ConnectorSourceOption[] = [
  {
    id: "knowledge",
    label: "Institutional knowledge",
    description: "Routing records, service configuration, SOPs",
    defaults: defaults(
      "knowledge",
      "KNW-ROUTE-01",
      "Cedar Payments Engineering",
      "Bank-approved read-only configuration feed",
      "Routing config + service dependency records",
      "routing_config.v8 / source-approved",
    ),
  },
  {
    id: "operational",
    label: "Operational observations",
    description: "Gateway telemetry, event metrics and routes",
    defaults: defaults(
      "operational",
      "OPS-FEED-DRAFT",
      "",
      "Approved telemetry source adapter",
      "Gateway and service event telemetry",
      "operational-events / proposed",
    ),
  },
  {
    id: "customer",
    label: "Customer interactions",
    description: "In-app, branch and call-centre support records",
    defaults: defaults(
      "customer",
      "CX-FEED-DRAFT",
      "",
      "Approved customer-support adapter",
      "Authorized customer service interaction records",
      "customer-contact / proposed",
    ),
  },
  {
    id: "investigation",
    label: "Investigation evidence",
    description: "Reconciliation and authoritative transaction records",
    defaults: defaults(
      "investigation",
      "RCN-FEED-DRAFT",
      "",
      "Approved reconciliation adapter",
      "Case-scoped reconciliation evidence",
      "reconciliation / proposed",
    ),
  },
];

export const connectorValidationExample: ConnectorValidationExample = {
  kind: "example",
  connectorId: "KNW-ROUTE-01",
  stages: [
    {
      id: "authorization",
      title: "Bank scope authorization",
      state: "approved",
      detail: "Owner authority and source classes validated",
    },
    {
      id: "handshake",
      title: "Network / connector handshake",
      state: "connected",
      detail: "Private endpoint reachable over approved route",
    },
    {
      id: "delivery",
      title: "Source record delivery",
      state: "received",
      detail: "Original ROUTE-0298 with bank event time",
    },
    {
      id: "schema",
      title: "Schema and field validation",
      state: "failed",
      detail: "Required field effective_from missing in sample",
    },
    {
      id: "processing",
      title: "Processing and acceptance",
      state: "blocked",
      detail: "No accepted relationship created from invalid record",
    },
    {
      id: "freshness",
      title: "Current source freshness",
      state: "unknown",
      detail: "No subsequent source event to establish health",
    },
  ],
  original: {
    connectorId: "KNW-ROUTE-01",
    recordId: "ROUTE-0298",
    sourceRouteId: "instant-transfer / gateway-G3",
    sourceVersion: "v8",
    sourceEventTime: "21 Oct 2026 · 14:06 WAT",
    effectiveFrom: null,
  },
  validationError: {
    code: "SCHEMA_REQUIRED_FIELD_MISSING",
    detail:
      "Source ROUTE-0298 requires effective_from. Correct mapping, then retry without discarding the original record.",
  },
};

export function getNotRunConnectorValidation(
  connectorId: string,
): ConnectorValidationView {
  const titles = [
    "Bank scope authorization",
    "Network / connector handshake",
    "Source record delivery",
    "Schema and field validation",
    "Processing and acceptance",
    "Current source freshness",
  ];
  return {
    kind: "not-run",
    connectorId,
    stages: titles.map((title, index) => ({
      id: String(index + 1),
      title,
      state: "not-run" as const,
      detail: "No authenticated result received",
    })),
  };
}

