"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { SetupValidationResult } from "@/types/onboarding-extra";

const steps = [
  "Institution profile",
  "Administrator access",
  "Local model policy",
  "Approved bank sources",
  "Readiness verification",
] as const;

function SetupLayout({
  heading, description, activeStep, children, completed = false,
}: {
  heading: string; description: string; activeStep: number; children: ReactNode; completed?: boolean;
}) {
  return (
    <div className="ob-root ob-extra-root">
      <header className="ob-topbar">
        <div className="ob-topbar-left">
          <Link href="/onboarding" aria-label="Veriq onboarding home">
            <Image src="/images/veriq-onboarding-brand.png" width={109} height={53} alt="Veriq" className="ob-brand-logo" />
          </Link>
          <span className="ob-topbar-institution">Cedar Bank</span>
          <span className="ob-topbar-path">/ First-run deployment setup</span>
        </div>
        <div className="ob-topbar-right"><Link href="/onboarding" className="ob-button">Setup home</Link></div>
      </header>
      <main className="ob-content">
        <div className="ob-overline">VERIQ / FIRST-RUN DEPLOYMENT</div>
        <h1>{heading}</h1>
        <p className="ob-page-description">{description}</p>
        <div className="ob-progress-heading"><h2>Deployment setup</h2><span>{completed ? "Setup complete" : `Step ${activeStep} of 5`}</span></div>
        <nav className="ob-steps" aria-label="Deployment setup stages">
          {steps.map((label, i) => (
            <Link className={`ob-step${activeStep === i + 1 ? " is-current" : ""}`} key={label} href="/onboarding">
              <strong>{String(i + 1).padStart(2, "0")} / {label}</strong>
              <span>{completed && i === 4 ? "Activated" : activeStep === i + 1 ? "Current step" : "View stage"}</span>
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}

function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ob-panel ob-extra-panel ${className}`}>{children}</section>;
}
function Cap({ children }: { children: ReactNode }) {
  return <span className="ob-meta">{children}</span>;
}
function Item({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ob-extra-item"><Cap>{label}</Cap><div>{children}</div></div>;
}
function Line({ label, value, state }: { label: string; value: string; state?: "ok" | "bad" | "pending" }) {
  return <div className="ob-extra-line"><span>{label}</span><span className={`ob-extra-value ${state ? `is-${state}` : ""}`}>{value}</span></div>;
}
function Facts({ children }: { children: ReactNode }) {
  return <div className="ob-extra-facts">{children}</div>;
}
function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <Box><Cap>{label}</Cap><strong className="ob-extra-big">{value}</strong><small>{hint}</small></Box>;
}
function StateNote({ children, mode = "muted" }: { children: ReactNode; mode?: "muted" | "error" | "ok" }) {
  return <div className={`ob-extra-note ob-extra-note-${mode}`}>{children}</div>;
}
function DevAction({ action }: { action: string }) {
  const [message, setMessage] = useState("");
  return <div className="ob-extra-action-message">
    <button className="ob-button" type="button" onClick={() => setMessage("A verified bank-side service response is required to perform this action.")}>{action}</button>
    {message && <p role="status">{message}</p>}
  </div>;
}

export interface ConnectorDraft {
  connectorId: string;
  sourceType: string;
  owner: string;
  scope: string;
  accessMode: string;
  authorizationReference: string;
  mappingProfile: string;
}
const initialConnector: ConnectorDraft = {
  connectorId: "KNW-ROUTE-01",
  sourceType: "Routing configuration database / approved document store",
  owner: "Cedar Payments Engineering",
  scope: "Service routes, dependencies, validity periods",
  accessMode: "Read-only · internal endpoint",
  authorizationReference: "",
  mappingProfile: "route_id, gateway_id, effective_from, source_version",
};

export function ConnectorConfigurationScreen({ onBack, onSave, initialDraft }: {
  onBack?: () => void;
  onSave?: (draft: ConnectorDraft) => void;
  initialDraft?: ConnectorDraft;
}) {
  const [draft, setDraft] = useState(initialDraft ?? initialConnector);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  function set<K extends keyof ConnectorDraft>(key: K, value: ConnectorDraft[K]) {
    setDraft(old => ({ ...old, [key]: value }));
    setSaved(false);
  }
  const inputs: readonly { key: keyof ConnectorDraft; label: string; readonly?: boolean }[] = [
    { key: "connectorId", label: "CONNECTOR ID", readonly: true },
    { key: "sourceType", label: "BANK SOURCE TYPE", readonly: true },
    { key: "owner", label: "SOURCE OWNER" },
    { key: "scope", label: "APPROVED SOURCE SCOPE" },
    { key: "accessMode", label: "ACCESS MODE", readonly: true },
    { key: "authorizationReference", label: "AUTHORIZATION REFERENCE" },
    { key: "mappingProfile", label: "MAPPING PROFILE" },
  ];
  return <SetupLayout activeStep={4} heading="Configure a bank-approved connector" description="Institutional Knowledge / KNW-ROUTE-01">
    <div className="ob-section-heading"><h2>Knowledge connector setup</h2><p>Source-specific configuration and permission scope</p></div>
    <div className="ob-extra-two">
      <Box><Cap>BANK-OWNED KNOWLEDGE CONNECTOR</Cap><div className="ob-extra-fields">
        {inputs.map(item => <label className="ob-field" key={item.key}>
          <span>{item.label}</span>
          <input value={draft[item.key]} readOnly={item.readonly} placeholder={item.key === "authorizationReference" ? "Bank approval ID" : ""} onChange={item.readonly ? undefined : e => set(item.key, e.currentTarget.value)} />
        </label>)}
      </div><div className="ob-actions">
        <button className="ob-button" type="button" onClick={() => { setSaved(true); setFeedback(""); onSave?.(draft); }}>Save connector draft</button>
        <button className="ob-button ob-button-primary" type="button" onClick={() => setFeedback("Connection test unavailable until a bank-approved connector service is configured.")}>Test bank connection</button>
      </div>{saved && <p className="ob-extra-inline" role="status">Draft saved in this setup session</p>}{feedback && <p className="ob-extra-inline" role="status">{feedback}</p>}</Box>
      <Box><Cap>SOURCE SCOPE PROTECTION</Cap><Facts>
        <Item label="SOURCE IDENTITY">Original document and record IDs retained</Item>
        <Item label="VERSION PRESERVATION">Historical versions retained</Item>
        <Item label="PERMISSIONS">Bank-side scope enforcement</Item>
        <Item label="CREDENTIALS">Bank-managed secret reference</Item>
        <Item label="INGESTION POLICY">Source-level errors and validity checks</Item>
      </Facts></Box>
    </div>
    <div className="ob-section-heading"><h2>Connection and evidence test results</h2></div>
    <Box><div className="ob-extra-lines">
      <Line label="01 · Configured" value={saved ? "Draft saved" : "Draft editing"} />
      <Line label="02 · Authorized" value="Not verified" state="pending" />
      <Line label="03 · Connected" value="Not tested" state="pending" />
      <Line label="04 · Receiving" value="No events observed" state="pending" />
      <Line label="05 · Processing" value="Not verified" state="pending" />
    </div></Box>
    <Box className="ob-extra-footer"><Cap>NOT ACTIVATED</Cap><div className="ob-extra-buttons">
      {onBack ? <button className="ob-button" onClick={onBack}>Back to source categories</button> : <Link className="ob-button" href="/onboarding">Back to source categories</Link>}
      <DevAction action="Validate source mapping" />
    </div></Box>
  </SetupLayout>;
}

export function SetupGuidanceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function onEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="ob-extra-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ob-extra-dialog" role="dialog" aria-modal="true" aria-labelledby="ob-extra-guidance-title">
      <button type="button" ref={closeRef} aria-label="Close setup guidance" className="ob-extra-dialog-close" onClick={onClose}><X size={20} /></button>
      <Cap>V01 / DEPLOYMENT GUIDE</Cap><h2 id="ob-extra-guidance-title">About deployment setup</h2>
      <p>The bank controls sources, inference, credentials and activation.</p>
      <div className="ob-extra-guide-items">
        {[["01 / Institution","Define bank identity and approved hosting environment."],["02 / Administrator","Verify bank administrator identity and roles."],["03 / Local AI","Configure an approved internal inference runtime and model policy."],["04 / Authorized sources","Connect scoped, permitted institutional feeds."],["05 / Readiness","Validate system and required controls before activation."]].map(([a,b]) => <div key={a}><strong>{a}</strong><p>{b}</p></div>)}
      </div>
    </section>
  </div>;
}

const identityChecks = [
  ["Identity authentication", "Failed", "bad"],
  ["Administrator group / role", "Not tested", "pending"],
  ["Protected resource permission", "Not tested", "pending"],
  ["Audit record creation", "Not tested", "pending"],
] as const;
const coreChecks = ["Application service", "Local storage / persistence", "Administrator authorization", "Security and policy boundary", "Audit persistence"] as const;
const capabilityChecks = [
  ["Institutional knowledge", "Configured · processing review needed", "Limited"],
  ["Operational intelligence", "Gateway telemetry received", "Source verification needed"],
  ["Customer intelligence", "Source records present", "Review processing status"],
  ["Investigation reconciliation", "Approved, feed disconnected", "Unavailable"],
  ["Local AI inference", "Model configured, test not run", "Unavailable"],
] as const;

export function OnboardingOutcomeScreen({ outcome }: { outcome: SetupValidationResult }) {
  const isIdentity = outcome.kind === "identity_binding_failed";
  const isAi = outcome.kind === "local_ai_unavailable";
  const isLimited = outcome.kind === "core_ready_limited";
  const isActivated = outcome.kind === "activated";
  const step = isIdentity ? 2 : isAi ? 3 : 5;
  return <SetupLayout activeStep={step} completed={isActivated} heading={
    isIdentity ? "Establish authorized administrators" : isAi ? "Configure bank-local intelligence" : isLimited ? "Verify readiness before activation" : "Veriq deployment activated"
  } description={isIdentity ? "Bind institutional identities and verify privileged access." : isAi ? "Configure an institution-approved internal inference runtime." : isLimited ? "Core readiness and intelligence capability availability are separate." : "Core installation is ready for authorized access."}>
    {isIdentity && <>
      <div className="ob-section-heading"><h2>Institutional identity configuration</h2></div>
      <div className="ob-extra-two">
        <Box><Cap>ADMINISTRATOR ACCESS · BINDING NOT VERIFIED</Cap>
          <Facts><Item label="IDENTITY PROVIDER">Institution OIDC / SSO</Item><Item label="IDENTITY ISSUER">Issuer does not match approved IdP</Item><Item label="ADMINISTRATOR IDENTITY">admin@cedar.bank.internal</Item><Item label="REQUIRED PRIVILEGED ROLE">VERIQ_PLATFORM_ADMIN</Item><Item label="GROUP MAPPING">veriq-platform-admins → admin role</Item></Facts>
          <div className="ob-actions"><DevAction action="Retry validation" /><Link className="ob-button" href="/onboarding">Edit configuration</Link></div>
        </Box>
        <Box><Cap>ACCESS CONTROL CONTRACT</Cap><Facts><Item label="AUTHENTICATION METHOD">Institution-approved identity provider</Item><Item label="SUBJECT IDENTITY">Authenticated principal</Item><Item label="PRIVILEGED ROLE">Explicit bank policy grant</Item><Item label="SESSION AUTHORIZATION">Per protected action</Item><Item label="AUDIT REQUIREMENT">Actor, decision, source and time</Item></Facts><StateNote mode="error">Identity assertion rejected. Review issuer and role mapping.</StateNote></Box>
      </div>
      <div className="ob-section-heading"><h2>Validation, failure and retry</h2></div>
      <Box><Cap>AUTHENTICATION AND AUTHORIZATION</Cap><div className="ob-extra-lines">{identityChecks.map(([a,b,c])=><Line key={a} label={a} value={b} state={c} />)}</div><StateNote mode="error">{"code" in outcome ? outcome.code : "IDP_ISSUER_MISMATCH"} · {outcome.description}</StateNote></Box>
      <Box className="ob-extra-footer"><span>IDENTITY BINDING REJECTED</span><Link href="/onboarding" className="ob-button">Back to administrator setup</Link><button disabled className="ob-button ob-button-primary" type="button">Continue to local AI</button></Box>
    </>}
    {isAi && <>
      <div className="ob-section-heading"><h2>Local inference and policy configuration</h2></div>
      <div className="ob-extra-two"><Box><Cap>BANK-APPROVED LOCAL MODEL</Cap><Facts><Item label="INFERENCE RUNTIME">Institution-hosted inference server</Item><Item label="PRIVATE ENDPOINT">Internal endpoint</Item><Item label="APPROVED MODEL PROFILE">Institution-selected local model</Item><Item label="MODEL VERSION">Not confirmed</Item><Item label="MODEL APPROVAL">Not validated</Item><Item label="EXTERNAL FALLBACK">Disabled</Item></Facts></Box>
        <Box><Cap>INSTITUTION-BOUND INFERENCE</Cap><Facts><Item label="HOST BOUNDARY">Internal bank-controlled network</Item><Item label="SERVICE APPROVAL">Bank AI governance</Item><Item label="DATA SCOPE">Authorized source scopes</Item><Item label="EVIDENCE INTEGRITY">Preserve original references</Item></Facts></Box></div>
      <div className="ob-section-heading"><h2>Inference test sequence and result</h2></div>
      <Box><div className="ob-extra-pipeline">{["01 · Endpoint reached","02 · Model answered","03 · Response validated","04 · Policy and audit"].map((x,i)=><div key={x}><Cap>{x}</Cap><p>{i===0?"Failed": "Not tested"}</p></div>)}</div><StateNote mode="error">{"code" in outcome ? outcome.code : "INFERENCE_ENDPOINT_UNAVAILABLE"} · {outcome.description}</StateNote><div className="ob-actions"><DevAction action="Retry last test" /><Link href="/onboarding" className="ob-button">Edit model configuration</Link></div></Box>
      <Box className="ob-extra-footer"><span>LOCAL INFERENCE UNAVAILABLE</span><Link href="/onboarding" className="ob-button">Return to setup</Link></Box>
    </>}
    {(isLimited || isActivated) && <>
      {isLimited && <div className="ob-section-heading"><h2>Readiness evidence and activation gate</h2><p>Required installation checks passed; some intelligence capabilities remain limited.</p></div>}
      <div className="ob-extra-summary">
        {isLimited ? <><Metric label="CORE INSTALLATION" value="Ready" hint="Backend-verified required checks" /><Metric label="ADMINISTRATOR" value="Verified" hint="Authorized access" /><Metric label="OPTIONAL SOURCES" value="Limited" hint="Capability checks continue" /></>
          : <><Metric label="ACTIVATION RECORD" value="Activated" hint="Backend-confirmed activation" /><Metric label="ADMINISTRATOR" value="Verified" hint="Institution policy" /><Metric label="CORE SERVICES" value="Ready" hint="Service and storage checks" /></>}
      </div>
      <div className="ob-section-heading"><h2>{isLimited ? "Core installation readiness" : "Core Veriq installation ready"}</h2></div>
      <div className="ob-extra-two"><Box><div className="ob-extra-lines">{coreChecks.map(x=><Line key={x} label={x} value="Passed" state="ok" />)}</div></Box>
        <Box><Cap>ACTIVATION GATE</Cap><Facts><Item label="CORE INSTALLATION">Ready</Item><Item label="ADMINISTRATOR ACCESS">Verified</Item><Item label="REQUIRED SERVICES">Passed</Item><Item label="OPTIONAL SOURCES">Limited capabilities permitted</Item><Item label="FINAL DECISION">{isActivated?"Activated":"Backend eligible"}</Item></Facts></Box></div>
      <div className="ob-section-heading"><h2>{isLimited ? "Intelligence capability readiness" : "Continue after activation"}</h2></div>
      {isLimited ? <Box><div className="ob-extra-lines">{capabilityChecks.map(([a,b,c])=><div key={a} className="ob-extra-capability"><strong>{a}</strong><span>{b}</span><span>{c}</span></div>)}</div></Box> : <Box><Cap>WHAT HAPPENS AFTER ACTIVATION</Cap><h3>Start building institutional knowledge</h3><p>Continue approved source acquisition, review knowledge extraction, and verify operational and customer evidence availability.</p><Facts><Item label="AI INFERENCE">Limited · local test required</Item><Item label="INVESTIGATION RECONCILIATION">Unavailable · optional connector</Item></Facts></Box>}
      <Box className="ob-extra-footer"><Cap>{isActivated ? "VERIQ ACTIVATED" : "CORE READY · OPTIONAL CAPABILITIES LIMITED"}</Cap><div className="ob-extra-buttons">
        <Link className="ob-button" href="/onboarding">Back to setup</Link>
        {isActivated ? <><Link className="ob-button ob-button-primary" href="/">Enter intelligence workspace <ArrowRight size={15}/></Link><Link href="/data-sources" className="ob-button">Begin knowledge onboarding</Link><Link href="/administration/system-health" className="ob-button">Review system health</Link></>
          : <><DevAction action="Run readiness checks" /><button className="ob-button ob-button-primary" disabled type="button">Activate Veriq</button></>}
      </div></Box>
    </>}
  </SetupLayout>;
}

