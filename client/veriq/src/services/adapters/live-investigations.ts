import "server-only";
import {
  array,
  number,
  object,
  string,
  VeriqApiError,
  type JsonObject,
  type Row,
  type VeriqApi,
} from "../api/veriq";
import type {
  AssessmentViewModel,
  Contact,
  Incident,
  InvestigationSummary,
  Observation,
  Revision,
  Statement,
  WorkspaceData,
} from "@/types/investigations";
const strings = (value: unknown) => array(value, string);
const nullableString = (value: unknown) =>
  value === null ? null : string(value);
export function investigationSummary(record: Row): InvestigationSummary {
  const d = record.data;
  if (typeof d.review_required !== "boolean")
    throw new VeriqApiError("Invalid review state.", null);
  return {
    id: record.id,
    triggerType: string(d.trigger_type),
    triggerId: string(d.trigger_id),
    state: string(d.state),
    revision: number(d.revision),
    latestRevisionId: string(d.latest_revision_id),
    createdAt: record.created_at,
    updatedAt: null,
    evidenceCount: null,
    reviewRequired: d.review_required,
  };
}
export function contact(record: Row): Contact {
  const d = record.data;
  return {
    record,
    text: string(d.text),
    channel: string(d.channel),
    source: string(d.source_id),
    nativeId: string(d.source_native_record_id),
    customerId: string(d.customer_id),
    transactionId: nullableString(d.transaction_id),
    at: string(d.occurred_at),
    category: string(d.category),
    evidenceId: string(d.evidence_id),
  };
}
export function incident(
  record: Row,
  investigations: InvestigationSummary[],
): Incident {
  const d = record.data;
  return {
    record,
    source: string(d.source_id),
    route: string(d.route_id),
    gateway: string(d.gateway_id),
    state: string(d.state),
    rule: string(d.rule),
    start: string(d.window_start),
    end: string(d.window_end),
    attempts: number(d.attempts),
    timeouts: number(d.timeouts),
    rate: number(d.rate),
    evidenceIds: strings(d.evidence_ids),
    investigationIds: investigations
      .filter((i) => i.triggerType === "incident" && i.triggerId === record.id)
      .map((i) => i.id),
    contactTimes: [],
  };
}
export function observation(record: Row, incidents: Incident[]): Observation {
  const d = record.data,
    p = object(d.payload),
    attempts = number(p.attempts),
    timeouts = number(p.timeouts);
  if (attempts < 0 || timeouts < 0 || timeouts > attempts)
    throw new VeriqApiError("Invalid monitoring counts.", null);
  return {
    record,
    source: string(d.source_id),
    route: string(p.route_id),
    gateway: string(p.gateway_id),
    at: string(p.occurred_at),
    windowSeconds: number(p.window_seconds),
    attempts,
    timeouts,
    rate: attempts ? timeouts / attempts : null,
    incidentIds: incidents
      .filter((i) => i.evidenceIds.includes(record.id))
      .map((i) => i.record.id),
  };
}
function statements(value: unknown): Statement[] {
  return array(value, (item) => {
    const details = object(item);
    return { details, evidenceIds: strings(details.evidence_ids) };
  });
}
export function revision(record: Row): Revision {
  const d = record.data;
  return {
    record,
    number: number(d.number),
    context: object(d.context),
    evidenceIds: strings(d.evidence_ids),
    findings: statements(d.findings),
    hypotheses: statements(d.hypotheses),
    correlations: statements(d.correlations),
    unknowns: strings(d.unknowns),
    recommendations: statements(d.recommendations),
  };
}
function assessmentStatements(value: unknown): Statement[] {
  return array(value, (value) => {
    const details = object(value);
    if (details.status === "verified_source_fact") {
      string(details.evidence_id);
      string(details.field);
      string(details.scope);
      string(details.source_id);
      strings(details.authority);
      if (
        details.value !== null &&
        !["string", "number", "boolean"].includes(typeof details.value)
      )
        throw new VeriqApiError("Invalid source fact value.", null);
    } else if (details.status === "supported_derived_finding") {
      string(details.rule);
      string(details.conclusion);
      strings(details.evidence_ids);
    } else if (details.status === "unverified_hypothesis") {
      string(details.label);
      string(details.explanation);
      strings(details.supports);
      strings(details.weakens);
      string(details.next_check);
    } else {
      throw new VeriqApiError(
        "Assessment proof status is missing or unsupported.",
        null,
      );
    }
    return {
      details,
      evidenceIds: Array.isArray(details.evidence_ids)
        ? strings(details.evidence_ids)
        : typeof details.evidence_id === "string"
          ? [details.evidence_id]
          : [],
    };
  });
}
export function assessment(run: Row): AssessmentViewModel {
  const d = run.data;
  const empty = {
    state: d.redacted === true ? "redacted" : string(d.state),
    qualification:
      typeof d.qualification === "string" ? d.qualification : "Not recorded",
    acceptance:
      typeof d.acceptance === "string" ? d.acceptance : "not_accepted",
    sourceFacts: [],
    findings: [],
    hypotheses: [],
    contradictions: [],
    unknowns: [],
    nextChecks: [],
  };
  if (d.redacted === true || d.state !== "reviewable_assessment" || !d.result)
    return empty;
  const r = object(d.result);
  return {
    ...empty,
    sourceFacts: assessmentStatements(r.source_facts),
    findings: assessmentStatements(r.derived_findings),
    hypotheses: assessmentStatements(r.hypotheses),
    contradictions: assessmentStatements(r.contradictions),
    unknowns: strings(r.unknowns),
    nextChecks: strings(r.recommended_next_actions),
  };
}
async function secondary<T>(
  name: string,
  work: Promise<T>,
  warnings: string[],
  fallback: T,
): Promise<T> {
  try {
    return await work;
  } catch (error) {
    warnings.push(
      `${name}: ${error instanceof Error ? error.message : "Unavailable"}`,
    );
    return fallback;
  }
}
export async function getInvestigationQueue(
  api: VeriqApi,
  includeEvidence = false,
) {
  const investigations = (await api.rows("investigations")).map(
    investigationSummary,
  );
  if (includeEvidence) {
    // Bound full workspace reads; unavailable metadata stays unknown rather than zero.
    await Promise.all(investigations.slice(0, 4).map(async item => {
      try {
        const workspace = await api.workspace(item.id);
        const latest = workspace.revisions.find(
          (r) => r.id === item.latestRevisionId,
        );
        if (latest) {
          item.updatedAt = latest.created_at;
          item.evidenceCount = strings(latest.data.evidence_ids).length;
        }
      } catch {
        /* The primary queue remains available without optional workspace metadata. */
      }
    }));
  }
  return { kind: "queue" as const, investigations };
}
export async function getOperationalIntelligence(api: VeriqApi) {
  const warnings: string[] = [];
  const [observations, records, queue, contacts] = await Promise.all([
    api.rows("observations"),
    api.rows("incidents"),
    secondary("Investigation links", getInvestigationQueue(api), warnings, {
      kind: "queue" as const,
      investigations: [],
    }),
    secondary("Customer contacts", api.rows("interactions"), warnings, []),
  ]);
  const incidents = records.map((r) => incident(r, queue.investigations));
  for (const item of incidents.slice(0, 10)) {
    const id = item.investigationIds[0];
    if (!id) continue;
    const workspace = await secondary(
      "Incident contact linkage",
      api.workspace(id),
      warnings,
      null,
    );
    if (!workspace) continue;
    const latest = workspace.revisions.find(
      (r) => r.id === workspace.investigation.data.latest_revision_id,
    );
    const linked = latest ? strings(latest.data.evidence_ids) : [];
    item.contactTimes = contacts
      .filter((c) => linked.includes(string(c.data.evidence_id)))
      .map((c) => string(c.data.occurred_at));
  }
  return {
    kind: "operations" as const,
    observations: observations
      .map((r) => observation(r, incidents))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    incidents,
    contacts: contacts.map(contact),
    warnings,
    observedAt: new Date().toISOString(),
  };
}
export async function getInvestigationWorkspace(
  api: VeriqApi,
  id: string,
  canReview: boolean,
): Promise<WorkspaceData> {
  const w = await api.workspace(id),
    warnings: string[] = [];
  const tasks = (
    await secondary("AI tasks", api.rows("tasks"), warnings, [])
  ).filter((t) => t.data.investigation_id === id);
  // Keep task inspection bounded; older task summaries remain visible without duplicating tool payloads.
  const traces = [];
  for (const task of tasks.slice(-4)) {
    try {
      const [current, trace] = await Promise.all([
        api.task(task.id),
        api.steps(task.id),
      ]);
      traces.push({
        task: current,
        redacted: trace.redacted,
        reason: trace.reason,
        steps: trace.steps,
        error: null,
      });
    } catch (error) {
      traces.push({
        task,
        redacted: true,
        reason: "Tool evidence unavailable",
        steps: [],
        error: error instanceof Error ? error.message : "Unavailable",
      });
    }
  }
  const assessments: Record<string, AssessmentViewModel> = {};
  for (const run of w.inference_runs) {
    if (typeof run.data.revision_id !== "string") continue;
    try {
      assessments[run.data.revision_id] = assessment(run);
    } catch {
      warnings.push(
        "An assessment did not satisfy its presentation contract and was withheld.",
      );
    }
  }
  return {
    kind: "workspace",
    investigation: investigationSummary(w.investigation),
    revisions: w.revisions.map(revision).sort((a, b) => a.number - b.number),
    evidence: w.evidence,
    reviews: w.review_history,
    tasks: traces,
    assessments,
    warnings,
    canReview,
  };
}
export async function getLiveIssues(api: VeriqApi) {
  const [issues, records] = await Promise.all([
    api.rows("issues"),
    api.rows("interactions"),
  ]);
  const contacts = records.map(contact);
  return {
    kind: "issues" as const,
    contacts,
    issues: issues.map((record) => {
      const d = record.data,
        evidenceIds = strings(d.evidence_ids);
      return {
        record,
        category: string(d.category),
        count: number(d.count),
        channels: strings(d.channels),
        meaning: string(d.meaning),
        evidenceIds,
        contacts: contacts.filter((c) => evidenceIds.includes(c.evidenceId)),
      };
    }),
  };
}
export function freshness(
  at: string | null,
  now: string,
): "fresh" | "stale" | "absent" {
  if (!at) return "absent";
  return Date.parse(now) - Date.parse(at) <= 60_000 &&
    Date.parse(now) >= Date.parse(at)
    ? "fresh"
    : "stale";
}
export function provenanceData(record: Row): JsonObject {
  return {
    id: record.id,
    classification: record.classification,
    ingested_at: record.created_at,
    ...record.data,
  };
}
