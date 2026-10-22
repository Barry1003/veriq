export type OverviewKpi = {
  id: "knowledge" | "operations" | "customers" | "investigations";
  title: string;
  value: number | string;
  description: string;
  qualification: string;
};

export type OperationalSignal = {
  reference: string;
  title: string;
  sourceName: string;
  baselinePercent: number;
  rateObservations: readonly number[];
  windowLabel: string;
  lastObservedAt: string;
  freshness: string;
};

export type CustomerSignal = {
  reference: string;
  title: string;
  channels: readonly { name: string; count: number }[];
  uniqueCustomers: number | null;
};

export type InvestigationPreview = {
  id: string;
  observation: string;
  trigger: "operational" | "customer";
  status: "Investigating";
  updatedAt: string;
  evidenceRefs: readonly string[];
};

export type AgentReviewSummary = {
  caseId: string;
  headline: string;
  state: "Review pending";
  origin: string;
  findingLimit: string;
  nextAction: string;
};

export type IntelligenceOverviewData = {
  kpis: readonly OverviewKpi[];
  operationalSignal: OperationalSignal;
  customerSignal: CustomerSignal;
  investigations: readonly InvestigationPreview[];

  openInvestigationsTotal: number;
  operationallyInitiatedTotal: number;
  knowledgeProcessedCount: number;
  knowledgeReviewCount: number;
  reconciliationAvailable: boolean;
  agentReview: AgentReviewSummary;
};
