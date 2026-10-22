import type { InstitutionalKnowledgeDataset } from "@/types/institutional-knowledge";
import type { TemporalProvenanceSnapshot } from "@/types/temporal-provenance";

/** Original source, candidate and observation stay in their own evidence classes. */
export type GraphEvidenceKind = "documented" | "historical" | "observation" | "candidate";
export type GraphEvidenceItem = {
    id: string;
    title: string;
    kind: GraphEvidenceKind;
    relationType: string;
    originalSource: string;
    sourceAuthority: string;
    sourceValidFrom: string;
    knownAt: string | null;
    knownAtLabel: string;
    decision: string;
    direction: string;
    limits: string;
    context: string;
    aliases: readonly string[];
};

export type DependencyGraphSnapshot = {
    knowledge: InstitutionalKnowledgeDataset;
    temporal: TemporalProvenanceSnapshot;
    /** Reviewable AI candidate is supplied by the existing processing fixture. */
    includesSopCandidate: boolean;
};