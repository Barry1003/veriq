import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectorValidationScreen } from "@/features/administration/connector-validation-screen";
import { getConnectorValidation } from "@/services/connector-workflow";
import "../../connector-workflow.css";

export const metadata: Metadata = {
  title: "Connector Validation | Veriq",
  description: "Inspect connector authorization, source delivery and mapping evidence",
};

export default async function ConnectorValidationPage({
  params,
  searchParams,
}: {
  params: Promise<{ connectorId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { connectorId } = await params;
  const { mode } = await searchParams;
  if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(connectorId)) notFound();
  const result = await getConnectorValidation(
    connectorId,
    mode === "example" ? "example" : "draft",
  );
  return <ConnectorValidationScreen result={result} />;
}

