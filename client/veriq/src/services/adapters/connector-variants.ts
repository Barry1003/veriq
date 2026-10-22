import { knowledgeConnectorVariantFixture, customerConnectorVariantFixture } from "@/data/connector-variants";
import type { ConnectorVariantSnapshot } from "@/types/connector-variants";

export async function getMockConnectorVariant(id: string): Promise<ConnectorVariantSnapshot | null> {
  switch (id) {
    case "KNW-ROUTE-01": return knowledgeConnectorVariantFixture;
    case "CX-FEED-03": return customerConnectorVariantFixture;
    default: return null;
  }
}

