import type { Metadata } from "next";
import { ConnectorCreateScreen } from "@/features/administration/connector-create-screen";
import "../connector-workflow.css";

export const metadata: Metadata = {
  title: "Add Connector | Veriq",
  description: "Configure a scoped bank-controlled source connector",
};

export default function AddConnectorPage() {
  return <ConnectorCreateScreen />;
}

