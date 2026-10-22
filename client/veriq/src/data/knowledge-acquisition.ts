import type { KnowledgeAcquisitionDraft, KnowledgeSourceKind } from "@/types/knowledge-acquisition";

export const KNOWLEDGE_ACQUISITION_INITIAL: Record<KnowledgeSourceKind, KnowledgeAcquisitionDraft> = {
  structured: {
    kind: "structured",
    deliveryMode: "connector",
    sourceId: "SRC-ROUTE-01 / v8",
    owner: "Cedar Payments Engineering · internal configuration",
    accessMethod: "Approved read-only connector",
    authorizationScope: "Service routes, effective-time validity, version history",
    version: "v8 · prior version v7 retained",
    effectiveFrom: "20 Oct 2026 · source-valid time",
    recordIdField: "source_route_id · original, immutable",
    schemaProfile: "Routing config v8 · bank-approved schema",
  },
  unstructured: {
    kind: "unstructured",
    deliveryMode: "document",
    sourceId: "",
    owner: "",
    accessMethod: "Approved institutional document submission",
    authorizationScope: "",
    version: "",
    effectiveFrom: "",
    recordIdField: "",
    schemaProfile: "Document metadata and provenance review",
  },
};

export const KNOWLEDGE_SOURCE_OPTIONS: readonly {
  kind: KnowledgeSourceKind;
  title: string;
  description: string;
  detail: string;
}[] = [
  {
    kind: "structured",
    title: "Structured institutional records",
    description: "Database, service inventory, routing or configuration feed",
    detail: "Policy and schema checks determine record acceptance.",
  },
  {
    kind: "unstructured",
    title: "Unstructured source documents",
    description: "Approved SOPs, process maps, PDFs or textual procedures",
    detail: "Extraction creates source-linked knowledge candidates for review.",
  },
];
