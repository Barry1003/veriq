import { temporalProvenanceFixture } from "@/data/temporal-provenance";
import type { TemporalProvenanceSnapshot } from "@/types/temporal-provenance";

export async function getMockTemporalProvenance(): Promise<TemporalProvenanceSnapshot> {
    return temporalProvenanceFixture;
}