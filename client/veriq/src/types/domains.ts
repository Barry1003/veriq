export type IntelligenceMetric = {
  id: string;
  label: string;
  value: number;
  changePercent: number;
};

export type DashboardSummary = {
  metrics: IntelligenceMetric[];
  updatedAt: string;
};
