import { notFound } from "next/navigation";
import { ConnectorConfigurationScreen } from "@/features/onboarding/onboarding-extra-screens";
import "../../onboarding.css";
import "../../onboarding-extra.css";

export default async function KnowledgeConnectorPage({ params }: { params: Promise<{ connectorId: string }> }) {
  const { connectorId } = await params;
  if (connectorId !== "KNW-ROUTE-01") notFound();
  return <ConnectorConfigurationScreen />;
}

