"use client";

import { useId, useRef, useState } from "react";
import { CircleX } from "lucide-react";
import type { EmergingIssue } from "@/types/emerging-issues";

type Decision = "defer" | "accept-grouping" | "reject-grouping";

type ReviewDraft = {
  issueId: string;
  decision: Decision;
  evidenceReferences: string;
  authorizationScope: string;
  rationale: string;
};

const decisions: { value: Decision; label: string }[] = [
  { value: "defer", label: "Defer · further source checking required" },
  { value: "accept-grouping", label: "Accept supported grouping (draft only)" },
  { value: "reject-grouping", label: "Reject grouping (draft only)" },
];

export function EmergingIssueReviewDialog({ issue }: { issue: EmergingIssue }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [decision, setDecision] = useState<Decision>("defer");
  const [evidenceReferences, setEvidenceReferences] = useState("CX-0081, CX-0087, CX-0090");
  const [authorizationScope, setAuthorizationScope] = useState("");
  const [rationale, setRationale] = useState("");
  const [savedDraft, setSavedDraft] = useState<ReviewDraft | null>(null);
  const valid = evidenceReferences.trim().length > 0 && authorizationScope.trim().length > 0 && rationale.trim().length >= 12;

  return <>
    <button type="button" className="ep-button ep-button-primary ep-wide" onClick={() => dialog.current?.showModal()}>
      Review pattern evidence
    </button>
    {savedDraft && <p className="ep-draft-saved" role="status">Draft retained on this page: {decisions.find(x => x.value === savedDraft.decision)?.label}. Issue remains under review.</p>}
    <dialog ref={dialog} aria-labelledby={headingId} className="ep-review-dialog">
      <div className="ep-dialog-top">
        <p className="ep-overline">{issue.id} / UNREVIEWED CLUSTER</p>
        <button type="button" className="ep-icon-button" aria-label="Close emerging issue review" onClick={() => dialog.current?.close()}><CircleX size={21} aria-hidden="true" /></button>
      </div>
      <h2 id={headingId}>Review emerging issue</h2>
      <p className="ep-dialog-intro">Nine support interactions are not nine unique affected customers.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        setSavedDraft({ issueId: issue.id, decision, evidenceReferences: evidenceReferences.trim(), authorizationScope: authorizationScope.trim(), rationale: rationale.trim() });
        dialog.current?.close();
      }}>
        <div className="ep-dialog-lead">
          <span>REVIEW DETAILS</span>
          <p>Provide supporting evidence, permission scope and assessment rationale.</p>
        </div>
        <dl className="ep-dialog-facts">
          <div><dt>CANDIDATE CLASSIFICATION</dt><dd>Reported transfer uncertainty</dd></div>
          <div><dt>UNRESOLVED ISSUE</dt><dd>Duplicate contacts and unique customer count</dd></div>
        </dl>
        <label className="ep-form-field">SOURCE SUPPORT
          <input value={evidenceReferences} onChange={(e) => setEvidenceReferences(e.target.value)} required aria-required="true" placeholder="Cite source record IDs" />
        </label>
        <label className="ep-form-field">AUTHORIZED REVIEW SCOPE
          <input value={authorizationScope} onChange={(e) => setAuthorizationScope(e.target.value)} required aria-required="true" placeholder="Describe permission scope for this review" />
        </label>
        <label className="ep-form-field">REVIEW DECISION
          <select value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>
            {decisions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="ep-form-field">ASSESSMENT RATIONALE
          <textarea rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} required minLength={12} placeholder="Explain source support, duplicates, unresolved checks, and rationale" />
        </label>
        <div className="ep-dialog-lead ep-dialog-rule">
          <span>EVIDENCE &amp; PERMISSION REQUIREMENT</span>
          <p>Only an authorized reviewer can submit an auditable decision. A local draft does not change the issue classification.</p>
        </div>
        <div className="ep-dialog-actions">
          <button type="button" className="ep-button" onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" className="ep-button ep-button-primary" disabled={!valid}>Save local draft</button>
        </div>
      </form>
    </dialog>
  </>;
}

