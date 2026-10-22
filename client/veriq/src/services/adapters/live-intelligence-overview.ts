import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
import { array, number, object, string, type VeriqApi } from "../api/veriq";
import { getLiveKnowledgeProcessing } from "./live-knowledge-processing";

export async function getLiveIntelligenceOverview(api: VeriqApi): Promise<IntelligenceOverviewData> {
  const [incidents, interactions, issues, investigations, runtime, context, processing] = await Promise.all([
    api.rows("incidents"), api.rows("interactions"), api.rows("issues"), api.rows("investigations"),
    api.snapshot("runtime"), api.snapshot("context"), getLiveKnowledgeProcessing(api),
  ]);
  const open = investigations.filter(row => row.data.state !== "resolved");
  const latestIncident = [...incidents].sort((a, b) => Date.parse(string(b.data.window_end)) - Date.parse(string(a.data.window_end)))[0];
  const channelCounts = new Map<string, number>();
  for (const interaction of interactions) {
    const channel = string(interaction.data.channel);
    channelCounts.set(channel, (channelCounts.get(channel) ?? 0) + 1);
  }
  const qualification = object(runtime.model_qualification);
  return {
    kpis: [
      { id: "knowledge", title: "Institutional entities", value: array(context.entities, object).length, description: "Accepted context projection", qualification: "Source-backed structure; causal meaning not established" },
      { id: "operations", title: "Operational incidents", value: incidents.length, description: "Persisted detector results", qualification: "Financial outcome not established" },
      { id: "customers", title: "Customer interactions", value: interactions.length, description: `${issues.length} emerging issues`, qualification: "Reports are not verified financial outcomes" },
      { id: "investigations", title: "Open investigations", value: open.length, description: "Current investigation states", qualification: "Evidence and hypotheses require separate review" },
    ],
    operationalSignal: latestIncident ? {
      reference: latestIncident.id, title: `${string(latestIncident.data.route_id)} / ${string(latestIncident.data.gateway_id)}`,
      sourceName: string(latestIncident.data.source_id),
      baselinePercent: typeof latestIncident.data.baseline_rate === "number" ? latestIncident.data.baseline_rate * 100 : null,
      rateObservations: [number(latestIncident.data.rate) * 100],
      windowLabel: `${string(latestIncident.data.window_start)} – ${string(latestIncident.data.window_end)}`,
      lastObservedAt: string(latestIncident.data.window_end), freshness: "Source event time; current freshness not established",
    } : null,
    customerSignal: { reference: "Authorized interactions", title: "Original source contacts", channels: [...channelCounts].map(([name, count]) => ({ name: name.replaceAll("_", " "), count })), uniqueCustomers: null },
    investigations: open.map(row => ({ id: row.id, observation: `${string(row.data.trigger_type)} / ${string(row.data.trigger_id)}`, trigger: row.data.trigger_type === "incident" ? "operational" : "customer", status: string(row.data.state), updatedAt: `Created ${row.created_at}`, evidenceRefs: [] })),
    openInvestigationsTotal: open.length,
    operationallyInitiatedTotal: open.filter(row => row.data.trigger_type === "incident").length,
    knowledgeProcessedCount: array(context.entities, object).length,
    knowledgeCountLabel: "accepted entities",
    knowledgeReviewCount: processing.candidates.length,
    reconciliationAvailable: null,
    agentReview: null,
    processingSummary: `${string(runtime.processing_readiness)} · model ${string(qualification.state)} · ${number(runtime.currently_running)} running tasks · ${number(runtime.backlog)} waiting tasks. Task completion does not establish a correct finding.`,
  };
}
