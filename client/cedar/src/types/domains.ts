export type BankingMetric = {
  id: string;
  label: string;
  value: number;
  changePercent: number;
};

export type DashboardSummary = {
  metrics: BankingMetric[];
  updatedAt: string;
};
