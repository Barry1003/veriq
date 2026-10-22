"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { KNOWLEDGE_ACQUISITION_INITIAL, KNOWLEDGE_SOURCE_OPTIONS } from "@/data/knowledge-acquisition";
import {
  UNCHECKED_KNOWLEDGE_PREFLIGHT,
  type KnowledgeAcquisitionDraft,
  type KnowledgeDeliveryMode,
  type KnowledgePreflight,
  type KnowledgeSourceKind,
} from "@/types/knowledge-acquisition";

const STEPS = [
  { label: "Select source", status: "Current step" },
  { label: "Authorize & map", status: "Pending" },
  { label: "Test and ingest", status: "Not started" },
  { label: "Inspect results", status: "Not started" },
] as const;

const CHECKS: readonly { key: keyof KnowledgePreflight; label: string }[] = [
  { key: "ownerAuthorization", label: "Bank owner authorization" },
  { key: "schemaCompatibility", label: "Source schema compatibility" },
  { key: "recordDelivery", label: "Source record delivery" },
];

const CHECK_LABEL: Record<KnowledgePreflight[keyof KnowledgePreflight], string> = {
  "not-checked": "Not checked",
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
};

const REQUIRED_FIELDS: (keyof Pick<KnowledgeAcquisitionDraft,
  "sourceId" | "owner" | "authorizationScope" | "version" | "recordIdField" | "schemaProfile">)[] = [
  "sourceId",
  "owner",
  "authorizationScope",
  "version",
  "recordIdField",
  "schemaProfile",
];

type TextFieldKey = Exclude<keyof KnowledgeAcquisitionDraft, "kind" | "deliveryMode">;

function KnowledgeField({
  label,
  field,
  value,
  onChange,
  required = false,
  error,
}: {
  label: string;
  field: TextFieldKey;
  value: string;
  onChange: (field: TextFieldKey, value: string) => void;
  required?: boolean;
  error?: string;
}) {
  const id = useId();

  return (
    <div className="ka-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        maxLength={220}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value)}
        autoComplete="off"
      />
      {error && <small id={`${id}-error`} role="alert">{error}</small>}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ka-review-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function GuidedKnowledgeAcquisition({
  preflight = UNCHECKED_KNOWLEDGE_PREFLIGHT,
}: {
  preflight?: KnowledgePreflight;
}) {
  const [sourceKind, setSourceKind] = useState<KnowledgeSourceKind>("structured");
  const [drafts, setDrafts] = useState<Record<KnowledgeSourceKind, KnowledgeAcquisitionDraft>>(() => ({
    structured: { ...KNOWLEDGE_ACQUISITION_INITIAL.structured },
    unstructured: { ...KNOWLEDGE_ACQUISITION_INITIAL.unstructured },
  }));
  const [attempted, setAttempted] = useState(false);
  const [notification, setNotification] = useState("");
  const [saved, setSaved] = useState<KnowledgeAcquisitionDraft | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  const draft = drafts[sourceKind];
  const fields = new Set<keyof KnowledgeAcquisitionDraft>(REQUIRED_FIELDS);
  if (draft.kind === "structured") fields.add("effectiveFrom");
  const errors = Object.fromEntries(
    [...fields]
      .filter((key) => !String(draft[key]).trim())
      .map((key) => [key, "This field is required."]),
  ) as Partial<Record<TextFieldKey, string>>;

  useEffect(() => {
    if (notification) noticeRef.current?.focus();
  }, [notification]);

  function chooseKind(kind: KnowledgeSourceKind) {
    setSourceKind(kind);
    setAttempted(false);
    setSaved(null);
    setNotification("");
  }

  function changeField(field: TextFieldKey, value: string) {
    setDrafts((current) => ({
      ...current,
      [sourceKind]: { ...current[sourceKind], [field]: value },
    }));
    setSaved(null);
    setNotification("");
  }

  function selectDelivery(mode: KnowledgeDeliveryMode) {
    setDrafts((current) => ({
      ...current,
      [sourceKind]: {
        ...current[sourceKind],
        deliveryMode: mode,
        accessMethod: mode === "connector"
          ? "Approved read-only connector"
          : "Approved institutional document submission",
      },
    }));
    setSaved(null);
    setNotification("");
  }

  function saveDraft() {
    setAttempted(true);
    if (Object.keys(errors).length) {
      setNotification("Complete the required source details before saving.");
      return;
    }
    setSaved({ ...draft });
    setNotification("Source draft saved in this tab.");
  }

  function requestAuthorization() {
    setNotification("Source authorization has not been checked. An approved bank service is required.");
  }

  const controlReady = Object.values(preflight).every((status) => status === "passed");

  return (
    <section className="ka-page" aria-labelledby="ka-title">
      <header className="ka-header">
        <div>
          <p className="ka-eyebrow">INSTITUTIONAL KNOWLEDGE / SOURCE ONBOARDING</p>
          <h1 id="ka-title">Add institutional knowledge source</h1>
          <p>Connect authorized bank records or submit approved documents, then inspect extracted knowledge.</p>
        </div>
        <Link className="ka-button ka-button-secondary" href="/knowledge/processing">View processing</Link>
      </header>

      <section className="ka-section">
        <h2>Source acquisition</h2>
        <ol className="ka-steps">
          {STEPS.map((step, index) => (
            <li key={step.label} className={index === 0 ? "ka-current" : ""}>
              <strong>{String(index + 1).padStart(2, "0")} · {step.label}</strong>
              <span>{step.status}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="ka-section">
        <h2>Choose a bank-approved source category</h2>
        <div className="ka-card ka-categories" role="radiogroup" aria-label="Source category">
          {KNOWLEDGE_SOURCE_OPTIONS.map((option) => (
            <label key={option.kind} className={`ka-category${sourceKind === option.kind ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="source-kind"
                checked={sourceKind === option.kind}
                onChange={() => chooseKind(option.kind)}
              />
              <span className="ka-category-content">
                <strong>{option.title}</strong>
                <span>{option.description}</span>
                <small>{option.detail}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="ka-section">
        <h2>Source configuration and provenance</h2>
        <div className="ka-two-column">
          <div className="ka-card ka-form-card">
            <p className="ka-eyebrow">
              {draft.kind === "structured" ? "STRUCTURED SOURCE / ROUTING CONFIGURATION" : "UNSTRUCTURED SOURCE / DOCUMENT RECORD"}
            </p>
            <div className="ka-fields">
              <KnowledgeField label={draft.kind === "structured" ? "BANK SOURCE ID" : "DOCUMENT SOURCE ID"} field="sourceId" value={draft.sourceId} onChange={changeField} required error={attempted ? errors.sourceId : undefined} />
              <KnowledgeField label="BANK SYSTEM / OWNER" field="owner" value={draft.owner} onChange={changeField} required error={attempted ? errors.owner : undefined} />
              <KnowledgeField label="ACCESS METHOD" field="accessMethod" value={draft.accessMethod} onChange={changeField} />
              <KnowledgeField label="AUTHORIZATION SCOPE" field="authorizationScope" value={draft.authorizationScope} onChange={changeField} required error={attempted ? errors.authorizationScope : undefined} />
              <KnowledgeField label="SOURCE VERSION" field="version" value={draft.version} onChange={changeField} required error={attempted ? errors.version : undefined} />
              <KnowledgeField label="SOURCE EFFECTIVE FROM" field="effectiveFrom" value={draft.effectiveFrom} onChange={changeField} required={draft.kind === "structured"} error={attempted ? errors.effectiveFrom : undefined} />
              <KnowledgeField label={draft.kind === "structured" ? "SOURCE RECORD ID FIELD" : "ORIGINAL DOCUMENT ID FIELD"} field="recordIdField" value={draft.recordIdField} onChange={changeField} required error={attempted ? errors.recordIdField : undefined} />
              <KnowledgeField label="SCHEMA/VALIDATION PROFILE" field="schemaProfile" value={draft.schemaProfile} onChange={changeField} required error={attempted ? errors.schemaProfile : undefined} />
            </div>
          </div>

          <aside className="ka-card ka-side-card">
            <p className="ka-eyebrow">BANK-OWNED SOURCE APPROVAL</p>
            <h3>Select delivery mode</h3>
            <div className="ka-modes" role="radiogroup" aria-label="Source delivery mode">
              <label className={draft.deliveryMode === "connector" ? "is-selected" : ""}>
                <input type="radio" name="delivery" checked={draft.deliveryMode === "connector"} onChange={() => selectDelivery("connector")} />
                <strong>Approved connector</strong>
                <span>Read-only source integration, version-preserving</span>
              </label>
              <label className={draft.deliveryMode === "document" ? "is-selected" : ""}>
                <input type="radio" name="delivery" checked={draft.deliveryMode === "document"} onChange={() => selectDelivery("document")} />
                <strong>Approved document submission</strong>
                <span>Institutional files and original metadata</span>
              </label>
            </div>
            <h3>Authorization requirements</h3>
            <dl className="ka-requirements">
              <ReviewRow label="OWNER APPROVAL" value="Not verified" />
              <ReviewRow label="SOURCE SCOPE" value="Service and entity access restricted" />
              <ReviewRow label="RECORD HANDLING" value="Original versions retained" />
              <ReviewRow label="CREDENTIALS" value="Bank-managed references only" />
            </dl>
            {draft.deliveryMode === "document" && <p className="ka-context-note">Document submission becomes available after bank-side authorization and upload integration.</p>}
          </aside>
        </div>
      </section>

      <section className="ka-card ka-gates" aria-labelledby="ka-gates-title">
        <h2 id="ka-gates-title">Source verification</h2>
        <div className="ka-checks">
          {CHECKS.map((check) => (
            <div key={check.key} className="ka-check-row">
              <strong>{check.label}</strong>
              <span>{CHECK_LABEL[preflight[check.key]]}</span>
            </div>
          ))}
        </div>
        {saved && <p className="ka-saved" role="status">Draft: {saved.sourceId} · {saved.kind === "structured" ? "Structured records" : "Source documents"}</p>}
        {notification && <p className="ka-feedback" role="status" ref={noticeRef} tabIndex={-1}>{notification}</p>}
        <div className="ka-actions">
          <button type="button" className="ka-button ka-button-secondary" onClick={saveDraft}>Save source draft</button>
          <button type="button" className="ka-button ka-button-primary" onClick={requestAuthorization}>Validate source authorization</button>
          {controlReady ? (
            <Link className="ka-button ka-button-secondary ka-action-end" href="/knowledge/processing">Continue to processing</Link>
          ) : (
            <button type="button" className="ka-button ka-button-secondary ka-action-end" disabled>Continue to processing</button>
          )}
        </div>
      </section>
    </section>
  );
}
