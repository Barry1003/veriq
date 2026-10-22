"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleHelp, Clock3, Database, Network, Search, X } from "lucide-react";
import type {
  InstitutionalKnowledgeDataset,
  KnowledgeRelationship,
  RelationshipAssessment,
} from "@/types/institutional-knowledge";

type Mode = "graph" | "table";
type EvidenceFilter = "all" | RelationshipAssessment;

type Props = {
  dataset: InstitutionalKnowledgeDataset;
  processedRecordCount: number;
  pendingReviewCount: number;
};

const relationshipLabels: Record<RelationshipAssessment, string> = {
  verified: "Reviewed claim",
  reported: "Source documented",
  hypothesis: "Unverified candidate",
};

function relationshipTimeState(relationship: KnowledgeRelationship, asOf: string) {
  if (asOf < relationship.validFrom) return "Not yet effective";
  if (relationship.validTo !== null && asOf > relationship.validTo) return "Historical";
  return "Effective at selected date";
}

function isEffective(relationship: KnowledgeRelationship, asOf: string) {
  return relationshipTimeState(relationship, asOf) === "Effective at selected date";
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function KnowledgeExplorer({ dataset, processedRecordCount, pendingReviewCount }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("graph");
  const [asOf, setAsOf] = useState(dataset.asOf);
  const [assessment, setAssessment] = useState<EvidenceFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("REL-008");
  const sourceDialogRef = useRef<HTMLDialogElement>(null);

  const entities = useMemo(() => new Map(dataset.entities.map((item) => [item.id, item])), [dataset.entities]);
  const sources = useMemo(() => new Map(dataset.sources.map((item) => [item.id, item])), [dataset.sources]);
  const observedRecords = (dataset.operationalReferences ?? []).filter((obs) => obs.observedAt.slice(0, 10) <= asOf);

  const routing = useMemo(() => dataset.relationships.filter((r) => r.id === "REL-008" || r.id === "REL-007"), [dataset.relationships]);
  const displayedRelationships = useMemo(() => {
    // Match the Figma's G2/G3 focus while allowing access to the whole institutional graph.
    const base = showAll || query.trim() || assessment !== "all" ? dataset.relationships : routing;
    const normalizedQuery = query.trim().toLowerCase();
    return base.filter((relationship) => {
      if (assessment !== "all" && relationship.assessment !== assessment) return false;
      const sourceNames = relationship.sourceIds.map((id) => {
        const source = sources.get(id);
        return `${source?.title ?? ""} ${source?.reference ?? ""}`;
      }).join(" ");
      const searchable = [relationship.id, relationship.description,
        entities.get(relationship.fromId)?.name, entities.get(relationship.toId)?.name,
        sourceNames].join(" ").toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
  }, [assessment, dataset.relationships, entities, query, routing, showAll, sources]);

  const selected = displayedRelationships.find((r) => r.id === selectedId)
    ?? displayedRelationships.find((r) => isEffective(r, asOf))
    ?? displayedRelationships[0];
  const source = selected?.sourceIds.map((id) => sources.get(id)).find((s) => s !== undefined);
  const selectedFrom = selected ? entities.get(selected.fromId) : undefined;
  const selectedTo = selected ? entities.get(selected.toId) : undefined;

  const activeRoute = routing.find((r) => isEffective(r, asOf));
  const focusRelationship = selected && isEffective(selected, asOf) ? selected : displayedRelationships.find((r) => isEffective(r, asOf));
  const focusFrom = focusRelationship ? entities.get(focusRelationship.fromId) : undefined;
  const focusTo = focusRelationship ? entities.get(focusRelationship.toId) : undefined;

  const historicalRoute = routing.find((r) => relationshipTimeState(r, asOf) === "Historical");
  const versionLabels = dataset.sources.filter((s) => s.reference.startsWith("SRC-ROUTE-01/")).map((s) => s.version).filter(Boolean);
  const activeSource = activeRoute?.sourceIds.map((id) => sources.get(id)).find(Boolean);
  const routeObservation = observedRecords.find((obs) => obs.id === "OPS-00128") ?? observedRecords[0];

  function updateContext(value: string) {
    setAsOf(value || dataset.asOf);
    setSelectedId(null);
  }

  return (
    <section className="kn-page" aria-labelledby="kn-title">
      <p className="kn-eyebrow">INSTITUTIONAL KNOWLEDGE / EXPLORER</p>
      <h1 id="kn-title">Knowledge Explorer</h1>
      <p className="kn-lead">Navigate bank services, dependencies, procedures, source versions and reviewer-qualified relationships.</p>

      <h2 className="kn-heading">Institutional knowledge overview</h2>
      <div className="kn-kpis">
        <article className="kn-box kn-kpi">
          <Network size={19} aria-hidden="true" />
          <span>SOURCE RECORDS</span>
          <strong>{processedRecordCount}</strong>
          <small>Processed records · source lineage</small>
        </article>
        <article className="kn-box kn-kpi">
          <Database size={19} aria-hidden="true" />
          <span>VERSION HISTORY</span>
          <strong>{versionLabels.join(" / ") || "—"}</strong>
          <small>Instant Transfer route documents</small>
        </article>
        <article className="kn-box kn-kpi">
          <CircleHelp size={19} aria-hidden="true" />
          <span>OPEN REVIEWS</span>
          <strong>{pendingReviewCount}</strong>
          <small>Claims awaiting review</small>
        </article>
        <article className="kn-box kn-kpi">
          <Clock3 size={19} aria-hidden="true" />
          <span>SELECTED CONTEXT</span>
          <strong>{formatDate(asOf).replace(/ \d{4}$/, "")}</strong>
          <small>As-of date</small>
        </article>
      </div>

      <h2 className="kn-heading">Explore relationships</h2>
      <div className="kn-box kn-filters">
        <label className="kn-search">
          <span>Find institutional entity</span>
          <div className="kn-search-field">
            <Search size={17} aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Service, gateway, source or version" />
          </div>
        </label>
        <label>
          <span>View mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="graph">Graph + Table</option>
            <option value="table">Table focus</option>
          </select>
        </label>
        <label>
          <span>As-of date</span>
          <input type="date" value={asOf} onChange={(event) => updateContext(event.target.value)} />
        </label>
        <label>
          <span>Evidence state</span>
          <select value={assessment} onChange={(event) => setAssessment(event.target.value as EvidenceFilter)}>
            <option value="all">All classifications</option>
            <option value="reported">Source documented</option>
            <option value="verified">Reviewed claim</option>
            <option value="hypothesis">Unverified candidate</option>
          </select>
        </label>
        <div className="kn-time-note">As-of source time, not ingestion time</div>
      </div>

      <div className={`kn-panels ${mode === "table" ? "kn-table-focus" : ""}`}>
        {mode === "graph" && (
          <article className="kn-box kn-graph">
            <p className="kn-overline">RELATIONSHIP GRAPH / AS OF {formatDate(asOf).toUpperCase()}</p>
            <h3>{focusFrom?.name ?? "Institutional"} dependencies</h3>
            <p className="kn-muted">Select a documented relationship to inspect its source and effective period.</p>
            <div className="kn-graph-canvas">
              {focusRelationship && focusFrom && focusTo ? (
                <div className="kn-graph-line">
                  <button type="button" className="kn-node" onClick={() => setSelectedId(focusRelationship.id)}>
                    <span>{focusFrom.kind.toUpperCase()}</span><strong>{focusFrom.name}</strong><small>{focusFrom.owner}</small>
                  </button>
                  <div className="kn-edge" aria-hidden="true"><span>DOCUMENTED: {focusRelationship.kind.replaceAll("_", " ")}</span><i /></div>
                  <button type="button" className="kn-node kn-node-selected" onClick={() => setSelectedId(focusRelationship.id)}>
                    <span>{focusTo.kind.toUpperCase()} / SOURCE CLAIM</span><strong>{focusTo.name}</strong><small>{sources.get(focusRelationship.sourceIds[0])?.version ?? "Source-linked"}</small>
                  </button>
                </div>
              ) : (
                <p className="kn-empty">No route relationship is documented as effective on this date.</p>
              )}
              {historicalRoute && (
                <button type="button" className="kn-graph-note" onClick={() => setSelectedId(historicalRoute.id)}>
                  <span>HISTORICAL / ROUTING VERSION</span>
                  <strong>{entities.get(historicalRoute.fromId)?.name} → {entities.get(historicalRoute.toId)?.name}</strong>
                  <small>Retained for historical event-time investigation</small>
                </button>
              )}
              {observedRecords.map((observation) => (
                <div className="kn-graph-note" key={observation.id}>
                  <span>UNRESOLVED OPERATIONAL OBSERVATION</span>
                  <strong>{observation.id} · {entities.get(observation.referencedEntityId)?.name ?? "Institutional system"}</strong>
                  <small>{observation.description}</small>
                </div>
              ))}
            </div>
            <p className="kn-graph-foot">{activeSource?.reference ?? "No route version effective"} · actual transaction paths require operational evidence.</p>
          </article>
        )}

        <article className="kn-box kn-inspector" aria-label="Selected relationship">
          <p className="kn-overline">SELECTED RELATIONSHIP / {selected?.id ?? "—"}</p>
          {selected ? (
            <>
              <h3>{selectedFrom?.name ?? "—"} → {selectedTo?.name ?? "—"}</h3>
              <dl className="kn-inspector-dl">
                <div><dt>EVIDENCE CLASS</dt><dd>{relationshipLabels[selected.assessment]}</dd></div>
                <div><dt>BANK ORIGINAL</dt><dd>{source?.reference ?? "No supporting document"}</dd></div>
                <div><dt>DOCUMENT OWNER</dt><dd>{source?.owner ?? selectedTo?.owner ?? "Not recorded"}</dd></div>
                <div><dt>EFFECTIVE FROM</dt><dd>{formatDate(selected.validFrom)}</dd></div>
                <div><dt>TIME STATUS</dt><dd>{relationshipTimeState(selected, asOf)}</dd></div>
                <div><dt>REVIEW STATUS</dt><dd>{selected.assessment === "hypothesis" ? "Needs source verification" : "Scope and operational alignment require corroboration"}</dd></div>
              </dl>
              <button type="button" className="kn-secondary-button" disabled={!source} onClick={() => sourceDialogRef.current?.showModal()}>
                Inspect original source
              </button>
            </>
          ) : <p className="kn-empty">No relationship matches the active filters.</p>}
        </article>
      </div>

      <div className="kn-section-title">
        <div>
          <h2 className="kn-heading">Relationship table &amp; historical comparison</h2>
          <p className="kn-muted">Includes source validity and evidence classification.</p>
        </div>
        <label className="kn-expand-toggle">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          Show all institutional relationships
        </label>
      </div>
      <div className="kn-box kn-table-frame">
        <div className="kn-table-scroll">
          <table>
            <thead><tr><th>FROM / TO</th><th>ORIGINAL DOCUMENT</th><th>SOURCE VALIDITY</th><th>ASSESSMENT</th></tr></thead>
            <tbody>
              {displayedRelationships.map((relationship) => {
                const original = sources.get(relationship.sourceIds[0]);
                const state = relationshipTimeState(relationship, asOf);
                return (
                  <tr key={relationship.id} className={selected?.id === relationship.id ? "is-selected" : ""}>
                    <td><button type="button" onClick={() => setSelectedId(relationship.id)}>{entities.get(relationship.fromId)?.name} → {entities.get(relationship.toId)?.name}</button></td>
                    <td>{original?.reference ?? "Evidence not attached"}</td>
                    <td>{state === "Effective at selected date" ? `From ${formatDate(relationship.validFrom)} · effective` : state}</td>
                    <td>{relationshipLabels[relationship.assessment]}</td>
                  </tr>
                );
              })}
              {mode === "graph" && assessment === "all" && !query.trim() && !showAll && routeObservation && (
                <tr className="kn-observation-row">
                  <td>Operational record references {entities.get(routeObservation.referencedEntityId)?.name ?? "gateway"}</td>
                  <td>{routeObservation.id} · separate operational evidence</td>
                  <td>{new Date(routeObservation.observedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WAT</td>
                  <td>Candidate comparison · unverified</td>
                </tr>
              )}
              {displayedRelationships.length === 0 && <tr><td colSpan={4} className="kn-empty">No relationships match the search or filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="kn-heading">Knowledge connected to investigation</h2>
      <div className="kn-bottom-grid">
        <article className="kn-box kn-classification">
          <p className="kn-overline">PROVENANCE-AWARE RELATIONSHIP CLASSIFICATION</p>
          <dl>
            <div><dt>ORIGINAL SOURCE</dt><dd>{routing.flatMap((relationship) => relationship.sourceIds).map((id) => sources.get(id)?.reference).filter(Boolean).join(" and ") || "No route records"}</dd></div>
            <div><dt>SOURCE-DOCUMENTED CLAIM</dt><dd>{activeRoute ? `${entities.get(activeRoute.toId)?.name ?? "Route"} documented as of ${formatDate(asOf)}` : "No active documented route at selected date"}</dd></div>
            <div><dt>CANDIDATE ASSOCIATION</dt><dd>{routeObservation ? `${routeObservation.id} mentions ${entities.get(routeObservation.referencedEntityId)?.name ?? "a gateway"}` : "No operational observation available"}</dd></div>
            <div><dt>CAUSE VERIFIED?</dt><dd>Not established by current evidence</dd></div>
          </dl>
        </article>
        <article className="kn-box kn-investigation">
          <p className="kn-overline">CROSS-PILLAR INVESTIGATION</p>
          <h3>Unresolved G2 / G3 question</h3>
          <p>{routeObservation?.id ?? "An operational record"} references G2 after the v8 documentation of G3. Scope, event-time routing and alternate paths still need evidence review.</p>
          <div className="kn-investigation-note">
            <span>REQUIRES SOURCE REVIEW</span>
            <p>Route scope, applicable version, observed event time, and corroborating records.</p>
          </div>
          <div className="kn-actions">
            <Link className="kn-secondary-button" href="/knowledge/processing?claim=KNW-CAND-021">Review claim</Link>
            <Link className="kn-primary-button" href="/investigations?case=INV-014">Open INV-014 <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </article>
      </div>

      <dialog ref={sourceDialogRef} className="kn-source-dialog" aria-labelledby="kn-dialog-title">
        <form method="dialog">
          <button type="submit" className="kn-dialog-close" aria-label="Close source details"><X size={18} aria-hidden="true" /></button>
          <h2 id="kn-dialog-title">Source metadata</h2>
          <dl>
            <div><dt>DOCUMENT</dt><dd>{source?.title ?? "Not available"}</dd></div>
            <div><dt>SOURCE REFERENCE</dt><dd>{source?.reference ?? "—"}</dd></div>
            <div><dt>VERSION</dt><dd>{source?.version ?? "Not recorded"}</dd></div>
            <div><dt>RECORDED</dt><dd>{source ? formatDate(source.recordedAt) : "—"}</dd></div>
            <div><dt>OWNER</dt><dd>{source?.owner ?? "Not recorded"}</dd></div>
          </dl>
          <p className="kn-dialog-note">Original document: not included in the current dataset.</p>
          <button type="submit" className="kn-secondary-button">Close</button>
        </form>
      </dialog>
    </section>
  );
}
