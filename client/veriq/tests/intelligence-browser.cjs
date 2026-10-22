// Opt-in integration: uses only the task-owned populated rehearsal, never prepared AI content.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const root = path.resolve(__dirname, "../../..");
const directory = path.join(
  root,
  "server/platform/var/rehearsals",
  process.env.VERIQ_REHEARSAL_RUN,
);
const runtime = JSON.parse(
  fs.readFileSync(path.join(directory, "runtime.json")),
);
const logins = JSON.parse(
  fs.readFileSync(path.join(directory, "browser-logins.json")),
);
const base = "http://localhost:3001";
async function backend(collection) {
  const r = await fetch(`http://127.0.0.1:8610/v1/${collection}`, {
    headers: { Authorization: `Bearer ${runtime.tokens.veriq_internal}` },
  });
  assert.equal(r.status, 200);
  return r.json();
}
async function login(page, role) {
  await page.goto(base + "/login");
  await page
    .getByLabel("Username", { exact: true })
    .fill(logins.veriq[role].username);
  await page
    .getByLabel("Password", { exact: true })
    .fill(logins.veriq[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(base + "/");
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const investigations = await backend("investigations"),
      contacts = await backend("interactions"),
      incidents = await backend("incidents");
    const chosen = investigations.find(
      (i) => i.data.trigger_type === "incident",
    );
    assert.ok(chosen);
    await login(page, "investigator");
    await page
      .getByRole("heading", { name: "Intelligence Overview", exact: true })
      .waitFor();
    await page.waitForFunction(() => { const image = document.querySelector('img[alt="Veriq"]'); return image && image.complete && image.naturalWidth > 0; });
    assert.equal(await page.locator(".io-kpi").count(), 4);
    await page
      .getByRole("link", { name: "Institutional Knowledge", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Knowledge Explorer", exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: "Operational Intelligence", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Recorded measurement windows",
        exact: true,
      })
      .waitFor();
    await page
      .getByText("Detected before linked customer contact", { exact: true })
      .waitFor();
    assert.ok(
      Date.parse(incidents[0].created_at) <
        Date.parse(contacts[0].data.occurred_at),
    );
    await page
      .getByRole("link", { name: "Open investigation", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Investigation summary", exact: true })
      .waitFor();
    assert.ok(page.url().includes(chosen.id));
    await page
      .getByText("No reviewable AI assessment", { exact: true })
      .waitFor();
    assert.equal(
      (await page
        .getByText("Cedar recorded status completed", { exact: true })
        .count()) > 0,
      true,
    );
    assert.ok(
      (await page.locator("body").innerText()).includes(
        "Not independently verified",
      ),
    );
    const revisions = page.getByLabel("Investigation revision", {
      exact: true,
    });
    const oldValue = await revisions
      .locator("option")
      .last()
      .getAttribute("value");
    await revisions.selectOption(oldValue);
    await page.getByText("Viewing revision 1 ·", { exact: false }).waitFor();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.waitForTimeout(3400);
    assert.equal(await revisions.inputValue(), oldValue);
    await revisions.selectOption("latest");
    const evidenceSelect = page.getByLabel("Select evidence", { exact: true });
    const observationOption = await evidenceSelect
      .locator("option")
      .filter({ hasText: "observation" })
      .first()
      .getAttribute("value");
    await evidenceSelect.selectOption(observationOption);
    await page
      .getByRole("heading", { name: "Original source content", exact: true })
      .waitFor();
    // A temporary HTTP outage must clear evidence and recover the same selected investigation.
    let fail = true;
    await page.route("**/api/intelligence?view=workspace*", async (route) => {
      if (fail)
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary rehearsal interruption" }),
        });
      else await route.continue();
    });
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Temporary rehearsal interruption" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "Original source content", exact: true })
        .count(),
      0,
    );
    fail = false;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("heading", { name: "Investigation summary", exact: true })
      .waitFor();
    assert.ok(page.url().includes(chosen.id));
    await page.unroute("**/api/intelligence?view=workspace*");
    // Role and CSRF failures must be actual server rejections.
    const forbidden = await page.request.post(base + "/api/intelligence", {
      headers: { Origin: base },
      data: {
        id: chosen.id,
        revisionId: chosen.data.latest_revision_id,
        action: "review",
        rationale: "Read only investigator check",
      },
    });
    assert.equal(forbidden.status(), 403);
    await page
      .getByRole("link", { name: "Customer Intelligence", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Customer Interactions", exact: true })
      .waitFor();
    const quote = await page
      .locator(".cx-inspector-quote blockquote")
      .innerText();
    assert.equal(quote, `“${contacts[0].data.text}”`);
    await page
      .getByText(contacts[0].data.source_native_record_id, { exact: false })
      .first()
      .waitFor();
    await page
      .getByRole("link", { name: "View emerging issues", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", {
        name: "No emerging issue group recorded",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("link", { name: "Investigations", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Investigation queue", exact: true })
      .waitFor();
    await page.getByLabel("Search reference or trigger").fill(chosen.id);
    assert.equal(await page.locator("tbody tr:visible").count(), 1);
    await page.getByRole("link", { name: "Open", exact: true }).click();
    await page
      .getByRole("heading", { name: "Investigation summary", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/veriq-ticket2-workspace.png",
      fullPage: false,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page
        .locator("body")
        .evaluate((e) => e.scrollWidth <= window.innerWidth),
    );
    const html = await page.content();
    for (const value of Object.values(runtime.tokens))
      assert.ok(!html.includes(value));
    await context.close();
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await login(admin, "admin");
    await admin.goto(base + "/investigations/" + chosen.id);
    await admin
      .getByRole("heading", { name: "Human review", exact: true })
      .waitFor();
    const csrfResponse = await admin.request.get(base + "/api/session");
    const session = await csrfResponse.json();
    const noCsrf = await admin.request.post(base + "/api/intelligence", {
      headers: { Origin: base },
      data: {
        id: chosen.id,
        revisionId: chosen.data.latest_revision_id,
        action: "review",
        rationale: "Review security validation",
      },
    });
    assert.equal(noCsrf.status(), 403);
    const stale = await admin.request.post(base + "/api/intelligence", {
      headers: { Origin: base, "X-CSRF-Token": session.csrf },
      data: {
        id: chosen.id,
        revisionId: "stale-revision",
        action: "review",
        rationale: "Stale revision must be rejected",
      },
    });
    assert.equal(stale.status(), 409);
    await admin
      .getByLabel("Rationale", { exact: true })
      .fill(
        "Reviewed original operational measurements and reconciliation evidence; beneficiary receipt remains unverified.",
      );
    await admin
      .getByRole("button", { name: "Submit review action", exact: true })
      .click();
    await admin
      .getByText("Recorded. Cedar financial state is unchanged.", {
        exact: true,
      })
      .waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    await adminContext.close();
    console.log(
      "PASS: five-tab browser navigation, proactive chronology, actual queue/workspace, historical revision retention, exact customer statement, evidence inspection and outage clearing/recovery, empty issues, responsive layout, credential isolation, investigator denial, admin CSRF/stale revision rejection and authorized review.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
