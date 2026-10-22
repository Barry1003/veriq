export type KnowledgeSourceCollection = {
  id: string;
  name: string;
  owner: string;
  scope: string;
  lastReceivedAt: string | null;
  connected: boolean;
  recordCount: number;
};

export type KnowledgeSourceSnapshot = {
  collections: readonly KnowledgeSourceCollection[];
  previewTotals: {
    processedRecords: number;
  };
};
