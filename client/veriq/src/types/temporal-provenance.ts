export type TemporalProvenanceRecord = {
    id: string;
    source: string;
    observedAt: string | null;
    knownAt: string | null;
};

export type TemporalProvenanceSnapshot = {
    v8ReceivedAt: string | null;
    records: readonly TemporalProvenanceRecord[];
};