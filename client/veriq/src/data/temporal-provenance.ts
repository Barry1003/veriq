import type { TemporalProvenanceSnapshot } from "@/types/temporal-provenance";

/** Synthetic source and receipt timestamps used by the existing V08/V09 fixtures. */
export const temporalProvenanceFixture: TemporalProvenanceSnapshot = {
    v8ReceivedAt: "2026-10-21T14:03:00+01:00",
    records: [
        {
            id: "OPS-00128",
            source: "Cedar gateway telemetry",
            observedAt: "2026-10-21T14:06:15+01:00",
            knownAt: "2026-10-21T14:06:23+01:00",
        },
    ],
};