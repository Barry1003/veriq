import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";

export const knowledgeSourcesFixture: KnowledgeSourceSnapshot = {
  collections: [
    {
      id: "SRC-ROUTE-01",
      name: "Instant Transfer routing specification",
      owner: "Cedar Payments Engineering",
      scope: "Routing versions and effective dates",
      lastReceivedAt: "21 Oct 2026 · 14:03 WAT",
      connected: false,
      recordCount: 8,
    },
    {
      id: "SRC-SOP-03",
      name: "Exception handling SOP",
      owner: "Cedar Bank Operations",
      scope: "Transfer exception procedures",
      lastReceivedAt: "20 Oct 2026 · 10:40 WAT",
      connected: false,
      recordCount: 6,
    },
    {
      id: "SRC-DEP-02",
      name: "Service dependency map",
      owner: "Cedar Payments Engineering",
      scope: "Documented service dependencies",
      lastReceivedAt: "19 Oct 2026 · 16:12 WAT",
      connected: false,
      recordCount: 6,
    },
  ],
  previewTotals: { processedRecords: 20 },
};
