const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const moduleUnderTest = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/lib/intelligence-polling.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  {
    module: moduleUnderTest,
    exports: moduleUnderTest.exports,
    AbortController,
    setTimeout,
    clearTimeout,
  },
);
const { startIntelligencePolling } = moduleUnderTest.exports;
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("polling serializes refreshes and suppresses stale results after navigation", async () => {
  let resolve,
    calls = 0,
    received = 0;
  const poll = startIntelligencePolling({
    read: () => {
      calls++;
      return new Promise((r) => (resolve = r));
    },
    receive: () => received++,
    fail: () => assert.fail("Unexpected failure"),
    active: () => true,
  });
  poll.refresh();
  poll.refresh();
  assert.equal(calls, 1);
  poll.stop();
  resolve({ revision: 1 });
  await flush();
  assert.equal(received, 0);
});
test("active refresh uses bounded intervals, backs off on failure and recovers", async () => {
  let readCount = 0,
    failed = 0,
    received = 0;
  const scheduled = [];
  const poll = startIntelligencePolling({
    read: async () => {
      if (++readCount === 2) throw new Error("API restart");
      return { revision: readCount };
    },
    receive: () => received++,
    fail: () => failed++,
    active: () => true,
    schedule: (fn, delay) => {
      scheduled.push({ fn, delay });
      return scheduled.length;
    },
    cancel: () => {},
  });
  await flush();
  assert.equal(scheduled[0].delay, 3000);
  scheduled[0].fn();
  await flush();
  assert.equal(failed, 1);
  assert.equal(scheduled[1].delay, 6000);
  scheduled[1].fn();
  await flush();
  assert.equal(received, 2);
  assert.equal(scheduled[2].delay, 3000);
  poll.stop();
});
