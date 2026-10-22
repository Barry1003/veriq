import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectorDetailScreen } from "@/features/administration/connector-detail-screen";
import { getConnectorDetail } from "@/services/connector-detail";
import "./connector-detail.css";

export const metadata: Metadata = {
  title: "Connector Data Flow | Veriq",
  description:
    "Connector source, authorized field mapping, evidence lineage, and processing boundaries",
};

export default async function ConnectorDetailPage({
  params,
}: {
  params: Promise<{ connectorId: string }>;
}) {
  const { connectorId } = await params;
  const detail = await getConnectorDetail(connectorId);
  if (!detail) notFound();
  return <ConnectorDetailScreen snapshot={detail} />;
}
