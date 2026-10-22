"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectorSourceOptions } from "@/data/connector-workflow";
import type {
  ConnectorConfigurationDraft,
  ConnectorSourceClass,
} from "@/types/connector-workflow";

const fields: readonly {
  id: keyof Omit<ConnectorConfigurationDraft, "sourceClass">;
  label: string;
  placeholder: string;
}[] = [
  { id: "connectorId", label: "Connector ID", placeholder: "Bank connector identifier" },
  { id: "institutionOwner", label: "Institution / owner", placeholder: "Bank-owned team" },
  { id: "sourceAdapter", label: "Source adapter", placeholder: "Approved integration adapter" },
  { id: "privateEndpointReference", label: "Private source endpoint", placeholder: "Bank-internal endpoint reference" },
  { id: "approvalReference", label: "Approval identifier", placeholder: "Bank authorization reference" },
  { id: "sourceScope", label: "Source scope", placeholder: "Authorized source records and fields" },
  { id: "secretReference", label: "Credentials reference", placeholder: "Bank-managed secret identifier (never a key or password)" },
  { id: "mappingProfile", label: "Mapping profile", placeholder: "Versioned source-field mapping" },
];

const gates = [
  ["Source scope approval", "Not verified", "Source owner decision required"],
  ["Connection handshake", "Not run", "Authenticated, bank-local test required"],
  ["Mapping and sample record", "Not validated", "Preserve original fields and event times"],
  ["Activation authorization", "Blocked", "Cannot activate without required checks"],
] as const;

export function ConnectorCreateScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<ConnectorSourceClass>("knowledge");
  const [draft, setDraft] = useState<ConnectorConfigurationDraft>(
    connectorSourceOptions[0].defaults,
  );
  const [feedback, setFeedback] = useState("");
  const [validationError, setValidationError] = useState("");

  function restoreDraft() {
    try {
      const saved = sessionStorage.getItem("veriq-connector-local-draft-v1");
      if (!saved) {
        setFeedback("No saved connector draft was found in this browser session.");
        return;
      }
      const record: unknown = JSON.parse(saved);
      if (!record || typeof record !== "object") {
        setFeedback("The saved connector draft could not be read.");
        return;
      }
      const candidate = record as Partial<ConnectorConfigurationDraft>;
      const preset = connectorSourceOptions.find(
        (item) => item.id === candidate.sourceClass,
      );
      if (
        !preset ||
        typeof candidate.connectorId !== "string" ||
        typeof candidate.sourceScope !== "string"
      ) {
        setFeedback("The saved connector draft is incomplete.");
        return;
      }
      setCategory(preset.id);
      setDraft({ ...preset.defaults, ...candidate, secretReference: "" });
      setFeedback("Draft restored in this browser session.");
    } catch {
      setFeedback("Browser storage is unavailable. Draft remains on this page.");
    }
  }

  function selectCategory(next: ConnectorSourceClass) {
    const preset = connectorSourceOptions.find((item) => item.id === next);
    if (!preset) return;
    setCategory(next);
    setDraft(preset.defaults);
    setFeedback("");
    setValidationError("");
  }

  function updateField(
    id: keyof Omit<ConnectorConfigurationDraft, "sourceClass">,
    value: string,
  ) {
    setDraft((current) => ({ ...current, [id]: value }));
    setFeedback("");
    setValidationError("");
  }

  function saveDraft(): boolean {
    if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(draft.connectorId.trim())) {
      setValidationError("Use an uppercase connector ID containing letters, numbers or hyphens.");
      return false;
    }
    if (!draft.institutionOwner.trim() || !draft.sourceScope.trim() || !draft.sourceAdapter.trim()) {
      setValidationError("Connector owner, source adapter and permitted scope are required.");
      return false;
    }
    try {
      const storageCopy: ConnectorConfigurationDraft = {
        ...draft,
        privateEndpointReference: "",
        approvalReference: "",
        secretReference: "",
      };
      sessionStorage.setItem("veriq-connector-local-draft-v1", JSON.stringify(storageCopy));
      setFeedback("Draft saved in this browser session.");
      return true;
    } catch {
      setValidationError("Browser storage is unavailable. Draft remains on this page.");
      return false;
    }
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDraft();
  }

  function openValidation() {
    if (!saveDraft()) return;
    router.push(`/administration/connectors/${encodeURIComponent(draft.connectorId)}/validation?mode=draft`);
  }

  const selected = connectorSourceOptions.find((item) => item.id === category)!;

  return (
    <section className="cw-page" aria-labelledby="cw-create-title">
      <header className="cw-page-head">
        <p className="cw-eyebrow">ADMINISTRATION / CONNECTORS / CREATE</p>
        <h1 id="cw-create-title">Add a bank-controlled connector</h1>
        <p>Configure approved source categories, permissions and mappings.</p>
        <Link className="cw-button cw-button-secondary cw-mobile-return" href="/administration/connectors">Back to registry</Link>
      </header>

      <section className="cw-section" aria-labelledby="cw-setup-heading">
        <h2 id="cw-setup-heading">Connector setup</h2>
        <ol className="cw-steps">
          {[
            ["01 · Select type", "Current step"],
            ["02 · Configure", "Draft"],
            ["03 · Authorize & map", "Not verified"],
            ["04 · Test & activate", "Not tested"],
          ].map(([name, status], index) => (
            <li className={`cw-card cw-step${index === 0 ? " cw-current" : ""}`} key={name}>
              <strong>{name}</strong><span>{status}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="cw-section" aria-labelledby="cw-select-heading">
        <h2 id="cw-select-heading">Select an approved source category</h2>
        <div className="cw-panel cw-category-grid" role="group" aria-label="Source category">
          {connectorSourceOptions.map((option) => (
            <button
              className={`cw-category${category === option.id ? " cw-selected" : ""}`}
              key={option.id}
              type="button"
              aria-pressed={category === option.id}
              onClick={() => selectCategory(option.id)}
            >
              <strong>{option.label}</strong><span>{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="cw-section" aria-labelledby="cw-configure-heading">
        <h2 id="cw-configure-heading">Configure selected source</h2>
        <div className="cw-main-grid">
          <form className="cw-panel cw-form" onSubmit={submitDraft}>
            <p className="cw-eyebrow">{selected.label.toUpperCase()} / CONFIGURATION DRAFT</p>
            {fields.map((field) => (
              <label className="cw-field" key={field.id}>
                <span>{field.label.toUpperCase()}</span>
                <input
                  type="text"
                  value={draft[field.id]}
                  placeholder={field.placeholder}
                  maxLength={field.id === "sourceScope" ? 240 : 180}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => updateField(field.id, event.currentTarget.value)}
                  aria-invalid={Boolean(validationError && field.id === "connectorId")}
                />
              </label>
            ))}
            {validationError && <p className="cw-error" role="alert">{validationError}</p>}
            {feedback && <p className="cw-feedback" role="status">{feedback}</p>}
          </form>

          <aside className="cw-panel cw-authorization">
            <p className="cw-eyebrow">BANK-SIDE AUTHORIZATION</p>
            <h3>Verify permission before ingest</h3>
            <dl className="cw-definition-list">
              <div><dt>Source category</dt><dd>{selected.label}</dd></div>
              <div><dt>Bank owner approval</dt><dd>Unverified</dd></div>
              <div><dt>Permitted operations</dt><dd>Read-only scoped ingestion</dd></div>
              <div><dt>Data residency</dt><dd>Inside bank-controlled environment</dd></div>
              <div><dt>Secrets handling</dt><dd>Secure references only</dd></div>
              <div><dt>Record provenance</dt><dd>Original IDs and versions retained</dd></div>
              <div><dt>Cross-source access</dt><dd>Denied by default</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="cw-section" aria-labelledby="cw-gates-heading">
        <h2 id="cw-gates-heading">Mapping, validation and activation gates</h2>
        <div className="cw-panel cw-gates">
          {gates.map(([name, value, description]) => (
            <div className="cw-gate-row" key={name}>
              <strong>{name}</strong><span>{value}</span><small>{description}</small>
            </div>
          ))}
          <div className="cw-footer-actions">
            <button className="cw-button cw-button-secondary" type="button" onClick={saveDraft}>Save draft</button>
            <button className="cw-button cw-button-secondary" type="button" onClick={restoreDraft}>Restore draft</button>
            <button className="cw-button cw-button-primary" type="button" onClick={openValidation}>Validate and test</button>
            <button className="cw-button cw-button-disabled" type="button" disabled title="Requires authenticated authorization, valid mapping and successful processing">Activate · locked</button>
          </div>
        </div>
      </section>
    </section>
  );
}

