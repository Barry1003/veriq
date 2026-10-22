const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./load-module.cjs');
Object.assign(process.env, {
  CEDAR_DATA_SOURCE: 'api', CEDAR_UI_ORIGIN: 'http://localhost:3000', CEDAR_API_URL: 'http://127.0.0.1:8101',
  CEDAR_CUSTOMER_TOKEN: 'synthetic-customer-bearer', CEDAR_CUSTOMER_ACTION_KEY: 'synthetic-action-key',
  CEDAR_OPERATOR_KEY: 'synthetic-operator-key', CEDAR_REQUEST_COOKIE_SECRET: 'synthetic-test-encryption-secret-32-characters',
});
const instruction = { account_id: 'A1', route_id: 'R1', amount_minor: 1000, idempotency_key: 'original-request' };
const recovery = loadModule('lib/transfer-recovery.ts');
const normalize = value => JSON.parse(JSON.stringify(value));
function harness() {
  let cookie, loseResponse = false, calls = 0;
  const ledger = new Map(), submitted = [];
  const dependencies = {
    'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200,
      cookies: { set: (_name, value, options) => { cookie = options.maxAge === 0 ? undefined : value; } },
    }) } },
    fetch: async (_url, opts) => {
      calls++;
      const body = JSON.parse(opts.body); submitted.push(body);
      if (!ledger.has(body.idempotency_key)) ledger.set(body.idempotency_key, { id: 'record-1', data: { ...body, transaction_id: 'TX-1', status: 'pending' } });
      if (loseResponse) throw new Error('Response lost after bank committed');
      return { ok: true, status: 201, text: async () => JSON.stringify(ledger.get(body.idempotency_key)) };
    },
  };
  let api = loadModule('app/api/cedar/route.ts', dependencies);
  return {
    send: (action, body = instruction, key = 'synthetic-action-key', origin = 'http://localhost:3000') => api.POST({
      headers: new Map([['origin', origin], ['content-type', 'application/json'], ['x-cedar-action-key', key]]),
      nextUrl: { origin: 'http://localhost:3000' }, cookies: { get: () => cookie ? { value: cookie } : undefined },
      text: async () => JSON.stringify({ action, ...body }),
    }),
    reload: () => { api = loadModule('app/api/cedar/route.ts', dependencies); },
    set lose(value) { loseResponse = value; },
    get cookie() { return cookie; }, get calls() { return calls; }, get ledger() { return ledger; }, get submitted() { return submitted; },
  };
}
test('sealed recovery retains the exact instruction without readable banking data', () => {
  const sealed = recovery.sealTransfer(instruction);
  assert.deepEqual(normalize(recovery.recoverTransfer(sealed)), instruction);
  assert.equal(sealed.includes('original-request'), false);
  assert.equal(recovery.transferCookieOptions.httpOnly, true);
  assert.equal(recovery.transferCookieOptions.sameSite, 'strict');
});
test('tampering and a different customer credential fail closed', () => {
  const sealed = recovery.sealTransfer(instruction);
  const bytes = Buffer.from(sealed, 'base64url'); bytes[30] ^= 1;
  assert.throws(() => recovery.recoverTransfer(bytes.toString('base64url')));
  const previous = process.env.CEDAR_CUSTOMER_TOKEN;
  process.env.CEDAR_CUSTOMER_TOKEN = 'different-customer';
  assert.throws(() => recovery.recoverTransfer(sealed));
  process.env.CEDAR_CUSTOMER_TOKEN = previous;
});
test('the bank cannot receive a transfer before recovery is staged', async () => {
  const app = harness();
  assert.equal((await app.send('transfer')).status, 409); assert.equal(app.calls, 0);
  assert.equal((await app.send('prepare_transfer')).status, 200); assert.equal(app.calls, 0);
});
test('a lost response and full reload retry the exact request without a second ledger entry', async () => {
  const app = harness(); await app.send('prepare_transfer'); app.lose = true;
  assert.equal((await app.send('transfer')).status, 502);
  const originalCookie = app.cookie; assert.equal(app.ledger.size, 1);
  app.reload(); app.lose = false;
  assert.deepEqual(normalize(recovery.recoverTransfer(app.cookie)), instruction);
  assert.equal((await app.send('transfer')).body.data.transaction_id, 'TX-1');
  assert.equal(app.ledger.size, 1); assert.deepEqual(app.submitted[0], app.submitted[1]);
  assert.equal(app.cookie, originalCookie, 'bank response alone must never clear recovery');
  assert.equal((await app.send('acknowledge_transfer')).status, 200); assert.equal(app.cookie, undefined);
});
test('account, route, amount and identity changes stay blocked after ambiguity', async () => {
  const app = harness(); await app.send('prepare_transfer');
  for (const change of [{ account_id: 'A2' }, { route_id: 'R2' }, { amount_minor: 2000 }, { idempotency_key: 'new-key' }]) {
    const changed = { ...instruction, ...change };
    assert.equal((await app.send('prepare_transfer', changed)).status, 409);
    assert.equal((await app.send('transfer', changed)).status, 409);
    assert.equal((await app.send('acknowledge_transfer', changed)).status, 409);
  }
  assert.equal(app.calls, 0);
});
test('duplicate submissions retain one backend idempotency identity', async () => {
  const app = harness(); await app.send('prepare_transfer');
  const responses = await Promise.all([app.send('transfer'), app.send('transfer')]);
  assert.ok(responses.every(response => response.body.data.transaction_id === 'TX-1')); assert.equal(app.ledger.size, 1);
});
test('cross-origin, missing key and customer reconciliation are rejected before bank calls', async () => {
  const app = harness();
  assert.equal((await app.send('prepare_transfer', instruction, '')).status, 403);
  assert.equal((await app.send('prepare_transfer', instruction, 'synthetic-action-key', 'https://outside.example')).status, 403);
  assert.equal((await app.send('reconcile', { transaction_id: 'TX-1', outcome: 'completed', rationale: 'User cannot settle' })).status, 403);
  assert.equal(app.calls, 0);
});
test('an invalid or mismatching response cannot acknowledge a transfer', () => {
  const { isTransferResponse } = loadModule('lib/cedar-actions.ts');
  assert.equal(isTransferResponse({ data: { ...instruction, transaction_id: 'TX-1', status: 'pending' } }, instruction), true);
  for (const data of [{}, { ...instruction, transaction_id: 'TX-1', status: 'unknown' }, { ...instruction, amount_minor: 99, transaction_id: 'TX-1', status: 'completed' }])
    assert.equal(isTransferResponse({ data }, instruction), false);
});
test('mutations fail closed when the trusted browser origin is missing', async () => {
  const app = harness(); const configured = process.env.CEDAR_UI_ORIGIN;
  delete process.env.CEDAR_UI_ORIGIN;
  assert.equal((await app.send('prepare_transfer')).status, 503);
  assert.equal(app.calls, 0);
  process.env.CEDAR_UI_ORIGIN = configured;
});
