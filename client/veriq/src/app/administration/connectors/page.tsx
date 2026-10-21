import type { Metadata } from "next";
import { ConnectorRegistryScreen } from "@/features/administration/connector-registry-screen";
import { getConnectorRegistry } from "@/services/connector-registry";
import "./connector-registry.css";

export const metadata: Metadata = {
  title: "Connector Registry | Veriq",
  description:
    "Authorized source scope, recorded connector activity, and integration boundaries",
};

export default async function ConnectorsPage() {
  const snapshot = await getConnectorRegistry();
  return <ConnectorRegistryScreen snapshot={snapshot} />;
}
