import { connectorRegistryFixture } from "@/data/connector-registry";
import { operationalConnectorDetailFixture } from "@/data/connector-detail";
import type { ConnectorDetailSnapshot } from "@/types/connector-detail";

export async function getMockConnectorDetail(
  connectorId: string,
): Promise<ConnectorDetailSnapshot | null> {
  if (connectorId !== operationalConnectorDetailFixture.connectorId)
    return null;
  const connector = connectorRegistryFixture.connectors.find(
    (record) => record.id === connectorId,
  );
  if (!connector) return null;
  return {
    kind: "synthetic-preview",
    connector,
    evidence: operationalConnectorDetailFixture,
  };
}
