"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { EvidenceRequestDraft, ExtractionTaskDetail } from "@/types/knowledge-extraction";

function Field({ label, value }: { label: string; value: string }) {
  return <div className="ke-field"><dt>{label}</dt><dd>{value}</dd></div>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="ke-section-title">{children}</h2>;
}

export function AiExtractionEvidenceScreen({ evidence }: { evidence: ExtractionTaskDetail }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestedEvidence, setRequestedEvidence] = useState("");
  const [requestDraft, setRequestDraft] = useState<EvidenceRequestDraft | null>(null);
  const [error, setError] = useState("");
  const originalSection = useRef<HTMLDivElement>(null);
  const requestSection = useRef<HTMLDivElement>(null);
  const { task, candidate, source } = evidence;
  const reviewUrl = `/knowledge/processing?candidate=${encodeURIComponent(evidence.candidateId)}#review-queue`;

  useEffect(() => {
    if (showOriginal) originalSection.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [showOriginal]);

  useEffect(() => {
    if (requestOpen) requestSection.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [requestOpen]);

  function saveEvidenceDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestedEvidence.trim().length < 12) {
      setError("Describe the missing evidence in at least 12 characters.");
      return;
    }
    setRequestDraft({
      taskId: evidence.taskId,
      candidateId: evidence.candidateId,
      requestedEvidence: requestedEvidence.trim(),
      sourceReferences: [source.originalReference],
    });
    setRequestOpen(false);
    setError("");
  }

  return (
    <section className="ke-page" aria-labelledby="ke-title">
      <header className="ke-page-heading">
        <div>
          <p className="ke-overline">INSTITUTIONAL KNOWLEDGE / AI EXTRACTION DETAIL</p>
          <h1 id="ke-title">Inspect AI-extracted knowledge</h1>
          <p>Review the original bank document, processing task, candidate relationships and source-level evidence.</p>
        </div>
        <Link className="ke-button ke-button-secondary" href="/knowledge">Explore knowledge</Link>
      </header>

      <div className="ke-section-heading-row">
        <SectionTitle>Extraction job · {evidence.taskId}</SectionTitle>
        <span className="ke-subtle-state">Example record</span>
      </div>
      <div className="ke-metrics">
        {[
          ["SOURCE DOCUMENT", `${source.id} / ${source.version}`, "Original section retained"],
          ["TASK STATUS", "Completed", "Model output available in example"],
          ["KNOWLEDGE RESULT", "Candidate", "Not policy accepted"],
          ["HUMAN REVIEW", "Required", "No approval recorded"],
        ].map(([label, value, note]) => (
          <article className="ke-panel ke-metric" key={label}>
            <span className="ke-label">{label}</span><strong>{value}</strong><small>{note}</small>
          </article>
        ))}
      </div>

      <SectionTitle>Original evidence and generated interpretation</SectionTitle>
      <div className="ke-columns">
        <article className="ke-panel ke-original-panel">
          <p className="ke-overline">BANK ORIGINAL / DOCUMENT VERSION {source.version.replace(/^v/, "")}</p>
          <h3>{source.title}</h3>
          <div className="ke-muted ke-excerpt" id="original-evidence">
            <p className="ke-label">{source.id} / {source.version} · SECTION {source.section} · SOURCE EXCERPT</p>
            <blockquote>“{source.excerpt}”</blockquote>
            <small>Original source text · document offset section {source.section}</small>
          </div>
          <p className="ke-overline ke-second-overline">LOCAL AI EXTRACTION / SOURCE-LINKED OUTPUT</p>
          <div className="ke-muted ke-candidate">
            <span className="ke-label">EXTRACTED ENTITY PAIR</span>
            <h3>{candidate.from} → {candidate.to}</h3>
            <p>Relationship candidate: {candidate.proposedRelationship.toLowerCase()}</p>
            <p>Supporting source: {source.originalReference}</p>
            <small>Pending evidence-supported review.</small>
          </div>
          <p className="ke-footnote">The excerpt supports a procedure request; it does not independently establish a real incident’s cause.</p>
        </article>
        <aside className="ke-panel ke-side-panel" aria-label="Extraction task provenance">
          <p className="ke-overline">TASK PROVENANCE</p>
          <h3>How the output was produced</h3>
          <dl className="ke-fields">
            <Field label="TASK IDENTIFIER" value={evidence.taskId} />
            <Field label="TASK PURPOSE" value={task.purpose} />
            <Field label="INFERENCE BOUNDARY" value={task.inferenceBoundary} />
            <Field label="MODEL IDENTIFIER" value={task.modelId ?? "Not available in task example"} />
            <Field label="INPUT EVIDENCE" value={source.originalReference} />
            <Field label="SOURCE EVENT / VERSION" value={`Original revision ${source.version.replace(/^v/, "")}`} />
            <Field label="VERIQ PROCESSING TIME" value={task.processedAt} />
            <Field label="TASK OUTPUT STATE" value="Completed · candidate produced" />
          </dl>
        </aside>
      </div>

      <SectionTitle>Extracted claims and evidence checks</SectionTitle>
      <article className="ke-panel ke-check-panel">
        <div className="ke-table-scroll"><table className="ke-table">
          <thead><tr><th scope="col">CHECK / FIELD</th><th scope="col">OBSERVED EVIDENCE</th><th scope="col">ASSESSMENT</th></tr></thead>
          <tbody>{evidence.checks.map((check) => <tr key={check.field}><td>{check.field}</td><td>{check.observedEvidence}</td><td><span className={`ke-check-state ke-${check.state}`}>{check.assessment}</span></td></tr>)}</tbody>
        </table></div>
        <p className="ke-footnote">Missing effective time cannot be inferred from model output. The original source and its provenance are retained.</p>
      </article>

      <SectionTitle>Human decision and recorded rationale</SectionTitle>
      <article className="ke-panel ke-review-panel">
        <p className="ke-overline">REVIEW REQUIRED / CANDIDATE {evidence.candidateId}</p>
        <div className="ke-review-columns">
          <div className="ke-muted ke-review-info">
            <p className="ke-label">REVIEWER ASSESSMENT / REQUIRED</p>
            <p>Confirm whether the SOP describes a general operational procedure or a required service dependency, including validity period and source authority.</p>
            <p>Potential decisions: accept a supported scoped claim, reject, or defer for more evidence.</p>
          </div>
          <div className="ke-review-state"><p className="ke-label">DECISION STATE</p><strong>Pending authorized reviewer</strong><p>Reviewer, rationale, source citations and audit record must be persisted together.</p></div>
        </div>
        <div className="ke-actions">
          <button type="button" className="ke-button ke-button-secondary" aria-expanded={showOriginal} onClick={() => setShowOriginal((value) => !value)}>Inspect original document</button>
          <button type="button" className="ke-button ke-button-secondary" aria-expanded={requestOpen} onClick={() => { setRequestOpen(true); setError(""); }}>Request further evidence</button>
          <Link className="ke-button ke-button-primary ke-review-link" href={reviewUrl}>Record review decision</Link>
        </div>
        {showOriginal && <div className="ke-inline-panel" ref={originalSection}><div className="ke-inline-heading"><strong>Original source · {source.originalReference}</strong><button type="button" onClick={() => setShowOriginal(false)} aria-label="Close original source inspection">Close</button></div><p>{source.title}</p><blockquote>“{source.excerpt}”</blockquote><small>Source excerpt only. The full original document is not included in this evidence example.</small></div>}
        {requestOpen && <div className="ke-inline-panel" ref={requestSection}><form onSubmit={saveEvidenceDraft}><label htmlFor="ke-evidence-request">Additional evidence needed</label><textarea id="ke-evidence-request" rows={3} maxLength={750} value={requestedEvidence} onChange={(event) => { setRequestedEvidence(event.target.value); setError(""); }} placeholder="Specify effective dates, source authority or supporting service dependency records" aria-invalid={Boolean(error)} />{error && <p className="ke-validation-error" role="alert">{error}</p>}<div className="ke-actions"><button type="submit" className="ke-button ke-button-primary">Save request draft</button><button type="button" className="ke-button ke-button-secondary" onClick={() => setRequestOpen(false)}>Cancel</button></div></form></div>}
        {requestDraft && <p className="ke-draft-message" role="status">Evidence request draft saved for {requestDraft.candidateId}. Not submitted.</p>}
      </article>
    </section>
  );
}
