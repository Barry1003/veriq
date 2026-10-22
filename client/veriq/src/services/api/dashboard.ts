import type { DashboardSummary } from "@/types/domains";
import { array, object, string, type VeriqApi } from "./veriq";

export async function getApiDashboardSummary(api: VeriqApi): Promise<DashboardSummary> {
  const [context, investigations, evidence] = await Promise.all([
    api.snapshot("context"), api.rows("investigations"), api.rows("evidence"),
  ]);
  return {
    metrics: [
      { id: "knowledge", label: "Accepted institutional entities", value: array(context.entities, object).length, changePercent: null },
      { id: "investigations", label: "Open investigations", value: investigations.filter(row => row.data.state !== "resolved").length, changePercent: null },
      { id: "evidence", label: "Visible evidence records", value: evidence.length, changePercent: null },
    ],
    updatedAt: string(context.known_at),
  };
}
