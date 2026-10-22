"use client";

import { useState, type ReactNode } from "react";
import { Activity, CircleHelp, Database, Info, Network } from "lucide-react";
import type {
  AccessDecision,
  AccessPoliciesSnapshot,
  AccessRole,
  AccessRoleId,
} from "@/types/access-policies";

type RoleContext = { label: string; value: string };

const decisionLabels: Record<AccessDecision, string> = {
  allow: "Allow",
  deny: "Deny",
  scoped: "Scoped",
};

function Metric({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="ap-panel ap-metric">
      <div className="ap-metric-top">
        <span>{title}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="ap-section">
      <header className="ap-section-heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

function MiniDefinition({ label, value }: RoleContext) {
  return (
    <div className="ap-mini-definition">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function analystDefinitions(snapshot: AccessPoliciesSnapshot): RoleContext[] {
  const context = snapshot.analystContext;
  return [
    { label: "CASE ACCESS", value: context.caseAccess },
    { label: "KNOWLEDGE EXPLORER", value: context.knowledgeExplorer },
    { label: "OPERATIONAL MONITORING", value: context.operationalMonitoring },
    { label: "CONNECTOR CONFIGURATION", value: context.connectorConfiguration },
    { label: "ACCESS POLICY CHANGES", value: context.accessPolicyChanges },
    { label: "HUMAN CAUSE VALIDATION", value: context.humanCauseValidation },
  ];
}

function roleDefinitions(
  role: AccessRole,
  snapshot: AccessPoliciesSnapshot,
): RoleContext[] {
  if (role.id === "investigation-analyst") return analystDefinitions(snapshot);
  return [
    { label: "ALLOWED WORK · ROLE SUMMARY", value: role.allowedWork },
    { label: "GOVERNANCE LIMIT", value: role.governanceLimit },
    ...snapshot.capabilities.map((capability) => ({
      label: capability.label.toUpperCase(),
      value: decisionLabels[capability.decisions[role.id]],
    })),
  ];
}

const roleShortNames: Record<AccessRoleId, string> = {
  "platform-admin": "ADMIN",
  "investigation-analyst": "ANALYST",
  "knowledge-reviewer": "REVIEWER",
  "audit-observer": "AUDITOR",
};

export function AccessPoliciesScreen({
  snapshot,
}: {
  snapshot: AccessPoliciesSnapshot;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<AccessRoleId>(
    "investigation-analyst",
  );
  const role =
    snapshot.roles.find((item) => item.id === selectedRoleId) ??
    snapshot.roles[0];
  const actor = snapshot.staff.find(
    (item) => item.id === snapshot.sampleDecision.actorId,
  );

  return (
    <article className="ap-page" aria-labelledby="ap-page-title">
      <div className="ap-page-heading">
        <div>
          <p className="ap-eyebrow">ADMINISTRATION / V06 / GOVERNANCE</p>
          <h1 id="ap-page-title">Access &amp; Policies</h1>
          <p>
            Control institution roles, evidence scopes and privileged
            administrative actions.
          </p>
        </div>
      </div>
      <div className="ap-notice" role="note">
        <Info size={20} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <strong>
            Permissions must be enforced by bank-controlled identity, policy and
            source systems—not by hiding buttons.
          </strong>
          <p>
            Illustrative access directory only. Privileged changes require
            authorization, evidence-scope checks and auditable decisions.
          </p>
        </div>
      </div>
      <Section title="Identity &amp; policy overview">
        <div className="ap-metric-grid">
          <Metric
            title="IDENTITIES"
            value={String(snapshot.staff.length)}
            note="Illustrative authorized staff"
            icon={<Network size={20} strokeWidth={1.75} aria-hidden="true" />}
          />
          <Metric
            title="ACCESS ROLES"
            value={String(snapshot.roles.length)}
            note="Role groups with scoped rights"
            icon={<Database size={20} strokeWidth={1.75} aria-hidden="true" />}
          />
          <Metric
            title="POLICY DECISIONS"
            value="Auditable"
            note="Record allow / deny with reason"
            icon={
              <CircleHelp size={20} strokeWidth={1.75} aria-hidden="true" />
            }
          />
          <Metric
            title="SOURCE ACCESS"
            value="Least-privilege"
            note="Approval and source scope distinct"
            icon={<Activity size={20} strokeWidth={1.75} aria-hidden="true" />}
          />
        </div>
      </Section>
      <Section
        title="Role directory &amp; access scope"
        description="Reviewer privileges, connector administration and source evidence access are intentionally different."
      >
        <div className="ap-split ap-roles-layout">
          <div className="ap-panel ap-role-directory">
            <div
              className="ap-scroll-region"
              role="region"
              aria-label="Illustrative role directory"
              tabIndex={0}
            >
              <table className="ap-table ap-role-table">
                <thead>
                  <tr>
                    <th scope="col">ROLE</th>
                    <th scope="col">ALLOWED WORK</th>
                    <th scope="col">GOVERNANCE LIMIT</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.roles.map((item) => (
                    <tr
                      key={item.id}
                      data-selected={selectedRoleId === item.id}
                    >
                      <td>
                        <button
                          type="button"
                          className="ap-role-picker"
                          aria-pressed={selectedRoleId === item.id}
                          onClick={() => setSelectedRoleId(item.id)}
                        >
                          {item.label}
                        </button>
                      </td>
                      <td>{item.allowedWork}</td>
                      <td>{item.governanceLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ap-help">
              Role assignment is not a substitute for record-level policies and
              audit scope.
            </p>
          </div>
          <aside
            className="ap-panel ap-role-inspector"
            aria-label="Selected role detail"
            aria-live="polite"
          >
            <p className="ap-eyebrow">
              SELECTED ROLE / {role.label.toUpperCase()}
            </p>
            <h3>
              {role.id === "investigation-analyst"
                ? "Evidence-first investigation"
                : role.label}
            </h3>
            <div className="ap-definitions">
              {roleDefinitions(role, snapshot).map((entry) => (
                <MiniDefinition key={entry.label} {...entry} />
              ))}
            </div>
            <p className="ap-muted-note">
              Subject, action, resource and source scope are evaluated by the
              institution&apos;s backend.
            </p>
          </aside>
        </div>
      </Section>
      <Section
        title="Action permissions &amp; least-privilege policy"
        description="The table shows default role capability; each request must also satisfy its bank source, case and resource authorization."
      >
        <div className="ap-panel ap-matrix-panel">
          <div
            className="ap-scroll-region"
            role="region"
            aria-label="Illustrative permission matrix"
            tabIndex={0}
          >
            <table className="ap-table ap-permissions-table">
              <thead>
                <tr>
                  <th scope="col">CAPABILITY</th>
                  {snapshot.roles.map((item) => (
                    <th
                      key={item.id}
                      scope="col"
                      aria-label={item.label}
                      className={
                        item.id === selectedRoleId
                          ? "ap-highlight-col"
                          : undefined
                      }
                    >
                      {roleShortNames[item.id]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.capabilities.map((capability) => (
                  <tr key={capability.id}>
                    <th scope="row">{capability.label}</th>
                    {snapshot.roles.map((item) => (
                      <td
                        key={item.id}
                        className={
                          item.id === selectedRoleId
                            ? "ap-highlight-col"
                            : undefined
                        }
                      >
                        <span data-decision={capability.decisions[item.id]}>
                          {decisionLabels[capability.decisions[item.id]]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ap-help">
            Scoped = conditional on assigned case, source classification and
            applicable bank policy. Deny is the default otherwise.
          </p>
        </div>
      </Section>
      <Section title="Authorized identities &amp; decision trace">
        <div className="ap-split ap-trace-layout">
          <div className="ap-panel ap-staff-panel">
            <p className="ap-eyebrow">
              ILLUSTRATIVE STAFF DIRECTORY / NOT A LIVE IDENTITY PROVIDER
            </p>
            <ul className="ap-staff-list">
              {snapshot.staff.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRoleId(person.role)}
                    aria-label={`View the ${snapshot.roles.find((item) => item.id === person.role)?.label ?? "staff"} role for ${person.displayName}`}
                  >
                    <strong>{person.displayName}</strong>
                    <span>
                      {snapshot.roles.find((item) => item.id === person.role)
                        ?.label ?? "Unknown role"}
                      <small>{person.note}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="ap-help">
              Personal identity bindings and membership changes require
              institutional identity-provider confirmation.
            </p>
          </div>
          <aside
            className="ap-panel ap-sample-panel"
            aria-labelledby="ap-example-heading"
          >
            <p className="ap-eyebrow">POLICY ENFORCEMENT &amp; AUDIT</p>
            <h3 id="ap-example-heading">Sample access decision</h3>
            <div className="ap-definitions">
              <MiniDefinition
                label="ACTOR"
                value={`${actor?.displayName ?? "Example actor"} / investigation analyst`}
              />
              <MiniDefinition
                label="REQUEST"
                value={snapshot.sampleDecision.request}
              />
              <MiniDefinition
                label="RESOURCE"
                value={snapshot.sampleDecision.resource}
              />
              <MiniDefinition
                label="POLICY RESULT"
                value={snapshot.sampleDecision.result}
              />
              <MiniDefinition
                label="REASON"
                value={snapshot.sampleDecision.reason}
              />
            </div>
            <p className="ap-muted-note">
              Every allow/deny action needs server-side evaluation, actor
              identity, resource, time and an audit record.
            </p>
          </aside>
        </div>
      </Section>
    </article>
  );
}
