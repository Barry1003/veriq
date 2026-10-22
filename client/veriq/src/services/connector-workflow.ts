import { getMockConnectorValidation } from "@/services/adapters/connector-workflow";
import type { ConnectorValidationView } from "@/types/connector-workflow";

export async function getConnectorValidation(
  connectorId: string,
  mode: "example" | "draft",
): Promise<ConnectorValidationView> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockConnectorValidation(connectorId, mode);
  if (source === "api") {
    throw new Error("Connector validation API contract is not connected.");
  }
  throw new Error(`Unsupported connector validation source: ${source}`);
}

