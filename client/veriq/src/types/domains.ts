export type DashboardSummary = {
  metrics: {
    id: string;
    label: string;
    value: number;
    changePercent: number;
  }[];
  updatedAt: string;
};
