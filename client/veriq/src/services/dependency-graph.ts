import { getInstitutionalKnowledge } from "@/services/institutional-knowledge";
import { getTemporalProvenance } from "@/services/temporal-provenance";
import { getKnowledgeProcessing } from "@/services/knowledge-processing";
import type { DependencyGraphSnapshot } from "@/types/dependency-graph";

/** Reuse existing source and evidence services; do not fork the graph fixtures. */
export async function getDependencyGraph(): Promise<DependencyGraphSnapshot> {
    const [knowledge, temporal, processing] = await Promise.all([
        getInstitutionalKnowledge(),
        getTemporalProvenance(),
        getKnowledgeProcessing(),
    ]);
    return {
        knowledge,
        temporal,
        includesSopCandidate: processing.candidates.some((candidate) => candidate.id === "KNW-CAND-022"),
    };
}