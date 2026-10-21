import type { Metadata } from "next";
import { SystemHealthScreen } from "@/features/administration/system-health-screen";
import { getSystemHealth } from "@/services/system-health";

export const metadata: Metadata = {
  title: "Deployment & System Health | Veriq",
  description:
    "Institution-controlled deployment service readiness and evidence overview",
};

export default async function SystemHealthPage() {
  const snapshot = await getSystemHealth();
  return <SystemHealthScreen snapshot={snapshot} />;
}
