const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { loadModule } = require("./load-module.cjs");
const { createVeriqApi } = loadModule("services/api/veriq.ts");
const adapter = loadModule("services/adapters/live-investigations.ts");
const row = (id, data, kind = "evidence", at = "2026-10-22T10:00:00Z") => ({
  id,
  kind,
  classification: "internal",
  created_at: at,
  data,
});
const investigation = row(
  "investigation-a",
  {
    trigger_type: "incident",
    trigger_id: "incident-a",
    state: "open",
    revision: 2,
    latest_revision_id: "revision-2",
    review_required: true,
  },
  "investigation",
);
const revision = (id, n, status) =>
  row(
    id,
    {
      investigation_id: investigation.id,
      number: n,
      context: {
        at: "2026-10-22T09:59:00Z",
        known_at: "2026-10-22T10:00:00Z",
        entities: [],
        relationships: [],
      },
      evidence_ids: [
        "observation-a",
        "contact-evidence",
        "transaction-evidence",
      ],
      findings: [
        {
          kind: "recorded_status",
          text: `Cedar recorded status ${status}`,
          beneficiary_verified: false,
          evidence_ids: ["transaction-evidence"],
        },
      ],
      hypotheses: [],
      correlations: [
        {
          interaction_id: "contact-a",
          semantics: "observational",
          causation: "not_established",
          evidence_ids: ["contact-evidence", "observation-a"],
        },
      ],
      unknowns: ["Beneficiary receipt unverified"],
      recommendations: [],
      method: "deterministic-evidence-assembly-v1",
    },
    "investigation_revision",
  );
const observation = row("observation-a", {
  source_id: "monitoring",
  native_record_id: "window-1",
  record_type: "observation",
  payload: {
    route_id: "R1",
    gateway_id: "G1",
    occurred_at: "2026-10-22T09:59:00Z",
    window_seconds: 60,
    attempts: 10,
    timeouts: 4,
  },
});
const incident = row(
  "incident-a",
  {
    source_id: "monitoring",
    route_id: "R1",
    gateway_id: "G1",
    state: "open",
    rule: "timeout_rate >= 0.30 and attempts >= 10",
    window_start: "2026-10-22T09:59:00Z",
    window_end: "2026-10-22T10:00:00Z",
    attempts: 10,
    timeouts: 4,
    rate: 0.4,
    evidence_ids: ["observation-a"],
    financial_outcome: "not_established",
  },
  "incident",
);
const original =
  "My transfer is pending.\nRecipient has not confirmed receipt.  Preserve spacing.";
const contact = row(
  "contact-a",
  {
    text: original,
    channel: "email",
    source_id: "mail",
    source_native_record_id: "message-1",
    customer_id: "customer-a",
    transaction_id: "transaction-a",
    occurred_at: "2026-10-22T10:01:00Z",
    category: "transfer_delay",
    evidence_id: "contact-evidence",
  },
  "interaction",
  "2026-10-22T10:02:00Z",
);
const workspace = {
  investigation,
  revisions: [
    revision("revision-1", 1, "pending"),
    revision("revision-2", 2, "completed"),
  ],
  review_history: [],
  inference_runs: [],
  evidence: [
    observation,
    row("contact-evidence", {
      record_type: "interaction",
      payload: { text: original },
    }),
    row("transaction-evidence", {
      record_type: "transaction",
      payload: { status: "completed", beneficiary_verified: false },
    }),
  ],
};
const apiFor = (paths) =>
  createVeriqApi(
    { baseUrl: "http://localhost:8610", token: "synthetic-test" },
    async (url) => {
      const p = new URL(url).pathname;
      if (!(p in paths)) throw new Error("Unexpected " + p);
      return Response.json(paths[p]);
    },
  );
const paths = {
  "/v1/investigations": [investigation],
  "/v1/observations": [observation],
  "/v1/incidents": [incident],
  "/v1/interactions": [contact],
  "/v1/issues": [],
  "/v1/investigations/investigation-a/workspace": workspace,
  "/v1/inference/tasks": [],
};
test("queue preserves persisted identifiers, source triggers and latest revision", async () => {
  const q = await adapter.getInvestigationQueue(apiFor(paths));
  assert.equal(q.investigations[0].id, investigation.id);
  assert.equal(q.investigations[0].triggerId, incident.id);
  assert.equal(q.investigations[0].revision, 2);
  assert.throws(() => adapter.investigationSummary(row("bad", {})));
});
test("monitoring maps original windows, counts and only recorded incident links", async () => {
  const m = await adapter.getOperationalIntelligence(apiFor(paths));
  assert.equal(m.observations.length, 1);
  assert.equal(m.observations[0].rate, 0.4);
  assert.equal(m.observations[0].windowSeconds, 60);
  assert.deepEqual(Array.from(m.observations[0].incidentIds), ["incident-a"]);
  assert.deepEqual(Array.from(m.incidents[0].investigationIds), [
    "investigation-a",
  ]);
  assert.equal(m.incidents[0].contactTimes[0], contact.data.occurred_at);
  assert.ok(
    Date.parse(m.incidents[0].record.created_at) <
      Date.parse(m.incidents[0].contactTimes[0]),
  );
});
test("workspace retains historical financial states without converting completion into receipt", async () => {
  const w = await adapter.getInvestigationWorkspace(
    apiFor(paths),
    investigation.id,
    false,
  );
  assert.equal(w.revisions.length, 2);
  assert.equal(
    w.revisions[0].findings[0].details.text,
    "Cedar recorded status pending",
  );
  assert.equal(
    w.revisions[1].findings[0].details.text,
    "Cedar recorded status completed",
  );
  assert.equal(w.revisions[1].findings[0].details.beneficiary_verified, false);
  assert.equal(
    w.revisions[1].correlations[0].details.causation,
    "not_established",
  );
  assert.equal(w.evidence.length, 3);
  assert.equal(Object.keys(w.assessments).length, 0);
  assert.equal(w.canReview, false);
});
test("unavailable tasks never become valid assessments and revoked steps discard stale evidence", async () => {
  const task = row(
    "task-a",
    {
      investigation_id: investigation.id,
      state: "unavailable",
      task: "adaptive_investigation",
      revision_id: "revision-2",
    },
    "ai_task",
  );
  const api = apiFor({
    ...paths,
    "/v1/inference/tasks": [task],
    "/v1/inference/tasks/task-a": task,
    "/v1/inference/tasks/task-a/steps": {
      task_id: "task-a",
      state: "unavailable",
      redacted: true,
      reason: "Source revoked",
      steps: [row("private", { secret: "hidden" })],
    },
  });
  const w = await adapter.getInvestigationWorkspace(
    api,
    investigation.id,
    false,
  );
  assert.equal(w.tasks[0].steps.length, 0);
  assert.equal(w.tasks[0].redacted, true);
  assert.equal(w.tasks[0].task.data.state, "unavailable");
  assert.equal(Object.keys(w.assessments).length, 0);
});
test("quarantined, completed and redacted runs cannot publish an assessment", () => {
  for (const d of [
    { state: "quarantined" },
    { state: "completed" },
    { state: "reviewable_assessment", redacted: true },
  ]) {
    const a = adapter.assessment(
      row("run", { ...d, result: { findings: ["invented"] } }),
    );
    assert.equal(a.findings.length, 0);
    assert.equal(a.sourceFacts.length, 0);
  }
});
test("original customer text and actual emerging issue evidence remain exact", async () => {
  const issue = row(
    "issue-a",
    {
      category: "transfer_delay",
      count: 2,
      channels: ["email"],
      evidence_ids: ["contact-evidence"],
      meaning: "Recurring reports; common cause not established",
    },
    "issue",
  );
  const result = await adapter.getLiveIssues(
    apiFor({ ...paths, "/v1/issues": [issue] }),
  );
  assert.equal(result.contacts[0].text, original);
  assert.equal(result.contacts[0].nativeId, "message-1");
  assert.equal(result.issues[0].record.id, "issue-a");
  assert.equal(result.issues[0].contacts[0].evidenceId, "contact-evidence");
  assert.equal((await adapter.getLiveIssues(apiFor(paths))).issues.length, 0);
});
test("an unavailable task service leaves immutable source workspace operational", async () => {
  const p = { ...paths };
  delete p["/v1/inference/tasks"];
  const result = await adapter.getInvestigationWorkspace(
    apiFor(p),
    investigation.id,
    false,
  );
  assert.equal(result.revisions.length, 2);
  assert.ok(result.warnings.some((w) => w.includes("AI tasks")));
});
test("measurement freshness has explicit fresh, stale and absent states", () => {
  assert.equal(adapter.freshness(null, "2026-10-22T10:00:00Z"), "absent");
  assert.equal(
    adapter.freshness("2026-10-22T09:59:30Z", "2026-10-22T10:00:00Z"),
    "fresh",
  );
  assert.equal(
    adapter.freshness("2026-10-22T09:58:00Z", "2026-10-22T10:00:00Z"),
    "stale",
  );
});
test(
  "live Ticket 2 adapters consume authorized rehearsal and preserve source chronology",
  { skip: !process.env.VERIQ_TEST_RUNTIME_FILE },
  async () => {
    const runtime = JSON.parse(
      fs.readFileSync(process.env.VERIQ_TEST_RUNTIME_FILE),
    );
    const api = createVeriqApi({
      baseUrl: process.env.VERIQ_TEST_API_URL,
      token: runtime.tokens.veriq_internal,
    });
    const queue = await adapter.getInvestigationQueue(api);
    assert.ok(queue.investigations.length > 0);
    const operations = await adapter.getOperationalIntelligence(api);
    assert.ok(operations.observations.length > 0);
    assert.ok(
      operations.incidents.some((i) =>
        i.contactTimes.some(
          (at) => Date.parse(at) > Date.parse(i.record.created_at),
        ),
      ),
    );
    for (const i of queue.investigations) {
      const w = await adapter.getInvestigationWorkspace(api, i.id, false);
      assert.ok(w.revisions.some((r) => r.record.id === i.latestRevisionId));
      assert.equal(Object.keys(w.assessments).length, 0);
      assert.ok(w.revisions.length > 1);
    }
    const issues = await adapter.getLiveIssues(api);
    assert.equal(issues.issues.length, 0);
  },
);
test("dashboard counts use actual records and runtime outage does not erase source counts", async () => {
  const { getLiveIntelligenceOverview } = loadModule(
    "services/adapters/live-intelligence-overview.ts",
  );
  const data = await getLiveIntelligenceOverview(
    apiFor({
      ...paths,
      "/v1/knowledge/context": {
        entities: [{ id: "entity-a" }, { id: "entity-b" }],
      },
      "/v1/knowledge/assertions": [],
      "/v1/knowledge/reviews": [],
    }),
  );
  assert.deepEqual(
    Array.from(data.kpis, (k) => k.value),
    [2, 1, 1, 1],
  );
  assert.match(data.processingSummary, /runtime is unavailable/);
  assert.equal(data.agentReview, null);
});
