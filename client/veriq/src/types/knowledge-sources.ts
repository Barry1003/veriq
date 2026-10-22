export type KnowledgeSourceCollection = {
  id: string;
  name: string;
  owner: string;
  scope: string;
  lastReceivedAt: string | null;
  connected: boolean;
  deliveryLabel?: string;
  authorizationState?: string;
  lastError?: string | null;
  recordCount: number;
};

export type KnowledgeSourceSnapshot = {
  recordCountLabel?: string;
  collections: readonly KnowledgeSourceCollection[];
  previewTotals: {
    processedRecords: number;
  };
};
