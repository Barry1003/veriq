import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
import { institutionalKnowledgeFixture } from "@/data/institutional-knowledge";

const operationalSignal = {
  reference: "OPS-00128",
  sourceName: "Operational monitoring / OP-12",
  title: "Gateway timeout rate · five-minute windows",
  baselinePercent: 0.9,
  rateObservations: [0.8, 1, 0.9, 1.1, 4.1, 3.8],
  lastObservedAt: "14:07 WAT",
  freshness: "Synthetic observation · no live connector",
} as const;
const customerSignal = {
  reference: "EMG-009",
  title: "Similar delayed-transfer reports",
  uniqueCustomers: null,
  channels: [
    { name: "Cedar in-app support", count: 4 },
    { name: "Contact centre", count: 3 },
    { name: "Branch service desk", count: 2 },
  ],
} as const;
const investigations = [
  {
    id: "INV-014",
    observation: "Operational: G2 timeout anomaly",
    trigger: "operational",
    status: "Investigating",
    updatedAt: "14:12 WAT",
    evidenceRefs: ["OPS-00128", "SRC-ROUTE-01/v8"],
  },
  {
    id: "INV-013",
    observation: "Customer: delayed-transfer reports",
    trigger: "customer",
    status: "Investigating",
    updatedAt: "14:29 WAT",
    evidenceRefs: ["EMG-009"],
  },
] as const;

export const intelligenceOverviewFixture: IntelligenceOverviewData = {
  operationalSignal,
  customerSignal,
  investigations,
  knowledgeProcessedCount: institutionalKnowledgeFixture.sources.length,
  knowledgeReviewCount: institutionalKnowledgeFixture.relationships.filter(
    (r) => r.assessment === "hypothesis",
  ).length,
  reconciliationAvailable: false,
  kpis: [
    {
      id: "knowledge",
      title: "Institutional Knowledge",
      value: institutionalKnowledgeFixture.sources.length,
      description: "Source records available",
      qualification: "Synthetic originals · source lineage retained",
    },
    {
      id: "operations",
      title: "Operational Intelligence",
      value: 1,
      description: "Anomaly candidate",
      qualification: "Operational source · no complaint required",
    },
    {
      id: "customers",
      title: "Customer Intelligence",
      value: customerSignal.channels.reduce((sum, ch) => sum + ch.count, 0),
      description: "Logged customer interactions",
      qualification: `${customerSignal.channels.length} channels · unique customers unknown`,
    },
    {
      id: "investigations",
      title: "Investigations",
      value: investigations.length,
      description: "Open example investigations",
      qualification: "One operationally initiated · causation unverified",
    },
  ],
};
