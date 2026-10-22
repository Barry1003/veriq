import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectorDetailScreen } from "@/features/administration/connector-detail-screen";
import { ConnectorVariantScreen } from "@/features/administration/connector-variant-screen";
import { getConnectorDetail } from "@/services/connector-detail";
import { getConnectorVariant } from "@/services/connector-variants";
import "./connector-detail.css";
import "./connector-variants.css";

export const metadata: Metadata = {
  title: "Connector Data Flow | Veriq",
  description: "Connector evidence, source mapping, historical versions, and processing states",
};

export default async function ConnectorDetailPage({ params }: { params: Promise<{ connectorId: string }> }) {
  const { connectorId } = await params;
  const variant = await getConnectorVariant(connectorId);
  if (variant) return <ConnectorVariantScreen snapshot={variant} />;
  const detail = await getConnectorDetail(connectorId);
  if (!detail) notFound();
  return <ConnectorDetailScreen snapshot={detail} />;
}

