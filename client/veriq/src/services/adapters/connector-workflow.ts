import {
  connectorValidationExample,
  getNotRunConnectorValidation,
} from "@/data/connector-workflow";
import type { ConnectorValidationView } from "@/types/connector-workflow";

export function getMockConnectorValidation(
  connectorId: string,
  mode: "example" | "draft",
): ConnectorValidationView {
  if (mode === "example" && connectorId === connectorValidationExample.connectorId) {
    return connectorValidationExample;
  }
  return getNotRunConnectorValidation(connectorId);
}

