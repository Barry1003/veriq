"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ChevronRight, CircleHelp, Database, Network } from "lucide-react";
import type { KnowledgeSourceSnapshot } from "@/types/knowledge-sources";
import type {
  KnowledgeProcessingSnapshot,
  LocalReviewDecision,
  ReviewCandidate,
  ReviewDraft,
} from "@/types/knowledge-processing";

const decisionLabels: Record<LocalReviewDecision, string> = {
  approve: "Approve · supported claim",
  reject: "Reject · unsupported candidate",
  defer: "Defer · needs source corroboration",
};

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Database;
}) {
  return (
    <article className="kp-panel kp-metric">
      <div className="kp-metric-top">
        <span>{label}</span>
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function EvidenceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="kp-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function KnowledgeProcessingScreen({
  processing,
  sources,
}: {
  processing: KnowledgeProcessingSnapshot;
  sources: KnowledgeSourceSnapshot | null;
}) {
  const [selectedId, setSelectedId] = useState(processing.candidates[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");

  const candidate: ReviewCandidate | undefined = useMemo(
    () => processing.candidates.find((item) => item.id === selectedId),
    [processing.candidates, selectedId],
  );
  const decision = candidate
    ? (drafts[candidate.id]?.decision ?? "defer")
    : "defer";
  const rationale = candidate ? (drafts[candidate.id]?.rationale ?? "") : "";
  const timeline = candidate
    ? (processing.timelineByCandidate[candidate.id] ?? [])
    : [];
  const pendingCount = processing.candidates.filter(
    (item) => item.status === "needs-review",
  ).length;
  const missingSources = sources?.collections.filter((item) => !item.connected).length ?? null;

  function updateDraft(patch: Partial<ReviewDraft>) {
    if (!candidate) return;
    setDrafts((current) => ({
      ...current,
      [candidate.id]: {
        candidateId: candidate.id,
        decision: current[candidate.id]?.decision ?? "defer",
        rationale: current[candidate.id]?.rationale ?? "",
        ...patch,
      },
    }));
    setValidationError("");
    setLastAction(null);
  }

  function chooseCandidate(id: string) {
    setSelectedId(id);
    setLastAction(null);
    setValidationError("");
  }

  function requestEvidence() {
    if (!candidate) return;
    updateDraft({ decision: "defer", rationale: candidate.suggestedRationale });
    setLastAction("Evidence request prepared as a local draft. No request has been sent.");
  }

  function recordReview() {
    if (!candidate) return;
    if (rationale.trim().length < 12) {
      setValidationError("Enter a review rationale of at least 12 characters.");
      setLastAction(null);
      return;
    }
    setLastAction(
      `${decisionLabels[decision]} · draft retained in this page only. No review decision has been submitted.`,
    );
    setValidationError("");
  }

  const pipeline = [
    { name: "Source ingested", info: sources ? `${sources.previewTotals.processedRecords} ${sources.recordCountLabel ?? "processed records"}` : "Source registry requires administrator access" },
    { name: "Candidate extraction", info: "Claims + relationships" },
    { name: "Evidence matching", info: "Version / scope checks" },
    { name: "Human review", info: `${pendingCount} awaiting decisions` },
  ];

  return (
    <section className="kp-page" aria-labelledby="kp-title">
      <div className="kp-heading-row">
        <div>
          <p className="kp-overline">INSTITUTIONAL KNOWLEDGE / V08</p>
          <h1 id="kp-title">Knowledge Processing &amp; Review</h1>
          <p className="kp-lead">
            Inspect knowledge extraction, resolve unsupported relationships, and preserve reviewer decisions.
          </p>
        </div>
        <Link className="kp-button kp-button-secondary kp-main-link" href="/knowledge">
          Explore knowledge
        </Link>
      </div>

      <h2 className="kp-section-heading">Processing overview</h2>
      <div className="kp-metrics">
        <Metric label="RECORDS PROCESSED" value={sources?.previewTotals.processedRecords ?? "Restricted"} detail="Source processing" icon={Database} />
        <Metric label="CANDIDATES FOR REVIEW" value={pendingCount} detail="Awaiting verification" icon={CircleHelp} />
        <Metric label="SOURCE COLLECTIONS" value={sources?.collections.length ?? "Restricted"} detail={missingSources === null ? "Administrator access" : `${missingSources} not connected`} icon={Network} />
        <Metric label="INFERENCE STATE" value="Reviewable" detail="Extracted candidates" icon={Activity} />
      </div>

      <div className="kp-heading-actions">
        <h2 className="kp-section-heading">Processing stages</h2>
        <Link className="kp-button kp-button-secondary" href="/administration/local-ai">
          Inspect AI runtime
        </Link>
      </div>
      <div className="kp-panel kp-stage-grid" aria-label="Knowledge processing stages">
        {pipeline.map((stage, index) => (
          <div className="kp-stage" key={stage.name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.name}</strong>
            <small>{stage.info}</small>
          </div>
        ))}
      </div>

      <div className="kp-section-intro">
        <h2 className="kp-section-heading">Pending knowledge review</h2>
        <p>Claims awaiting evidence and reviewer decisions.</p>
      </div>
      <div className="kp-two-column kp-review-grid">
        <article className="kp-panel kp-queue" aria-label="Pending review queue">
          <div className="kp-queue-header"><span>CLAIM / SOURCE</span><span>REVIEW STATUS</span></div>
          <div className="kp-queue-list">
            {processing.candidates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`kp-queue-item${item.id === candidate?.id ? " kp-selected" : ""}`}
                aria-pressed={item.id === candidate?.id}
                onClick={() => chooseCandidate(item.id)}
              >
                <span className="kp-queue-body">
                  <span className="kp-claim-id">{item.id}</span>
                  <strong>{item.title}</strong>
                  <span className="kp-source-summary">{item.sourceSummary}</span>
                  <small>{item.description}</small>
                </span>
                <span className="kp-review-state">Needs review <ChevronRight size={16} aria-hidden="true" /></span>
              </button>
            ))}
            {processing.candidates.length === 0 && <p className="kp-empty-timeline">No claims are awaiting review.</p>}
          </div>
          <div className="kp-method">
            <strong>REVIEW DECISION STANDARD</strong>
            <p>1. Verify original source and version. &nbsp; 2. Check effective-time validity.</p>
            <p>3. Compare contradictory records. &nbsp; 4. Record reviewer rationale.</p>
          </div>
        </article>
        <article className="kp-panel kp-inspector" aria-label="Selected claim evidence">
          {candidate ? (
            <>
              <p className="kp-overline">SELECTED CLAIM / {candidate.id}</p>
              <h3>{candidate.inspectionTitle}</h3>
              <dl className="kp-fields">
                {candidate.evidence.map((entry) => <EvidenceField key={entry.label} {...entry} />)}
              </dl>
              <div className="kp-muted-block">
                <span className="kp-mini-label">WHY THIS IS NOT VERIFIED</span>
                <p>{candidate.verificationGap}</p>
              </div>
              {candidate.id === "KNW-CAND-022" && (
                <Link
                  className="kp-button kp-button-secondary"
                  href="/knowledge/processing/extraction/TASK-KNW-0027"
                >
                  Inspect extraction evidence
                </Link>
              )}
              <p className="kp-inspector-foot">Original records retained · reviewer decision pending</p>
            </>
          ) : <p>No pending claim selected.</p>}
        </article>
      </div>

      <div className="kp-section-intro">
        <h2 className="kp-section-heading">Evidence comparison &amp; reviewer decision</h2>
        <p>Compare dated source statements before making a decision.</p>
      </div>
      <div className="kp-two-column kp-evidence-grid">
        <article className="kp-panel kp-comparison">
          <p className="kp-overline">CLAIM VS ORIGINAL SOURCES</p>
          {candidate?.comparisons.map((item) => (
            <div className="kp-comparison-item" key={item.label}>
              <span className="kp-mini-label">{item.label}</span>
              <strong>{item.statement}</strong>
              <small>{item.context}</small>
            </div>
          ))}
          {candidate?.id === "KNW-CAND-021" && (
            <p className="kp-comparison-foot">These records alone do not establish a routing fault, service impact, or transaction outcome.</p>
          )}
        </article>
        <article className="kp-panel kp-decision-panel">
          <p className="kp-overline">HUMAN REVIEW / REQUIRED</p>
          <h3>{candidate?.id ?? "—"} · not approved</h3>
          <label className="kp-label">
            <span>Reviewer decision</span>
            <select
              disabled={!candidate}
              value={decision}
              onChange={(event) => updateDraft({ decision: event.target.value as LocalReviewDecision })}
            >
              <option value="defer">{decisionLabels.defer}</option>
              <option value="reject">{decisionLabels.reject}</option>
              <option value="approve">{decisionLabels.approve}</option>
            </select>
          </label>
          <label className="kp-label kp-notes-label">
            <span>ASSESSMENT NOTES / REQUIRED</span>
            <textarea
              rows={4}
              disabled={!candidate}
              value={rationale}
              onChange={(event) => updateDraft({ rationale: event.target.value })}
              placeholder={candidate?.suggestedRationale ?? "Enter source-based rationale"}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "kp-validation" : undefined}
            />
          </label>
          {validationError && <p id="kp-validation" className="kp-form-error" role="alert">{validationError}</p>}
          <div className="kp-decision-actions">
            <button type="button" className="kp-button kp-button-secondary" disabled={!candidate} onClick={requestEvidence}>Request evidence</button>
            <button type="button" className="kp-button kp-button-primary" disabled={!candidate} onClick={recordReview}>Record review</button>
          </div>
          {lastAction && <p className="kp-action-feedback" role="status">{lastAction}</p>}
        </article>
      </div>

      <h2 className="kp-section-heading kp-audit-heading">Processing &amp; review audit trail</h2>
      <article className="kp-panel kp-audit">
        {timeline.length ? timeline.map((event, index) => (
          <div className="kp-audit-row" key={`${event.timestamp}-${index}`}>
            <time>{event.timestamp}</time>
            <div><strong>{event.title}</strong><small>{event.detail}</small></div>
          </div>
        )) : <p className="kp-empty-timeline">No dated review events available for this claim.</p>}
      </article>
    </section>
  );
}
