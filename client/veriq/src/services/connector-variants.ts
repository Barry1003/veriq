import { getMockConnectorVariant } from "@/services/adapters/connector-variants";
import type { ConnectorVariantSnapshot } from "@/types/connector-variants";

export async function getConnectorVariant(id: string): Promise<ConnectorVariantSnapshot | null> {
  if (id !== "KNW-ROUTE-01" && id !== "CX-FEED-03") return null;
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockConnectorVariant(id);
  if (mode === "api") throw new Error("Authenticated V05 connector-variant API contract not available yet.");
  throw new Error(`Unsupported data source mode: ${mode}`);
}

