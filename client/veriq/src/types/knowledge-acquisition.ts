export type KnowledgeSourceKind = "structured" | "unstructured";
export type KnowledgeDeliveryMode = "connector" | "document";
export type KnowledgeAcquisitionStatus = "not-checked" | "pending" | "passed" | "failed";

export interface KnowledgeAcquisitionDraft {
  kind: KnowledgeSourceKind;
  deliveryMode: KnowledgeDeliveryMode;
  sourceId: string;
  owner: string;
  accessMethod: string;
  authorizationScope: string;
  version: string;
  effectiveFrom: string;
  recordIdField: string;
  schemaProfile: string;
}

export interface KnowledgePreflight {
  ownerAuthorization: KnowledgeAcquisitionStatus;
  schemaCompatibility: KnowledgeAcquisitionStatus;
  recordDelivery: KnowledgeAcquisitionStatus;
  processingAcceptance: KnowledgeAcquisitionStatus;
}

export const UNCHECKED_KNOWLEDGE_PREFLIGHT: KnowledgePreflight = {
  ownerAuthorization: "not-checked",
  schemaCompatibility: "not-checked",
  recordDelivery: "not-checked",
  processingAcceptance: "not-checked",
};
