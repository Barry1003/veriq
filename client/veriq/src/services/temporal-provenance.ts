import { getMockTemporalProvenance } from "@/services/adapters/temporal-provenance";
import type { TemporalProvenanceSnapshot } from "@/types/temporal-provenance";

export async function getTemporalProvenance(): Promise<TemporalProvenanceSnapshot> {
    const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
    if (source === "mock") return getMockTemporalProvenance();
    if (source === "api") {
        throw new Error("Temporal provenance API contract is not configured.");
    }
    throw new Error(`Unsupported Veriq data source: ${source}`);
}