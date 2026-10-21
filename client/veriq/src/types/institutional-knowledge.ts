export type KnowledgeEntityKind = "service" | "system" | "channel" | "team";
export type KnowledgeReviewStatus = "verified" | "partial" | "unverified";
export type RelationshipKind =
  "depends_on" | "operated_by" | "exposed_via" | "routes_through";
export type RelationshipAssessment = "verified" | "reported" | "hypothesis";
export type SourceKind = "catalog" | "diagram" | "runbook" | "change-record";

export type KnowledgeEntity = {
  id: string;
  name: string;
  kind: KnowledgeEntityKind;
  summary: string;
  owner: string;
  reviewStatus: KnowledgeReviewStatus;
  reviewedAt: string | null;
  validFrom: string;
  sourceIds: readonly string[];
};

export type KnowledgeRelationship = {
  id: string;
  fromId: string;
  toId: string;
  kind: RelationshipKind;
  assessment: RelationshipAssessment;
  description: string;
  validFrom: string;
  validTo: string | null;
  sourceIds: readonly string[];
};

export type KnowledgeSource = {
  id: string;
  title: string;
  kind: SourceKind;
  reference: string;
  recordedAt: string;
  description: string;
  version?: string;
  owner?: string;
};

export type KnowledgeOperationalReference = {
  id: string;
  name: string;
  referencedEntityId: string;
  observedAt: string;
  description: string;
};

export type InstitutionalKnowledgeDataset = {
  asOf: string;
  entities: readonly KnowledgeEntity[];
  relationships: readonly KnowledgeRelationship[];
  sources: readonly KnowledgeSource[];
  operationalReferences?: readonly KnowledgeOperationalReference[];
};
