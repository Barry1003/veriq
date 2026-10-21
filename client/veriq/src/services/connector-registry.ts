import { getMockConnectorRegistry } from "@/services/adapters/connector-registry";
import type { ConnectorRegistrySnapshot } from "@/types/connector-registry";

export async function getConnectorRegistry(): Promise<ConnectorRegistrySnapshot> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockConnectorRegistry();
  if (source === "api")
    throw new Error(
      "The authenticated connector registry API contract is not available yet.",
    );
  throw new Error(`Unsupported data source mode: ${source}`);
}
