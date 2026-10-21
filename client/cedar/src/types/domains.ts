export type DashboardSummary = {
  metrics: Array<{ id: string; label: string; value: number; changePercent: number }>;
  updatedAt: string;
};
