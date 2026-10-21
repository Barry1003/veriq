import { connectorRegistryFixture } from "@/data/connector-registry";
import type { ConnectorRegistrySnapshot } from "@/types/connector-registry";

export async function getMockConnectorRegistry(): Promise<ConnectorRegistrySnapshot> {
  return connectorRegistryFixture;
}
