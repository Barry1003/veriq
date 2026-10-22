"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DependencyGraphSnapshot, GraphEvidenceItem } from "@/types/dependency-graph";

type Props = { snapshot: DependencyGraphSnapshot };
type EvidenceState = "available" | "not-yet-known" | "unknown";

/** Time inputs are local bank time (WAT, UTC+01:00); no browser timezone conversion. */
function knownState(timestamp: string | null, minute: string): EvidenceState {
    if (timestamp === null) return "unknown";
    return timestamp.slice(0, 19) <= `${minute}:59` ? "available" : "not-yet-known";
}

/** The v8 bank-valid time is grounded in the routing source fixture (20 Oct, 09:20 WAT). */
const V8_EFFECTIVE = "2026-10-20T09:20";
const SOP_TASK_KNOWN = "2026-10-21T14:09";

function makeRows(snapshot: DependencyGraphSnapshot): GraphEvidenceItem[] {
    const { knowledge, temporal } = snapshot;
    const route8 = knowledge.relationships.find((relationship) => relationship.id === "REL-008");
    const route7 = knowledge.relationships.find((relationship) => relationship.id === "REL-007");
    const operational = temporal.records.find((record) => record.id === "OPS-00128");
    const rows: GraphEvidenceItem[] = [];

    if (route8) {
        const source = knowledge.sources.find((item) => route8.sourceIds.includes(item.id));
        rows.push({
            id: "REL-008", title: "Instant Transfer → Gateway G3", kind: "documented",
            relationType: "Documented route policy", originalSource: source?.reference ?? "Not recorded",
            sourceAuthority: source?.owner ?? "Not recorded", sourceValidFrom: "20 Oct 2026 · 09:20 WAT",
            knownAt: temporal.v8ReceivedAt, knownAtLabel: "21 Oct 2026 · 14:03 WAT",
            decision: "Structured source-policy accepted", direction: "Service routes toward G3",
            limits: "Scope and alternate paths unknown", context: "OPS-00128 names G2; cause not established",
            aliases: ["Instant Transfer", "NIP transfer", "INST-SVC-01", "G3", "SRC-ROUTE-01", "routing policy", "v8"],
        });
    }
    if (route7) {
        const source = knowledge.sources.find((item) => route7.sourceIds.includes(item.id));
        rows.push({
            id: "REL-007", title: "Instant Transfer → Gateway G2", kind: "historical",
            relationType: "Historical documented route", originalSource: source?.reference ?? "Not recorded",
            sourceAuthority: source?.owner ?? "Not recorded", sourceValidFrom: "2 Sep – 19 Oct 2026",
            knownAt: null, knownAtLabel: "Available before v8; exact receipt time unknown",
            decision: "Historical source relationship", direction: "Prior routing configuration",
            limits: "Not applicable after documented v7 end date", context: "Do not treat v7 as the current route",
            aliases: ["Instant Transfer", "NIP transfer", "INST-SVC-01", "G2", "SRC-ROUTE-01", "v7"],
        });
    }
    if (operational) {
        rows.push({
            id: "OPS-00128", title: "Gateway G2 → timeout metric", kind: "observation",
            relationType: "Operational observation", originalSource: operational.source,
            sourceAuthority: "Cedar operational telemetry", sourceValidFrom: "21 Oct 2026 · 14:06:15 WAT",
            knownAt: operational.knownAt, knownAtLabel: "21 Oct 2026 · 14:06:23 WAT",
            decision: "Observed signal; no verified cause", direction: "Source telemetry mentions G2",
            limits: "Not evidence that every affected transfer used G2", context: "SIG-042 · operational monitoring",
            aliases: ["G2", "Gateway", "OPS-00128", "SIG-042", "timeout", "Instant Transfer"],
        });
    }
    if (snapshot.includesSopCandidate) {
        rows.push({
            id: "KNW-CAND-022", title: "Transfer → reconciliation", kind: "candidate",
            relationType: "Procedural relationship candidate", originalSource: "SRC-SOP-03 / v3 · section 4.2",
            sourceAuthority: "Cedar Bank Operations", sourceValidFrom: "Effective time not established",
            knownAt: SOP_TASK_KNOWN, knownAtLabel: "21 Oct 2026 · 14:09 WAT · task output",
            decision: "Human review required", direction: "SOP requests supporting settlement evidence",
            limits: "Procedure does not establish a required service dependency", context: "TASK-KNW-0027 · candidate not accepted",
            aliases: ["Instant Transfer", "reconciliation", "KNW-CAND-022", "SOP", "service"],
        });
    }
    return rows;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
    return <div className="dg-field"><dt>{label}</dt><dd>{value}</dd><small>{note}</small></div>;
}

function EvidenceNode({ id, kind, heading, sub, selectedId, onSelect, linked, muted = false }: {
    id: string; kind: string; heading: string; sub: string;
    selectedId: string | undefined; onSelect: (id: string) => void;
    linked: boolean; muted?: boolean;
}) {
    return (
        <button type="button" disabled={!linked}
            className={`dg-node${selectedId === id ? " dg-node-active" : ""}${muted ? " dg-node-muted" : ""}`}
            onClick={() => onSelect(id)} aria-pressed={selectedId === id}>
            <span>{kind}</span><strong>{heading}</strong><small>{sub}</small>
        </button>
    );
}

const rowLabels: Record<GraphEvidenceItem["kind"], string> = {
    documented: "Documented / policy",
    historical: "Historical / document",
    observation: "Operational observation",
    candidate: "Procedural candidate",
};

export function ExpandedDependencyGraph({ snapshot }: Props) {
    const [query, setQuery] = useState("Instant Transfer");
    const [validAt, setValidAt] = useState("2026-10-21T14:06");
    const [knownAt, setKnownAt] = useState("2026-10-21T14:07");
    const [selectedId, setSelectedId] = useState("REL-008");

    const rows = useMemo(() => makeRows(snapshot), [snapshot]);
    const search = query.trim().toLocaleLowerCase();
    const matches = rows.filter((row) => !search || [row.id, row.title, row.originalSource, ...row.aliases].some((value) => value.toLocaleLowerCase().includes(search)));
    const selected = matches.find((row) => row.id === selectedId) ?? matches[0];
    const route7 = snapshot.knowledge.relationships.find((relationship) => relationship.id === "REL-007");
    const route8 = snapshot.knowledge.relationships.find((relationship) => relationship.id === "REL-008");
    const bankG3 = Boolean(route8 && `${validAt}:59` >= V8_EFFECTIVE);
    const bankG2 = Boolean(route7 && validAt.slice(0, 10) >= route7.validFrom && validAt.slice(0, 10) <= (route7.validTo ?? "9999-12-31"));
    const g3Evidence = knownState(snapshot.temporal.v8ReceivedAt, knownAt);
    const operationalRecord = snapshot.temporal.records.find((record) => record.id === "OPS-00128");
    const observed = Boolean(operationalRecord?.observedAt && operationalRecord.observedAt.slice(0, 19) <= `${validAt}:59`);
    const observationState = operationalRecord ? knownState(operationalRecord.knownAt, knownAt) : "unknown";
    const active = selected ? knownState(selected.knownAt, knownAt) : null;

    const selectedBasis = selected?.id === "REL-008" ? (bankG3 ? "Bank-effective" : "Not bank-effective at selected time")
        : selected?.id === "REL-007" ? (bankG2 ? "Bank-effective historical version" : "Historical / not effective at selected time")
            : selected?.id === "OPS-00128" ? (observed ? "Event occurred by bank time" : "Event had not occurred by bank time")
                : "Effective date unresolved";

    const showNode = (terms: string[]) => !search || search === "nip transfer" || search === "inst-svc-01" || terms.some((term) => term.toLocaleLowerCase().includes(search));

    return (
        <section className="dg-page" aria-labelledby="dg-title">
            <header className="dg-page-heading">
                <p className="dg-overline">INSTITUTIONAL KNOWLEDGE / RELATIONSHIPS</p>
                <h1 id="dg-title">Institutional dependency explorer</h1>
                <p>Explore source-backed service dependencies, alternate routes, historical validity and unresolved observations.</p>
            </header>

            <h2 className="dg-section-heading">Explore the institutional model</h2>
            <div className="dg-panel dg-controls">
                <label><span>FIND ENTITY</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Service, alias, source or evidence ID" /><small>Service ID / alias / source ID</small></label>
                <label><span>VALID AT · BANK TIME</span><input type="datetime-local" value={validAt} onChange={(event) => setValidAt(event.target.value || "2026-10-21T14:06")} aria-label="Bank effective time" /><small>Which documented relationship was applicable?</small></label>
                <label><span>KNOWN AT · VERIQ TIME</span><input type="datetime-local" value={knownAt} onChange={(event) => setKnownAt(event.target.value || "2026-10-21T14:07")} aria-label="Veriq knowledge time" /><small>Which source evidence had been received?</small></label>
            </div>

            <h2 className="dg-section-heading">Graph of source-qualified service relationships</h2>
            <div className="dg-graph-layout">
                <article className="dg-panel dg-graph" aria-label="Interactive evidence relationship graph">
                    <p className="dg-overline">GRAPH VIEW / DOCUMENTED · HISTORICAL · CANDIDATE</p>
                    <div className="dg-graph-canvas">
                        <div className="dg-graph-nodes">
                            <div className="dg-graph-row dg-centre">
                                <div className="dg-node dg-service" aria-label="Instant Transfer service"><span>SERVICE · INST-SVC-01</span><strong>Instant Transfer</strong><small>Alias: NIP transfer</small></div>
                            </div>
                            <div className="dg-graph-line dg-service-line" aria-hidden="true" />
                            <div className="dg-graph-row dg-centre"><div className="dg-node dg-policy"><span>CONFIGURATION · SRC-ROUTE-01</span><strong>Routing policy v8</strong><small>{g3Evidence === "available" ? "Source received · 21 Oct 14:03" : "v8 source not yet received"}</small></div></div>
                            <div className="dg-branch" aria-hidden="true"><span>Historical document</span><span>Documented · as-of validity</span></div>
                            <div className="dg-graph-row dg-split">
                                {showNode(["G2", "REL-007", "Instant Transfer", "v7"]) && <EvidenceNode id="REL-007" selectedId={selected?.id} onSelect={setSelectedId} linked={rows.some((row) => row.id === "REL-007")} kind="HISTORICAL GATEWAY" heading="Gateway G2" sub={bankG2 ? "Effective v7 at bank time" : "Retained for earlier v7 context"} muted={!bankG2} />}
                                {showNode(["G3", "REL-008", "Instant Transfer", "v8"]) && <EvidenceNode id="REL-008" selectedId={selected?.id} onSelect={setSelectedId} linked={rows.some((row) => row.id === "REL-008")} kind="CURRENT-DOCUMENTED GATEWAY" heading="Gateway G3" sub={!bankG3 ? "Not yet bank-effective" : g3Evidence !== "available" ? "Effective · not yet known" : "Documented v8 route"} muted={!bankG3 || g3Evidence !== "available"} />}
                            </div>
                            <div className="dg-graph-row dg-split dg-lower">
                                {showNode(["G2", "SIG-042", "OPS-00128", "timeout"]) && <EvidenceNode id="OPS-00128" selectedId={selected?.id} onSelect={setSelectedId} linked={rows.some((row) => row.id === "OPS-00128")} kind="OBSERVATION · OPS-00128" heading="Operational signal SIG-042" sub={!observed ? "Event not yet occurred" : observationState !== "available" ? "Event not yet known to Veriq" : "G2 mentioned in telemetry"} muted={!observed || observationState !== "available"} />}
                                {showNode(["reconciliation", "KNW-CAND-022", "SOP", "Instant Transfer"]) && snapshot.includesSopCandidate && <EvidenceNode id="KNW-CAND-022" selectedId={selected?.id} onSelect={setSelectedId} linked={rows.some((row) => row.id === "KNW-CAND-022")} kind="PROCEDURAL CANDIDATE" heading="Reconciliation service" sub={knownState(SOP_TASK_KNOWN, knownAt) === "available" ? "SOP excerpt · review required" : "Extraction not yet known"} muted={knownState(SOP_TASK_KNOWN, knownAt) !== "available"} />}
                            </div>
                            <div className="dg-legend"><span>RELATION TYPES</span><p>Documented: source policy &nbsp; Historical: earlier validity &nbsp; Observed: independent source event &nbsp; Candidate: review required</p></div>
                        </div>
                    </div>
                </article>
                <aside className="dg-panel dg-inspector" aria-live="polite" aria-label="Selected evidence inspector">
                    {selected ? <>
                        <p className="dg-overline">SELECTED RELATIONSHIP · {selected.id}</p>
                        <h3>{selected.title}</h3>
                        <dl>
                            <Metric label="RELATION TYPE" value={selected.relationType} note={rowLabels[selected.kind]} />
                            <Metric label="ORIGINAL SOURCE" value={selected.originalSource} note="Original source identity retained" />
                            <Metric label="SOURCE AUTHORITY" value={selected.sourceAuthority} note="" />
                            <Metric label={selected.kind === "observation" ? "SOURCE EVENT TIME" : "SOURCE-VALID FROM"} value={selected.sourceValidFrom} note={selectedBasis} />
                            <Metric label="KNOWN TO VERIQ" value={selected.knownAtLabel} note={active === "unknown" ? "Exact receipt timestamp unavailable" : active === "not-yet-known" ? "Not known by the chosen time" : "Available by the chosen time"} />
                            <Metric label="DECISION PROVENANCE" value={selected.decision} note="" />
                            <Metric label="ENTITY ALIAS" value="Instant Transfer / NIP transfer" note="" />
                            <Metric label="DIRECTION / MEANING" value={selected.direction} note="" />
                            <Metric label="SOURCE LIMITATIONS" value={selected.limits} note="" />
                            <Metric label="RELATED CONTEXT" value={selected.context} note="" />
                            <Metric label="VERIFIED CAUSE?" value="No · not established" note="" />
                        </dl>
                    </> : <p>No evidence matches the current search.</p>}
                </aside>
            </div>

            <h2 className="dg-section-heading">Relationships and source differences</h2>
            <div className="dg-panel dg-table-wrap">
                <table><thead><tr><th>RELATIONSHIP</th><th>EVIDENCE TYPE</th><th>VALIDITY / KNOWLEDGE</th><th>ASSESSMENT</th></tr></thead>
                    <tbody>{matches.map((row) => {
                        const availability = knownState(row.knownAt, knownAt);
                        const assessment = availability === "not-yet-known" ? "Not yet known to Veriq" : availability === "unknown" ? `${row.decision} · receipt time unknown` : row.decision;
                        return <tr key={row.id} className={selected?.id === row.id ? "dg-selected-row" : undefined}>
                            <td><button type="button" onClick={() => setSelectedId(row.id)}>{row.title}<span>{row.id}</span></button></td>
                            <td>{rowLabels[row.kind]}</td>
                            <td>{row.sourceValidFrom}<small>{row.knownAtLabel}</small></td>
                            <td>{assessment}</td>
                        </tr>;
                    })}{matches.length === 0 && <tr><td colSpan={4}>No matching relationship or observation.</td></tr>}</tbody>
                </table>
            </div>

            <h2 className="dg-section-heading">Cross-pillar investigation handoff</h2>
            <div className="dg-panel dg-handoff">
                <p className="dg-overline">INV-014 · SOURCE SCOPE AND FINANCIAL CORROBORATION REQUIRED</p>
                <p>The graph explains documented bank context, not whether an individual transfer used G2 or G3.</p>
                <div className="dg-actions"><Link href="/administration/connectors/KNW-ROUTE-01" className="dg-button">Open original source</Link><Link href="/knowledge/temporal" className="dg-button">Compare valid and known time</Link><Link href="/investigations?case=INV-014" className="dg-button dg-button-primary">Open INV-014</Link></div>
            </div>
        </section>
    );
}
