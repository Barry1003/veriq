const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadModule } = require('./load-module.cjs');
const { createVeriqApi, requireVeriqApi, collections, singletonPaths } = loadModule('services/api/veriq.ts');
const sourcesAdapter = loadModule('services/adapters/live-knowledge-sources.ts').getLiveKnowledgeSources;
const customersAdapter = loadModule('services/adapters/live-customer-interactions.ts').getLiveCustomerInteractions;
const processingAdapter = loadModule('services/adapters/live-knowledge-processing.ts').getLiveKnowledgeProcessing;
const overviewAdapter = loadModule('services/adapters/live-intelligence-overview.ts').getLiveIntelligenceOverview;
const dashboardAdapter = loadModule('services/api/dashboard.ts').getApiDashboardSummary;
const knowledgeAdapter = loadModule('services/adapters/live-institutional-knowledge.ts').getLiveInstitutionalKnowledge;
const row = (id, data, kind = 'evidence', at = '2026-10-22T10:00:00Z') => ({ id, kind, classification: 'internal', created_at: at, data });
const apiFor = paths => createVeriqApi({ baseUrl: 'http://127.0.0.1:8610', token: 'synthetic-test-token' }, async url => {
  const key = new URL(url).pathname;
  assert.ok(key in paths, `Unexpected API path: ${key}`);
  return new Response(JSON.stringify(paths[key]), { status: 200 });
});

test('read allowlists match methods in the authoritative live-demo OpenAPI', () => {
  const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../server/platform/contracts/api/veriq-live-demo.openapi.json')));
  for (const route of [...Object.values(collections), ...Object.values(singletonPaths), '/v1/investigations/{investigation_id}/workspace', '/v1/inference/tasks/{task_id}', '/v1/inference/tasks/{task_id}/steps'])
    assert.ok(spec.paths[route].get, `${route} GET is absent`);
});
test('browser callers cannot obtain a principal without an approved session', () => {
  assert.throws(() => requireVeriqApi(), /session-to-principal/);
});
test('the reader uses server-owned credentials and rejects unsafe connection URLs', async () => {
  for (const baseUrl of ['file:///etc/passwd', 'http://user:password@host', 'http://host/?token=hidden'])
    assert.throws(() => createVeriqApi({ baseUrl, token: 'synthetic' }));
  let options;
  const api = createVeriqApi({ baseUrl: 'http://127.0.0.1:8610', token: 'server-secret' }, async (_url, opts) => { options = opts; return Response.json([]); });
  await api.rows('evidence');
  assert.equal(options.headers.Authorization, 'Bearer server-secret'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
});
test('authorization, conflicts, unavailable APIs and invalid envelopes never become fixture data', async () => {
  for (const status of [401, 403, 404, 409, 422, 429, 502, 503]) {
    const api = createVeriqApi({ baseUrl: 'http://127.0.0.1', token: 'synthetic' }, async () => new Response('{}', { status }));
    await assert.rejects(api.rows('interactions'), error => error.status === status);
  }
  await assert.rejects(apiFor({ '/v1/evidence': {} }).rows('evidence'), /invalid list/);
  const offline = createVeriqApi({ baseUrl: 'http://127.0.0.1', token: 'synthetic' }, async () => { throw new Error('offline'); });
  await assert.rejects(offline.rows('incidents'), /unreachable/);
});
test('registered, receiving, polling-error and revoked sources stay distinct', async () => {
  const base = { source_id: 'native-source', name: 'Synthetic source', ingested: 0, authorization_state: 'active', record_types: ['knowledge'], last_received_at: null, last_error: null };
  for (const [patch, label, connected] of [[{}, 'No records received', false], [{ ingested: 2 }, 'Records received', true], [{ ingested: 2, last_error: 'upstream unavailable' }, 'Polling error', false], [{ ingested: 2, authorization_state: 'revoked' }, 'Revoked', false]]) {
    const result = await sourcesAdapter(apiFor({ '/v1/sources': [row('storage-row-id', { ...base, ...patch })] }));
    assert.equal(result.collections[0].id, 'native-source'); assert.equal(result.collections[0].deliveryLabel, label); assert.equal(result.collections[0].connected, connected);
  }
});
test('all native channels preserve statements without inventing cases or incident associations', async () => {
  const result = await customersAdapter(apiFor({ '/v1/interactions': [row('contact-1', {
    channel: 'email', text: 'A synthetic report', category: 'other', occurred_at: '2026-10-22T09:57:00Z', source_id: 'mail-feed', source_native_record_id: 'mail-1', transaction_id: null,
  })], '/v1/issues': [] }));
  assert.equal(result.listedContacts[0].channel, 'email'); assert.equal(result.listedContacts[0].originalStatement, 'A synthetic report');
  assert.equal(result.listedContacts[0].caseId, null); assert.equal(result.listedContacts[0].caseStatus, 'Not tracked');
  assert.equal(result.linkedOperationalIncident, null); assert.equal(result.uniqueCustomers, null); assert.equal(result.issueCount, 0);
});
test('accepted and rejected assertions cannot reappear as candidates from out-of-order reviews', async () => {
  const assertion = row('claim-1', { source_id: 'source-1', evidence_id: 'evidence-1', knowledge: { valid_from: '2026-10-21T12:00:00Z' }, method: 'ai_extraction' });
  const result = await processingAdapter(apiFor({ '/v1/knowledge/assertions': [assertion], '/v1/knowledge/reviews': [
    row('review-new', { assertion_id: 'claim-1', decision: 'accepted', rationale: 'Reviewed evidence' }, 'knowledge_review', '2026-10-22T11:00:00Z'),
    row('review-old', { assertion_id: 'claim-1', decision: 'candidate', rationale: 'Awaiting review' }, 'knowledge_review', '2026-10-22T10:00:00Z'),
  ] }));
  assert.equal(result.candidates.length, 0);
});
test('revoked task traces discard every cached tool step', async () => {
  const api = apiFor({ '/v1/inference/tasks/task-1/steps': { task_id: 'task-1', state: 'invalidated', redacted: true, reason: 'Source revoked', steps: [row('private', { secret: 'must not be displayed' })] } });
  const trace = await api.steps('task-1'); assert.equal(trace.steps.length, 0); assert.equal(trace.reason, 'Source revoked');
  await assert.rejects(api.task('../unexpected'), /Invalid evidence identifier/);
});
test('empty API collections remain empty', async () => {
  assert.equal((await sourcesAdapter(apiFor({ '/v1/sources': [] }))).collections.length, 0);
  assert.equal((await customersAdapter(apiFor({ '/v1/interactions': [], '/v1/issues': [] }))).listedContacts.length, 0);
  assert.equal((await processingAdapter(apiFor({ '/v1/knowledge/assertions': [], '/v1/knowledge/reviews': [] }))).candidates.length, 0);
});
test('typed adapters consume the isolated running FastAPI services', { skip: !process.env.VERIQ_TEST_RUNTIME_FILE }, async () => {
  const runtime = JSON.parse(fs.readFileSync(process.env.VERIQ_TEST_RUNTIME_FILE));
  const api = createVeriqApi({ baseUrl: process.env.VERIQ_TEST_API_URL, token: runtime.tokens.veriq_admin });
  const [sources, customers, processing, knowledge, overview, dashboard] = await Promise.all([sourcesAdapter(api), customersAdapter(api), processingAdapter(api), knowledgeAdapter(api), overviewAdapter(api), dashboardAdapter(api)]);
  assert.equal(overview.operationalSignal.baselinePercent, null);
  assert.equal(overview.agentReview, null);
  assert.match(overview.processingSummary, /unqualified/);
  assert.ok(dashboard.metrics.every(metric => metric.changePercent === null));
  assert.ok(sources.collections.some(source => source.recordCount > 0)); assert.ok(customers.listedContacts.length > 0);
  assert.equal(knowledge.kind, 'live'); assert.ok(knowledge.entities.some(entity => entity.kind === 'route'));
  assert.ok(knowledge.relationships.length > 0); assert.ok(knowledge.relationships.every(edge => edge.assessment === 'reported'));
  assert.equal(processing.kind, 'live');
  const investigations = await api.rows('investigations');
  for (const investigation of investigations) {
    const workspace = await api.workspace(investigation.id);
    assert.ok(workspace.revisions.some(revision => revision.id === workspace.investigation.data.latest_revision_id));
  }
});
