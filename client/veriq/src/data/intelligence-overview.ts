import type { IntelligenceOverviewData } from "@/types/intelligence-overview";
import { knowledgeSourcesFixture } from "@/data/knowledge-sources";
import { knowledgeProcessingFixture } from "@/data/knowledge-processing";
const OPEN_CASES_IN_DESIGN = 8;
const OPERATIONALLY_INITIATED_IN_DESIGN = 3;

const operationalSignal = {
  reference: "OP-12",
  sourceName: "Operational monitoring / OP-12",
  title: "Gateway timeout rate · five-minute windows",
  baselinePercent: 0.9,
  rateObservations: [0.8, 1.0, 0.9, 1.1, 4.1, 3.8],
  windowLabel: "Six 5-minute windows · 13:42–14:07 WAT",
  lastObservedAt: "14:07 WAT",
  freshness: "Source event observed at 14:07 WAT",
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
    observation: "Customer: delayed transfer reports",
    trigger: "customer",
    status: "Investigating",
    updatedAt: "14:29 WAT",
    evidenceRefs: ["EMG-009"],
  },
] as const;

const knowledgeProcessedCount = knowledgeSourcesFixture.previewTotals.processedRecords;
const knowledgeReviewCount = knowledgeProcessingFixture.candidates.filter(
  (candidate) => candidate.status === "needs-review",
).length;
const interactionCount = customerSignal.channels.reduce((sum, channel) => sum + channel.count, 0);

export const intelligenceOverviewFixture: IntelligenceOverviewData = {
  operationalSignal,
  customerSignal,
  investigations,
  openInvestigationsTotal: OPEN_CASES_IN_DESIGN,
  operationallyInitiatedTotal: OPERATIONALLY_INITIATED_IN_DESIGN,
  knowledgeProcessedCount,
  knowledgeReviewCount,
  reconciliationAvailable: false,
  agentReview: {
    caseId: "INV-014",
    headline: "Gateway G2 timeouts need investigation",
    state: "Review pending",
    origin: "Detected from an operational observation; no complaint required.",
    findingLimit: "A routing difference is possible. Cause and settlement outcomes remain unverified.",
    nextAction: "Review source evidence and request reconciliation records.",
  },
  kpis: [
    {
      id: "knowledge",
      title: "Institutional Knowledge",
      value: knowledgeProcessedCount,
      description: "Source records processed",
      qualification: `${knowledgeReviewCount} records pending review`,
    },
    {
      id: "operations",
      title: "Operational Intelligence",
      value: 1,
      description: "Anomaly candidate",
      qualification: "Operational origin · no complaint",
    },
    {
      id: "customers",
      title: "Customer Intelligence",
      value: interactionCount,
      description: "Logged customer interactions",
      qualification: `${customerSignal.channels.length} channels · customers unknown`,
    },
    {
      id: "investigations",
      title: "Investigations",
      value: OPEN_CASES_IN_DESIGN,
      description: "Open investigations",
      qualification: `${OPERATIONALLY_INITIATED_IN_DESIGN} operationally initiated`,
    },
  ],
};
