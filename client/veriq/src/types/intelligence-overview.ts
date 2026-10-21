export type OverviewKpi = {
  id: string;
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
export type IntelligenceOverviewData = {
  kpis: readonly OverviewKpi[];
  operationalSignal: OperationalSignal;
  customerSignal: CustomerSignal;
  investigations: readonly InvestigationPreview[];
  knowledgeProcessedCount: number;
  knowledgeReviewCount: number;
  reconciliationAvailable: boolean;
};
