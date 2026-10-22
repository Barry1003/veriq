import { getMockConnectorDetail } from "@/services/adapters/connector-detail";
import type { ConnectorDetailSnapshot } from "@/types/connector-detail";

export async function getConnectorDetail(
  connectorId: string,
): Promise<ConnectorDetailSnapshot | null> {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (source === "mock") return getMockConnectorDetail(connectorId);
  if (source === "api")
    throw new Error(
      "The authenticated connector detail API contract is not available yet.",
    );
  throw new Error(`Unsupported data source mode: ${source}`);
}
