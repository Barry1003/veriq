"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  Clock3,
  Database,
  Info,
  Network,
  Search,
  X,
} from "lucide-react";
import type {
  InstitutionalKnowledgeDataset,
  KnowledgeRelationship,
  RelationshipAssessment,
} from "@/types/institutional-knowledge";

type EvidenceFilter = "all" | RelationshipAssessment;
type Mode = "graph" | "table";

function isActiveOn(r: KnowledgeRelationship, asOf: string) {
  return r.validFrom <= asOf && (!r.validTo || r.validTo >= asOf);
}
function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
const assessmentLabel: Record<RelationshipAssessment, string> = {
  verified: "Verified claim",
  reported: "Source documented",
  hypothesis: "Unverified candidate",
};

export function KnowledgeExplorer({
  dataset,
}: {
  dataset: InstitutionalKnowledgeDataset;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("graph");
  const [asOf, setAsOf] = useState(dataset.asOf);
  const [assessment, setAssessment] = useState<EvidenceFilter>("all");
  const [selectedId, setSelectedId] = useState("REL-008");
  const sourceDialogRef = useRef<HTMLDialogElement>(null);
  const byId = useMemo(
    () => new Map(dataset.entities.map((entity) => [entity.id, entity])),
    [dataset.entities],
  );
  const sourcesById = useMemo(
    () => new Map(dataset.sources.map((src) => [src.id, src])),
    [dataset.sources],
  );

  const relevant = useMemo(
    () =>
      dataset.relationships.filter((r) => {
        const from = byId.get(r.fromId)?.name ?? "";
        const to = byId.get(r.toId)?.name ?? "";
        const searchable =
          `${from} ${to} ${r.description} ${r.id} ${r.sourceIds.join(" ")}`.toLowerCase();
        return (
          (assessment === "all" || assessment === r.assessment) &&
          (!query || searchable.includes(query.trim().toLowerCase()))
        );
      }),
    [assessment, byId, dataset.relationships, query],
  );
  const current = relevant.filter((r) => isActiveOn(r, asOf));
  const selected =
    relevant.find((r) => r.id === selectedId) ?? current[0] ?? relevant[0];
  const source = selected?.sourceIds
    .map((id) => sourcesById.get(id))
    .find(Boolean);
  const documentedVersions = dataset.sources
    .filter((s) => s.reference.startsWith("SRC-ROUTE-01/"))
    .map((s) => s.version)
    .filter(Boolean);
  const openReviews = dataset.relationships.filter(
    (r) => r.assessment === "hypothesis",
  ).length;
  const operationalReferences = dataset.operationalReferences ?? [];
  const historical = relevant.filter((r) => r.validTo && r.validTo < asOf);
  const defaultCurrent = current.find((r) => r.id === "REL-008") ?? current[0];
  const defaultPrevious =
    historical.find((r) => r.id === "REL-007") ?? historical[0];
  const graphFocus =
    selected && isActiveOn(selected, asOf) ? selected : defaultCurrent;
  const from = graphFocus ? byId.get(graphFocus.fromId) : undefined;
  const to = graphFocus ? byId.get(graphFocus.toId) : undefined;
  const selectedFrom = selected ? byId.get(selected.fromId) : undefined;
  const selectedTo = selected ? byId.get(selected.toId) : undefined;

  return (
    <section className="kn-page" aria-labelledby="kn-title">
      <p className="kn-eyebrow">INSTITUTIONAL KNOWLEDGE / V09</p>
      <h1 id="kn-title">Knowledge Explorer</h1>
      <p className="kn-lead">
        Navigate bank services, dependencies, procedures, source versions and
        reviewer-qualified relationships.
      </p>
      <div className="kn-alert">
        <Info size={18} aria-hidden="true" />
        <div>
          <strong>
            Knowledge relationships are time-scoped and source-linked. A current
            document must not overwrite historical truth.
          </strong>
          <p>
            Source records, extracted candidates and verified relationships are
            different states; missing or contradictory evidence remains visible.
          </p>
        </div>
      </div>

      <h2 className="kn-heading">Institutional knowledge overview</h2>
      <div className="kn-kpis">
        <div className="kn-box kn-kpi">
          <Network size={18} />
          <span>SOURCE RECORDS</span>
          <strong>{dataset.sources.length}</strong>
          <small>Synthetic sources · original lineage</small>
        </div>
        <div className="kn-box kn-kpi">
          <Database size={18} />
          <span>VERSION HISTORY</span>
          <strong>{documentedVersions.join(" / ") || "—"}</strong>
          <small>Instant Transfer route documents</small>
        </div>
        <div className="kn-box kn-kpi">
          <CircleHelp size={18} />
          <span>OPEN REVIEWS</span>
          <strong>{openReviews}</strong>
          <small>Candidate relationships need review</small>
        </div>
        <div className="kn-box kn-kpi">
          <Clock3 size={18} />
          <span>SELECTED CONTEXT</span>
          <strong>{formatDate(asOf).replace(" 2026", "")}</strong>
          <small>As-of source date · synthetic</small>
        </div>
      </div>

      <h2 className="kn-heading">Explore relationships</h2>
      <div className="kn-filters kn-box">
        <label className="kn-search">
          <span>Find institutional entity</span>
          <div className="kn-input-wrap">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Service, gateway, source or version"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </label>
        <label>
          <span>View mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="graph">Graph + Table</option>
            <option value="table">Table focus</option>
          </select>
        </label>
        <label>
          <span>As-of date</span>
          <input
            type="date"
            value={asOf}
            max="2099-12-31"
            onChange={(e) => {
              setAsOf(e.target.value || dataset.asOf);
              setSelectedId("");
            }}
          />
        </label>
        <label>
          <span>Evidence state</span>
          <select
            value={assessment}
            onChange={(e) => setAssessment(e.target.value as EvidenceFilter)}
          >
            <option value="all">All classifications</option>
            <option value="verified">Verified claim</option>
            <option value="reported">Source documented</option>
            <option value="hypothesis">Unverified candidate</option>
          </select>
        </label>
        <p>As-of source time, not Veriq ingestion time</p>
      </div>

      <div className={`kn-panels${mode === "table" ? " is-table-mode" : ""}`}>
        {mode === "graph" && (
          <article className="kn-box kn-graph">
            <span className="kn-overline">
              RELATIONSHIP GRAPH / AS OF {formatDate(asOf).toUpperCase()}
            </span>
            <h3>{from?.name ?? "Institutional"} dependencies</h3>
            <p>
              Select a source-backed relationship to inspect version and
              validity.
            </p>
            <div className="kn-graph-canvas">
              {from && to && graphFocus ? (
                <div className="kn-graph-line">
                  <button
                    type="button"
                    className="kn-node"
                    onClick={() => setSelectedId(graphFocus.id)}
                  >
                    <span>{from.kind.toUpperCase()}</span>
                    <strong>{from.name}</strong>
                    <small>{from.owner}</small>
                  </button>
                  <span className="kn-edge">
                    <span>
                      DOCUMENTED: {graphFocus.kind.replaceAll("_", " ")}
                    </span>
                    <i />
                  </span>
                  <button
                    type="button"
                    className="kn-node kn-node-selected"
                    onClick={() => setSelectedId(graphFocus.id)}
                  >
                    <span>{to.kind.toUpperCase()} / SOURCE CLAIM</span>
                    <strong>{to.name}</strong>
                    <small>
                      {sourcesById.get(graphFocus.sourceIds[0])?.version ??
                        "Source-linked"}
                    </small>
                  </button>
                </div>
              ) : (
                <p className="kn-empty">
                  No effective source-backed relationship matches this context.
                </p>
              )}
              {defaultPrevious && (
                <button
                  type="button"
                  className="kn-graph-note"
                  onClick={() => setSelectedId(defaultPrevious.id)}
                >
                  <span>HISTORICAL / SOURCE VERSION</span>
                  <strong>
                    {byId.get(defaultPrevious.fromId)?.name} →{" "}
                    {byId.get(defaultPrevious.toId)?.name} · historical
                    relationship
                  </strong>
                  <small>
                    Preserved for event-time investigation; not overwritten by
                    newer documents.
                  </small>
                </button>
              )}
              {operationalReferences.map((obs) => (
                <div className="kn-graph-note" key={obs.id}>
                  <span>UNRESOLVED SOURCE COMPARISON</span>
                  <strong>
                    {obs.id} references{" "}
                    {byId.get(obs.referencedEntityId)?.name ??
                      "an institutional system"}
                  </strong>
                  <small>{obs.description}</small>
                </div>
              ))}
            </div>
            <p className="kn-graph-foot">
              Documented configuration does not establish which route every
              individual transaction followed.
            </p>
            <p className="kn-graph-foot">
              Historical validity is evaluated using the selected source date;
              no cause is inferred.
            </p>
          </article>
        )}
        <article
          className="kn-box kn-inspector"
          aria-label="Selected relationship"
        >
          <span className="kn-overline">
            SELECTED RELATIONSHIP / {selected?.id ?? "—"}
          </span>
          <h3>
            {selectedFrom?.name ?? "—"} → {selectedTo?.name ?? "—"}
          </h3>
          {selected ? (
            <dl className="kn-inspector-dl">
              <div>
                <dt>EVIDENCE CLASS</dt>
                <dd>{assessmentLabel[selected.assessment]}</dd>
              </div>
              <div>
                <dt>BANK ORIGINAL</dt>
                <dd>{source?.reference ?? "No source attached"}</dd>
              </div>
              <div>
                <dt>DOCUMENT OWNER</dt>
                <dd>{source?.owner ?? selectedTo?.owner ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>EFFECTIVE FROM</dt>
                <dd>{formatDate(selected.validFrom)} · source validity</dd>
              </div>
              <div>
                <dt>AS-OF CONTEXT</dt>
                <dd>{formatDate(asOf)}</dd>
              </div>
              <div>
                <dt>REVIEW LIMIT</dt>
                <dd>
                  {selected.assessment === "verified"
                    ? "Claim reviewed; actual operations still require evidence"
                    : "Route scope and operational alignment need corroboration"}
                </dd>
              </div>
            </dl>
          ) : (
            <p>No relationship matches the active filters.</p>
          )}
          <div className="kn-inspector-warning">
            <strong>Knowledge ≠ operational route observation</strong>
            <p>
              Use source events and provenance to assess mismatches; do not
              declare a transaction cause.
            </p>
          </div>
          <button
            type="button"
            className="kn-secondary-button"
            disabled={!source}
            onClick={() => sourceDialogRef.current?.showModal()}
          >
            Inspect source metadata
          </button>
        </article>
      </div>

      <h2 className="kn-heading">
        Relationship table &amp; historical comparison
      </h2>
      <p className="kn-section-subtitle">
        A tabular equivalent supports precise reading, keyboard access and
        version inspection.
      </p>
      <div className="kn-box kn-table-frame">
        <div className="kn-table-scroll">
          <table>
            <thead>
              <tr>
                <th>FROM / TO</th>
                <th>ORIGINAL DOCUMENT</th>
                <th>SOURCE VALIDITY</th>
                <th>ASSESSMENT</th>
              </tr>
            </thead>
            <tbody>
              {relevant.map((r) => {
                const ref = sourcesById.get(r.sourceIds[0]);
                const active = isActiveOn(r, asOf);
                return (
                  <tr
                    key={r.id}
                    className={r.id === selected?.id ? "is-selected" : ""}
                  >
                    <td>
                      <button type="button" onClick={() => setSelectedId(r.id)}>
                        {byId.get(r.fromId)?.name} → {byId.get(r.toId)?.name}
                      </button>
                    </td>
                    <td>{ref?.reference ?? "No supporting document"}</td>
                    <td>
                      {active
                        ? `From ${formatDate(r.validFrom)} · current as-of`
                        : `Historical / outside ${formatDate(asOf)}`}
                    </td>
                    <td>
                      {assessmentLabel[r.assessment]}
                      {!active ? " · historical" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="kn-table-note">
          Source validity and assessment are separate. The table includes
          historical versions even when they are not currently effective.
        </p>
      </div>

      <h2 className="kn-heading">Knowledge connected to investigation</h2>
      <div className="kn-bottom-grid">
        <article className="kn-box kn-classification">
          <span className="kn-overline">
            PROVENANCE-AWARE RELATIONSHIP CLASSIFICATION
          </span>
          <div>
            <span>ORIGINAL SOURCE</span>
            <p>
              {dataset.sources
                .filter((s) => s.reference.startsWith("SRC-ROUTE-01/"))
                .map((s) => s.reference)
                .join(" and ") || "No route source recorded"}
            </p>
          </div>
          <div>
            <span>SOURCE-DOCUMENTED CLAIM</span>
            <p>
              {defaultCurrent
                ? `${byId.get(defaultCurrent.toId)?.name} is documented from ${formatDate(defaultCurrent.validFrom)}`
                : "No current documented route"}
            </p>
          </div>
          <div>
            <span>CANDIDATE ASSOCIATION</span>
            <p>
              {operationalReferences[0]?.description ??
                "No separate operational observations available"}
            </p>
          </div>
          <div>
            <span>CAUSE VERIFIED?</span>
            <p>No · not established by these documents</p>
          </div>
          <small>
            Never replace event-time historical relationships with today&apos;s
            configuration defaults.
          </small>
        </article>
        <article className="kn-box kn-investigation">
          <span className="kn-overline">CROSS-PILLAR INVESTIGATION</span>
          <h3>Unresolved G2 / G3 question</h3>
          <p>
            {operationalReferences[0]?.id ?? "An operational record"} names G2
            after routing version 8 documented G3. This does not establish a
            contradiction without checking route scope, event time and alternate
            paths.
          </p>
          <div className="kn-investigation-note">
            <span>REQUIRES HUMAN / SOURCE CHECKS</span>
            <p>
              Route scope, effective timing, possible alternate paths, and
              corroborating evidence.
            </p>
          </div>
          <div className="kn-actions">
            <button
              type="button"
              onClick={() => setSelectedId("REL-008")}
              className="kn-secondary-button"
            >
              Review claim
            </button>
            <Link className="kn-primary-button" href="/investigations">
              Open investigations <ArrowRight size={14} />
            </Link>
          </div>
        </article>
      </div>
      <p className="kn-footer">
        DESIGN PREVIEW · Knowledge relationships and graph are synthetic; actual
        temporal queries and investigations require bank-authorized sources.
      </p>
      <dialog
        ref={sourceDialogRef}
        className="kn-source-dialog"
        aria-labelledby="kn-dialog-title"
      >
        <form method="dialog">
          <button className="kn-dialog-close" aria-label="Close source details">
            <X size={18} />
          </button>
          <h2 id="kn-dialog-title">Source metadata · synthetic</h2>
          <p>
            <strong>{source?.title ?? "Not available"}</strong>
          </p>
          <p>Reference: {source?.reference ?? "—"}</p>
          <p>Recorded: {source ? formatDate(source.recordedAt) : "—"}</p>
          <p>Owner: {source?.owner ?? "Not recorded"}</p>
          <p>{source?.description ?? "No source record is available."}</p>
          <p>
            The original bank document is not included in this synthetic
            preview.
          </p>
          <button type="submit" className="kn-secondary-button">
            Close
          </button>
        </form>
      </dialog>
    </section>
  );
}
