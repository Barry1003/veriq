"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import {
  INITIAL_ONBOARDING_DRAFT,
  ONBOARDING_STEPS,
  type OnboardingDraft,
  type SetupStage,
  type SourceId,
} from "@/types/onboarding";
import { getUnverifiedReadiness } from "@/services/onboarding-readiness";

const PAGE_TITLES: Record<SetupStage, string> = {
  1: "Configure your institution's Veriq",
  2: "Establish authorized administrators",
  3: "Configure bank-local intelligence",
  4: "Authorize institutional data sources",
  5: "Verify readiness before activation",
};
const PAGE_DESCRIPTIONS: Record<SetupStage, string> = {
  1: "A guided bank-hosted deployment setup. Authorization, inference policy and evidence delivery are checked independently.",
  2: "Bind institutional identities and verify privileged access before anyone can administer Veriq.",
  3: "Approve an internal inference runtime and test model behavior without sending bank data to unapproved providers.",
  4: "Choose source categories, configure bank-owned connectors and inspect their actual data delivery stages.",
  5: "Differentiate core installation readiness from the availability of each intelligence capability.",
};
const STAGE_CHECKS = [
  [
    "01 · Institution profile",
    "Confirm host identity, region, deployment boundary",
  ],
  [
    "02 · Administrator access",
    "Bind authorized admin identity and privileged role",
  ],
  ["03 · Local AI controls", "Approve model, isolation and inference test"],
  [
    "04 · Source authorization",
    "Approve source classes, scopes and connector mapping",
  ],
  [
    "05 · Deployment readiness",
    "Verify service, source, security and audit health",
  ],
] as const;
const SOURCE_CATEGORIES: ReadonlyArray<{
  id: SourceId;
  title: string;
  description: string;
  example: string;
  purpose: string;
  action: string;
}> = [
  {
    id: "knowledge",
    title: "Institutional Knowledge",
    description:
      "Documents, service inventories, routing configurations, dependencies and historical procedures",
    example: "KNW-ROUTE-01 · synthetic example",
    purpose: "Knowledge extraction and reviewed relations",
    action: "Configure connector",
  },
  {
    id: "operations",
    title: "Operational Monitoring",
    description:
      "Service telemetry, payment-route observations, gateway metrics and operational events",
    example: "OPS-FEED-02 · synthetic example",
    purpose: "Anomaly candidates without customer complaints",
    action: "Configure connector",
  },
  {
    id: "customer",
    title: "Customer Experience",
    description:
      "In-app complaints, support mail, contact-centre records and branch interactions",
    example: "CX-FEED-03 · synthetic example",
    purpose: "Customer patterns and support evidence",
    action: "Configure connector",
  },
  {
    id: "reconciliation",
    title: "Investigation Evidence",
    description: "Authorized transaction-state and reconciliation sources",
    example: "RCN-FEED-04 · synthetic example",
    purpose: "Final transaction outcome remains unknown",
    action: "Configure reconciliation",
  },
];
const CONNECTOR_STAGES = [
  ["Configured", "Connector values saved", "Configured but not approved"],
  [
    "Authorized",
    "Institution approves the requested scope",
    "Authorized but disconnected",
  ],
  [
    "Connected",
    "Connectivity or handshake test passes",
    "Connected but no events yet",
  ],
  [
    "Receiving",
    "Source record or event actually arrives",
    "Receives record that fails validation",
  ],
  [
    "Processing",
    "Record mapping and processing run",
    "Processing errors possible",
  ],
  [
    "Healthy / Failed / Stale",
    "Operational freshness and result checks",
    "Must use actual telemetry, not guess",
  ],
] as const;
const CORE_READINESS = [
  ["Application service", "Authenticated service-health probe required"],
  ["Local storage / persistence", "Read/write and recovery check required"],
  [
    "Administrator authorization",
    "Role binding and resource permission validated",
  ],
  [
    "Security and policy boundary",
    "Internal network, secrets and scoped access",
  ],
  ["Audit persistence", "Authorized event write/read verification"],
] as const;
const CAPABILITY_READINESS = [
  [
    "Institutional knowledge",
    "Source selection draft · processing not verified",
    "Unverified",
  ],
  [
    "Operational intelligence",
    "No authenticated telemetry received by this preview",
    "Unverified",
  ],
  [
    "Customer intelligence",
    "No authorized interaction feed verified",
    "Unverified",
  ],
  [
    "Investigation reconciliation",
    "Optional source · state not verified",
    "Unavailable / unknown",
  ],
  [
    "Local AI inference",
    "Runtime draft · permitted test not executed",
    "Unverified",
  ],
] as const;

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="ob-section-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`ob-panel ${className}`}>{children}</section>;
}
function Meta({ children }: { children: ReactNode }) {
  return <p className="ob-meta">{children}</p>;
}
function Notice({
  children,
  subtle = false,
}: {
  children: ReactNode;
  subtle?: boolean;
}) {
  return (
    <div
      className={`ob-notice${subtle ? " ob-notice-subtle" : ""}`}
      role="note"
    >
      {!subtle && <Info size={19} strokeWidth={1.75} aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}
function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ob-pair">
      <span className="ob-meta">{label}</span>
      <div>{children}</div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder = "",
  readOnly = false,
  help,
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  help?: string;
  required?: boolean;
  error?: string;
}) {
  const id = useId();
  const describedBy =
    [help ? `${id}-help` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="ob-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        onChange={
          onChange ? (event) => onChange(event.currentTarget.value) : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      {help && (
        <p className="ob-help" id={`${id}-help`}>
          {help}
        </p>
      )}
      {error && (
        <p className="ob-field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
function Button({
  children,
  onClick,
  kind = "secondary",
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`ob-button ob-button-${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function GridTable({
  headers,
  rows,
}: {
  headers: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="ob-table-scroll">
      <table className="ob-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((value, cell) => (
                <td key={cell}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Status({ children }: { children: ReactNode }) {
  return <span className="ob-status">{children}</span>;
}

export function OnboardingWizard() {
  const [step, setStep] = useState<SetupStage>(1);
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_ONBOARDING_DRAFT);
  const [feedback, setFeedback] = useState("");
  const [showGuidance, setShowGuidance] = useState(false);
  const [stepOneAttempted, setStepOneAttempted] = useState(false);
  const readiness = getUnverifiedReadiness();
  const stepOneErrors = {
    institutionName:
      draft.institutionName.trim().length > 1
        ? ""
        : "Enter the institution name.",
    deploymentLabel:
      draft.deploymentLabel.trim().length > 1
        ? ""
        : "Enter a deployment label.",
  };
  const institutionReady =
    !stepOneErrors.institutionName && !stepOneErrors.deploymentLabel;

  function changeField<K extends keyof OnboardingDraft>(
    field: K,
    value: OnboardingDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFeedback("");
  }
  function previewStep(next: SetupStage) {
    if (next > 1 && !institutionReady) {
      setStepOneAttempted(true);
      setFeedback(
        "Complete the institution name and deployment label before continuing.",
      );
      return;
    }
    setStep(next);
    setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function continueFromStepOne() {
    setStepOneAttempted(true);
    if (!institutionReady) {
      setFeedback(
        "Complete the institution name and deployment label before continuing.",
      );
      return;
    }
    previewStep(2);
  }
  function saveLocalDraft() {
    try {
      sessionStorage.setItem(
        "veriq-preview-institution-v1",
        JSON.stringify({
          institutionName: draft.institutionName,
          deploymentLabel: draft.deploymentLabel,
          hostingBoundary: draft.hostingBoundary,
          region: draft.region,
        }),
      );
      setFeedback(
        "Institution profile draft saved in this browser session. No verification or deployment occurred.",
      );
    } catch {
      setFeedback(
        "Browser session storage is unavailable. The draft remains in this page until you close it.",
      );
    }
  }
  function restoreLocalDraft() {
    try {
      const raw = sessionStorage.getItem("veriq-preview-institution-v1");
      if (!raw) {
        setFeedback(
          "There is no saved institution draft in this browser session.",
        );
        return;
      }
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== "object") throw new Error("Invalid draft");
      const obj = saved as Record<string, unknown>;
      const keys = [
        "institutionName",
        "deploymentLabel",
        "hostingBoundary",
        "region",
      ] as const;
      if (!keys.every((key) => typeof obj[key] === "string"))
        throw new Error("Invalid fields");
      setDraft((prev) => ({
        ...prev,
        ...Object.fromEntries(keys.map((key) => [key, obj[key]])),
      }));
      setFeedback(
        "Institution profile draft restored. Security checks remain unverified.",
      );
    } catch {
      setFeedback(
        "Could not restore the saved draft. No configuration was applied.",
      );
    }
  }
  function backendUnavailable(which: string) {
    setFeedback(
      `${which} requires an authorized backend endpoint and real evidence. No validation was performed, and access remains locked.`,
    );
  }

  return (
    <div className="ob-root">
      <header className="ob-topbar">
        <div className="ob-topbar-left">
          <Image
            className="ob-brand-logo"
            src="/images/veriq-brand-cropped.png"
            alt="Veriq"
            width={109}
            height={38}
            priority
          />
          <span className="ob-topbar-institution">Cedar Bank</span>
          <span className="ob-topbar-path">
            / &nbsp; First-run deployment setup
          </span>
        </div>
        <div className="ob-topbar-right">
          <span className="ob-demo-label">SYNTHETIC DEMO</span>
          <Button onClick={() => setShowGuidance((value) => !value)}>
            Setup guidance
          </Button>
        </div>
      </header>
      <main className="ob-content">
        <div className="ob-overline">
          VERIQ &nbsp;/&nbsp; FIRST-RUN DEPLOYMENT
        </div>
        <h1>{PAGE_TITLES[step]}</h1>
        <p className="ob-page-description">{PAGE_DESCRIPTIONS[step]}</p>
        <Notice>
          <p>
            <strong>DESIGN PREVIEW</strong> — Examples below are not executed
            deployment checks. All security and readiness decisions require the
            institution&apos;s backend.
          </p>
          <p>
            Institution-controlled identity, network scope and inference are
            mandatory. A saved form never grants authority.
          </p>
        </Notice>
        {showGuidance && (
          <Notice subtle>
            <strong>Setup guidance</strong>
            <p>
              You can preview all five Figma stages using the progress cards.
              Preview navigation does not bypass live authentication, source
              authorization or backend activation gates. Never enter passwords,
              secrets or actual customer data.
            </p>
          </Notice>
        )}
        <div className="ob-progress-heading">
          <h2>Deployment setup</h2>
          <span>
            Step {step} of 5 · {ONBOARDING_STEPS[step - 1].description}
          </span>
        </div>
        <nav className="ob-steps" aria-label="Preview onboarding steps">
          {ONBOARDING_STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ob-step${step === item.id ? " is-current" : ""}`}
              aria-current={step === item.id ? "step" : undefined}
              onClick={() => previewStep(item.id)}
            >
              <strong>
                {String(item.id).padStart(2, "0")} / {item.label}
              </strong>
              <span>
                {step === item.id
                  ? "Current preview step"
                  : "Preview this step"}
              </span>
            </button>
          ))}
        </nav>
        <p className="ob-preview-hint">
          PROTOTYPE PREVIEW · Select any numbered step to inspect its design.
          Live setup remains permission-gated.
        </p>

        {step === 1 && (
          <>
            <SectionHeading
              title="Environment configuration"
              description="Define the institution and approved local environment before activating any connector."
            />
            <div className="ob-two-col">
              <Panel>
                <Meta>INSTITUTION DETAILS / NOT YET VALIDATED</Meta>
                <div className="ob-fields">
                  <Field
                    label="INSTITUTION NAME"
                    required
                    error={
                      stepOneAttempted
                        ? stepOneErrors.institutionName
                        : undefined
                    }
                    value={draft.institutionName}
                    onChange={(value) => changeField("institutionName", value)}
                  />
                  <Field
                    label="DEPLOYMENT LABEL"
                    required
                    error={
                      stepOneAttempted
                        ? stepOneErrors.deploymentLabel
                        : undefined
                    }
                    value={draft.deploymentLabel}
                    onChange={(value) => changeField("deploymentLabel", value)}
                  />
                  <div className="ob-field">
                    <label htmlFor="ob-host">HOSTING BOUNDARY</label>
                    <select
                      id="ob-host"
                      value={draft.hostingBoundary}
                      onChange={(e) =>
                        changeField("hostingBoundary", e.currentTarget.value)
                      }
                    >
                      <option>Institution-managed environment</option>
                      <option>Bank-owned data centre</option>
                      <option>Institution-controlled private cloud</option>
                    </select>
                  </div>
                  <div className="ob-field">
                    <label htmlFor="ob-region">REGION AND TIME ZONE</label>
                    <select
                      id="ob-region"
                      value={draft.region}
                      onChange={(e) =>
                        changeField("region", e.currentTarget.value)
                      }
                    >
                      <option>Africa/Lagos · WAT</option>
                      <option>Africa/Accra · GMT</option>
                      <option>UTC</option>
                    </select>
                  </div>
                  <Field
                    label="ADMINISTRATION OWNER"
                    value="Pending secure identity binding"
                    readOnly
                  />
                </div>
                <p className="ob-footnote">
                  Institution fields are local deployment configuration, not a
                  bank connection or identity verification result.
                </p>
              </Panel>
              <Panel className="ob-side-panel">
                <Meta>SECURE DEPLOYMENT BOUNDARY</Meta>
                <h3>Institution-owned infrastructure</h3>
                <Pair label="EXTERNAL EVIDENCE RELAY">Not assumed</Pair>
                <Pair label="INFERENCE ROUTING">
                  Bank-local policy required
                </Pair>
                <Pair label="CONNECTOR PERMISSIONS">Not established</Pair>
                <Pair label="ADMINISTRATOR IDENTITY">Not yet verified</Pair>
                <Pair label="SECRET HANDLING">
                  Bank-approved secret storage
                </Pair>
                <Notice subtle>
                  Never unlock the intelligence workspace from a filled form
                  alone. Backend authorization and health gates are required.
                </Notice>
              </Panel>
            </div>
            <SectionHeading
              title="Readiness gates for subsequent steps"
              description="Each stage requires its own evidence. Completing one does not imply the next is authorized or healthy."
            />
            <Panel>
              <GridTable
                headers={[
                  "SETUP STAGE",
                  "REQUIRED AUTHORIZED CHECK",
                  "CURRENT STATE",
                ]}
                rows={STAGE_CHECKS.map(([name, check], index) => [
                  name,
                  check,
                  <Status key={name}>
                    {index === 0 ? "Draft · not validated" : "Not started"}
                  </Status>,
                ])}
              />
              <p className="ob-footnote">
                Real readiness evidence is generated by institution-controlled
                services; this design does not execute configuration checks.
              </p>
            </Panel>
            <Panel className="ob-action-panel">
              <Meta>CURRENT STEP / INSTITUTION PROFILE</Meta>
              <p>
                Save locally as an incomplete draft or advance to administrator
                authorization.
              </p>
              <div className="ob-actions">
                <Button onClick={saveLocalDraft}>Save setup draft</Button>
                <Button onClick={restoreLocalDraft}>Restore draft</Button>
                <Button kind="primary" onClick={continueFromStepOne}>
                  Continue to admin access <ArrowRight size={16} />
                </Button>
              </div>
              <Notice subtle>
                The final activation action belongs only to Step 5 after
                authenticated setup validation. A saved draft must not unlock
                Veriq.
              </Notice>
            </Panel>
          </>
        )}

        {step === 2 && (
          <>
            <SectionHeading
              title="Institutional identity configuration"
              description="Only a verified administrator from an approved identity source can change Veriq settings."
            />
            <div className="ob-two-col">
              <Panel>
                <Meta>ADMINISTRATOR ACCESS · BINDING NOT VERIFIED</Meta>
                <h3>Authentication provider</h3>
                <div className="ob-fields">
                  <Field
                    label="IDENTITY PROVIDER"
                    value={draft.identityProvider}
                    onChange={(value) => changeField("identityProvider", value)}
                  />
                  <Field
                    label="IDENTITY ISSUER"
                    value={draft.identityIssuer}
                    placeholder="https://identity.bank.internal · example only"
                    onChange={(value) => changeField("identityIssuer", value)}
                  />
                  <Field
                    label="ADMINISTRATOR IDENTITY"
                    value={draft.administratorIdentity}
                    placeholder="admin@cedar.example · unverified"
                    onChange={(value) =>
                      changeField("administratorIdentity", value)
                    }
                  />
                  <Field
                    label="REQUIRED PRIVILEGED ROLE"
                    value={draft.privilegedRole}
                    onChange={(value) => changeField("privilegedRole", value)}
                  />
                  <Field
                    label="CLAIM / GROUP MAPPING"
                    value={draft.groupMapping}
                    placeholder="veriq-platform-admins → admin role · draft"
                    onChange={(value) => changeField("groupMapping", value)}
                  />
                  <Field
                    label="CREDENTIALS"
                    value="Managed by bank-side secret store; never entered in plaintext"
                    readOnly
                  />
                </div>
                <Notice subtle>
                  Typing an administrator name, email or role does not authorize
                  them. Identity binding and policy validation must succeed
                  server-side.
                </Notice>
                <div className="ob-actions">
                  <Button
                    kind="primary"
                    onClick={() =>
                      backendUnavailable("Administrator identity binding")
                    }
                  >
                    Validate administrator access
                  </Button>
                  <Button
                    onClick={() =>
                      setFeedback(
                        "Administrator configuration remains only in this tab. It was not submitted, saved as credentials, or verified.",
                      )
                    }
                  >
                    Keep draft in this tab
                  </Button>
                </div>
              </Panel>
              <Panel className="ob-side-panel">
                <Meta>ACCESS CONTROL CONTRACT</Meta>
                <h3>Institution-controlled administration</h3>
                <Pair label="AUTHENTICATION METHOD">
                  Bank identity provider or supported local auth
                </Pair>
                <Pair label="SUBJECT IDENTITY">
                  Verified by authenticated principal
                </Pair>
                <Pair label="PRIVILEGED ROLE">Explicit bank policy grant</Pair>
                <Pair label="SESSION AUTHORIZATION">
                  Enforced for every protected action
                </Pair>
                <Pair label="AUDIT REQUIREMENT">
                  Actor, decision, source and time recorded
                </Pair>
                <Notice subtle>
                  <Meta>DEMONSTRATION STATE</Meta>No identity binding test has
                  run. Next-step access remains blocked until verified.
                </Notice>
              </Panel>
            </div>
            <SectionHeading
              title="Validation, failure and retry"
              description="Authentication and authorization are separate validations."
            />
            <Panel>
              <Meta>
                AUTHENTICATION AND AUTHORIZATION ARE SEPARATE VALIDATIONS
              </Meta>
              <GridTable
                headers={["REQUIRED CHECK", "STATE", "EVIDENCE REQUIRED"]}
                rows={[
                  [
                    "Identity authentication",
                    <Status key="a">Not tested</Status>,
                    "Must receive verifiable identity-provider assertion",
                  ],
                  [
                    "Administrator group / role",
                    <Status key="b">Not tested</Status>,
                    "Check bank-approved privileged policy binding",
                  ],
                  [
                    "Protected resource permission",
                    <Status key="c">Not tested</Status>,
                    "Backend evaluates actual administration permission",
                  ],
                  [
                    "Audit record creation",
                    <Status key="d">Not tested</Status>,
                    "Write required authorization decision audit evidence",
                  ],
                ]}
              />
              <p className="ob-footnote">
                If a check fails: show the returned error, retain draft
                configuration and offer Retry. Never grant authority
                automatically.
              </p>
            </Panel>
            <Panel className="ob-action-panel">
              <Meta>
                CURRENT STATUS: NOT VALIDATED · NEXT STAGE REMAINS GATED
              </Meta>
              <div className="ob-actions ob-actions-split">
                <div className="ob-actions">
                  <Button onClick={() => previewStep(1)}>
                    <ArrowLeft size={16} /> Back to institution
                  </Button>
                  <Button
                    onClick={() =>
                      backendUnavailable("Administrator validation")
                    }
                  >
                    Retry validation
                  </Button>
                </div>
                <Button kind="primary" disabled>
                  Continue to local AI <LockKeyhole size={15} />
                </Button>
              </div>
              <p className="ob-footnote">
                To inspect the Step 3 design without claiming authorization,
                choose its card above.
              </p>
            </Panel>
          </>
        )}

        {step === 3 && (
          <>
            <SectionHeading
              title="Local inference and policy configuration"
              description="The selected runtime remains unverified until a permitted inference request is executed and validated."
            />
            <div className="ob-two-col">
              <Panel>
                <Meta>BANK-APPROVED LOCAL MODEL · CONFIGURATION DRAFT</Meta>
                <div className="ob-fields">
                  <Field
                    label="INFERENCE RUNTIME TYPE"
                    value={draft.inferenceRuntime}
                    onChange={(value) => changeField("inferenceRuntime", value)}
                  />
                  <Field
                    label="PRIVATE INFERENCE ENDPOINT"
                    value={draft.inferenceEndpoint}
                    placeholder="https://inference.bank.internal · placeholder"
                    onChange={(value) =>
                      changeField("inferenceEndpoint", value)
                    }
                  />
                  <Field
                    label="APPROVED MODEL PROFILE"
                    value={draft.modelProfile}
                    onChange={(value) => changeField("modelProfile", value)}
                  />
                  <Field
                    label="MODEL VERSION / IDENTIFIER"
                    value={draft.modelVersion}
                    placeholder="Version must be provided by runtime"
                    onChange={(value) => changeField("modelVersion", value)}
                  />
                  <Field
                    label="MODEL APPROVAL STATE"
                    value="Not yet validated against bank policy"
                    readOnly
                  />
                  <Field
                    label="DATA-PROCESSING POLICY"
                    value="Authorized source scope and bank-local-only inference"
                    readOnly
                  />
                  <Field
                    label="EXTERNAL FALLBACK POLICY"
                    value="Disabled · fail closed to unapproved providers"
                    readOnly
                  />
                </div>
                <div className="ob-muted-panel">
                  <Meta>ALLOWED AI TASKS · POLICY-SCOPED</Meta>
                  <p>
                    Knowledge extraction &nbsp; · &nbsp; Customer classification
                  </p>
                  <p>
                    Investigation hypotheses &nbsp; · &nbsp; Evidence summaries
                  </p>
                </div>
                <div className="ob-actions">
                  <Button
                    onClick={() =>
                      setFeedback(
                        "The local model draft remains in this tab. It was not sent to an inference provider.",
                      )
                    }
                  >
                    Save model draft
                  </Button>
                  <Button
                    kind="primary"
                    onClick={() =>
                      backendUnavailable("Local inference testing")
                    }
                  >
                    Test local inference
                  </Button>
                </div>
              </Panel>
              <Panel className="ob-side-panel">
                <Meta>INSTITUTION-BOUND AI INFERENCE</Meta>
                <h3>Where processing can happen</h3>
                <Pair label="HOST BOUNDARY">
                  Internal bank-controlled network
                </Pair>
                <Pair label="SERVICE APPROVAL">
                  Bank AI governance required
                </Pair>
                <Pair label="IDENTITY AND SCOPE">
                  Enforced for each inference request
                </Pair>
                <Pair label="OUTBOUND NETWORK">
                  External vendor fallback explicitly disabled
                </Pair>
                <Pair label="EVIDENCE INTEGRITY">
                  Original source references preserved
                </Pair>
                <Pair label="MODEL INDEPENDENCE">
                  Approved model can be replaced
                </Pair>
                <Notice subtle>
                  If AI is unavailable, the bank may continue with limited
                  capabilities only when backend policy permits. Do not silently
                  route data to cloud AI.
                </Notice>
              </Panel>
            </div>
            <SectionHeading
              title="Inference test sequence and result"
              description="A real permitted test must produce a bank-controlled response before inference is considered available."
            />
            <Panel>
              <Meta>ACTUAL TEST PIPELINE · NO TEST EXECUTED</Meta>
              <div className="ob-pipeline">
                {[
                  "01 · Endpoint reached",
                  "02 · Model answered",
                  "03 · Response validated",
                  "04 · Policy and audit verified",
                ].map((label) => (
                  <div key={label}>
                    <span>{label}</span>
                    <Status>Not tested</Status>
                  </div>
                ))}
              </div>
              <div className="ob-muted-panel">
                <Meta>RESULT / NOT TESTED</Meta>
                <p>
                  Model reachability: Unknown &nbsp; · &nbsp; Inference output:
                  None &nbsp; · &nbsp; Latency: Not measured
                </p>
                <p>
                  If a test fails: expose the returned error, preserve the model
                  configuration, and offer retry or policy-approved degraded
                  operation.
                </p>
              </div>
              <div className="ob-actions">
                <Button
                  kind="primary"
                  onClick={() =>
                    backendUnavailable("Permitted synthetic inference test")
                  }
                >
                  Run permitted synthetic test
                </Button>
                <Button
                  onClick={() => backendUnavailable("Local inference retry")}
                >
                  Retry last test
                </Button>
              </div>
            </Panel>
            <Panel className="ob-action-panel">
              <Meta>
                CURRENT STATUS: MODEL CONFIGURED, INFERENCE NOT VERIFIED
              </Meta>
              <div className="ob-actions ob-actions-split">
                <Button onClick={() => previewStep(2)}>
                  <ArrowLeft size={16} /> Back to administrator
                </Button>
                <Button kind="primary" disabled>
                  Continue to sources <LockKeyhole size={15} />
                </Button>
              </div>
              <p className="ob-footnote">
                For visual preview of Step 4, choose its progress card; live
                progression remains dependent on backend policy.
              </p>
            </Panel>
          </>
        )}

        {step === 4 && (
          <>
            <SectionHeading
              title="Select bank-controlled information sources"
              description="Each feed requires an institution-approved scope; selection alone does not authorize access or prove ingestion."
            />
            <Panel>
              <Meta>SOURCE CATEGORIES · BANK-SIDE PERMISSIONS REQUIRED</Meta>
              <div className="ob-source-list">
                {SOURCE_CATEGORIES.map((source) => (
                  <div key={source.id} className="ob-source">
                    <div className="ob-source-row">
                      <div>
                        <label className="ob-source-label">
                          <input
                            type="checkbox"
                            checked={draft.selectedSources[source.id]}
                            onChange={(e) =>
                              changeField("selectedSources", {
                                ...draft.selectedSources,
                                [source.id]: e.currentTarget.checked,
                              })
                            }
                          />
                          <strong>{source.title}</strong>
                        </label>
                        <p>{source.description}</p>
                        <p className="ob-source-example">
                          {source.example} · access not verified
                        </p>
                        <small>{source.purpose}</small>
                      </div>
                      <details className="ob-connector-details">
                        <summary>{source.action}</summary>
                        <div className="ob-connector-editor">
                          <label htmlFor={`scope-${source.id}`}>
                            Requested source scope (draft only)
                          </label>
                          <input
                            id={`scope-${source.id}`}
                            value={draft.sourceScopes[source.id]}
                            placeholder="Enter an approved scope reference"
                            onChange={(e) =>
                              changeField("sourceScopes", {
                                ...draft.sourceScopes,
                                [source.id]: e.currentTarget.value,
                              })
                            }
                          />
                          <p>
                            Saving a local scope draft does not grant access or
                            connect a feed.
                          </p>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
              <p className="ob-footnote">
                Source selection can proceed with some optional feeds
                unconfigured. Missing capability remains visible at readiness
                review.
              </p>
            </Panel>
            <SectionHeading
              title="Connector lifecycle is not a single badge"
              description="A connection test cannot stand in for source authorization, events received or successful downstream processing."
            />
            <Panel>
              <GridTable
                headers={["STAGE", "EVIDENCE REQUIRED", "EXAMPLE CONDITION"]}
                rows={CONNECTOR_STAGES}
              />
            </Panel>
            <Panel className="ob-action-panel">
              <Meta>CONTINUE WITH LIMITED SOURCES WHEN POLICY PERMITS</Meta>
              <p>
                The readiness screen must list which intelligence pillars have
                valid evidence and which remain unavailable.
              </p>
              <div className="ob-actions ob-actions-split">
                <Button onClick={() => previewStep(3)}>
                  <ArrowLeft size={16} /> Back to local AI
                </Button>
                <Button kind="primary" onClick={() => previewStep(5)}>
                  Preview verification <ArrowRight size={16} />
                </Button>
              </div>
              <p className="ob-footnote">
                This preview transition does not authorize connectors or mark
                the installation ready.
              </p>
            </Panel>
          </>
        )}

        {step === 5 && (
          <>
            <SectionHeading
              title="Readiness evidence and activation gate"
              description="Core installation health and intelligence capability availability are evaluated separately."
            />
            <Notice subtle>
              <Meta>ACTIVATION STATE / NOT VERIFIED</Meta>
              <p>
                Required backend checks have not been executed for this design
                preview. Activation remains unavailable.
              </p>
              <p>
                Missing optional connectors may limit intelligence without
                blocking core installation; missing required security cannot be
                waived.
              </p>
            </Notice>
            <SectionHeading
              title="Core installation readiness"
              description="The required infrastructure and authorization checks control whether installation can activate."
            />
            <div className="ob-two-col ob-readiness-grid">
              <Panel>
                <div className="ob-readiness-list">
                  {CORE_READINESS.map(([name, description]) => (
                    <div className="ob-readiness-row" key={name}>
                      <div>
                        <strong>{name}</strong>
                        <p>{description}</p>
                      </div>
                      <Status>Not verified</Status>
                    </div>
                  ))}
                </div>
                <p className="ob-footnote">
                  Blocking checks cannot be bypassed through the UI. Backend
                  returns the gate decision.
                </p>
              </Panel>
              <Panel className="ob-side-panel">
                <Meta>ACTIVATION GATE</Meta>
                <h3>Core installation: Unknown</h3>
                <Pair label="ACTIVATION PERMISSION">
                  Admin identity verified by bank policy
                </Pair>
                <Pair label="REQUIRED SERVICES">
                  Must pass live service and storage checks
                </Pair>
                <Pair label="OPTIONAL SOURCES">Warnings may remain</Pair>
                <Pair label="INFERENCE UNAVAILABILITY">
                  Degraded mode only if policy permits
                </Pair>
                <Pair label="FINAL DECISION">
                  Comes from backend readiness result
                </Pair>
                <Notice subtle>
                  Successful setup forms alone cannot activate the application.
                </Notice>
              </Panel>
            </div>
            <SectionHeading
              title="Intelligence capability readiness"
              description="A source may be connected but empty, or receiving but failing processing; reflect those partial states honestly."
            />
            <Panel>
              <GridTable
                headers={[
                  "CAPABILITY",
                  "CURRENT FRONTEND EVIDENCE",
                  "READINESS",
                ]}
                rows={CAPABILITY_READINESS.map(([title, desc, state]) => [
                  title,
                  desc,
                  <Status key={title}>{state}</Status>,
                ])}
              />
            </Panel>
            <Panel className="ob-action-panel">
              <Meta>
                ACTIVATION INACTIVE UNTIL BACKEND CONFIRMS CORE READINESS
              </Meta>
              <p>
                Re-run failed/pending checks, inspect real responses and
                authorize activation only after required checks pass.
              </p>
              <div className="ob-actions ob-actions-split">
                <div className="ob-actions">
                  <Button onClick={() => previewStep(4)}>
                    <ArrowLeft size={16} /> Back to bank sources
                  </Button>
                  <Button
                    kind="primary"
                    onClick={() => backendUnavailable("Readiness verification")}
                  >
                    Run readiness checks
                  </Button>
                </div>
                <Button disabled={!readiness.activationAllowed}>
                  Activate Veriq <LockKeyhole size={15} />
                </Button>
              </div>
              <Notice subtle>
                After verified activation, authorized staff enter V10.
                Incomplete intelligence setup remains visible and may be
                completed later.
              </Notice>
            </Panel>
          </>
        )}
        {feedback && (
          <div className="ob-feedback" role="status">
            <ShieldAlert size={18} aria-hidden="true" />
            {feedback}
          </div>
        )}
        <footer className="ob-footer">
          <CheckCircle2 size={15} aria-hidden="true" /> DESIGN PREVIEW · This
          screen uses synthetic examples. No live backend checks, administrator
          authorization, source connection, or activation has occurred.
        </footer>
      </main>
    </div>
  );
}
