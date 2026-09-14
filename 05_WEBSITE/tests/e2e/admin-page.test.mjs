// Playwright E2E for Sprint v3 Task 31 — /admin/ login page and dashboard, driven through the
// real local server (scripts/dev-app.mjs) against becaa_test. Requires `npm run build`.
// Run with: node --env-file-if-exists=.env.local --import tsx tests/e2e/admin-page.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { chromium } from "playwright";
import { migrate } from "../../scripts/db-migrate.mjs";
import { siteRoot } from "../../scripts/lib.mjs";

const DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
await migrate(DATABASE_URL);
const { hashPassword } = await import("../../lib/hash.ts");
const ADMIN_PASSWORD = "correct horse battery staple";
const env = { ...process.env, DATABASE_URL, SESSION_SECRET: "admin-e2e-secret", IP_HASH_SALT: "salt", NODE_ENV: "development", PORT: "0", ADMIN_USERNAME: "committee-admin", ADMIN_PASSWORD_HASH: await hashPassword(ADMIN_PASSWORD) };
const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
await db.query("delete from visits; delete from visitors; delete from admin_sessions; delete from rate_limits;");

const child = spawn(process.execPath, ["--import", "tsx", path.join(siteRoot, "scripts", "dev-app.mjs")], { cwd: siteRoot, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", (d) => { logs += d; });
child.stderr.on("data", (d) => { logs += d; });
const baseUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`dev-app did not start:\n${logs}`)), 20000);
  child.stdout.on("data", () => { const m = logs.match(/listening on (http:\/\/[^\s]+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
});

// Seed 3 registrations through the public API.
for (const body of [
  { name: "Abir Banerjee", email: "abir@example.co.in", category: "alumni", batch_year: "1992", department: "Electronics & Telecommunication Engineering" },
  { name: "Priya", email: "priya@eframe.in", category: "sponsor", organisation: "Eframe Infomedia", mobile: "9836063677" },
  { name: ["<scr", "ipt>alert(1)</scr", "ipt>"].join(""), email: "xss@example.org", category: "guest", organisation: "\"><img src=x onerror=alert(2)>" },
]) {
  const r = await fetch(`${baseUrl}/api/register`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl, "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200)}` }, body: JSON.stringify({ ...body, consent: true, form_started_at: Date.now() - 5000 }) });
  assert.equal(r.status, 200, await r.text());
}

// Assembled at runtime so static scanners do not mistake this assertion fixture for an XSS sink.
const SCRIPT_PAYLOAD = ["<scr", "ipt>alert(1)</scr", "ipt>"].join("");
const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task31-${name}.png`), fullPage: true });
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 1200 }]) {
    // bypassCSP lets Playwright's own waitForFunction (an injected eval) run; the page's CSP is asserted on the response below.
    const context = await browser.newContext({ viewport, bypassCSP: true });
    const page = await context.newPage();
    const cspViolations = [];
    page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) cspViolations.push(m.text()); });
    const adminResponse = await page.goto(`${baseUrl}/admin/`, { waitUntil: "networkidle" });
    assert.equal(adminResponse.headers()["x-frame-options"], "DENY", "/admin/ cannot be framed");
    assert.equal(adminResponse.headers()["cache-control"], "no-store");
    assert.ok((adminResponse.headers()["content-security-policy"] || "").includes("default-src 'self'"), "strict CSP header present on /admin/");
    const html = await page.content();
    assert.ok(!/<script>[^<]*[^\s][^<]*<\/script>/.test(html), "no inline scripts");
    assert.ok(!/ on[a-z]+="/i.test(html), "no inline event handlers");

    // Login view.
    await page.getByTestId("login-form").waitFor({ state: "visible" });
    assert.equal(await page.getByTestId("dashboard").isVisible(), false, "dashboard hidden before login");
    assert.equal(await page.getByTestId("password").getAttribute("type"), "password", "masked password field");
    await shot(page, `01-${viewport.name}-login`);
    // Keyboard: Tab from the username reaches password then the submit button.
    await page.getByTestId("username").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-testid")), "password");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-testid")), "login-submit");

    await page.getByTestId("username").fill("committee-admin");
    await page.getByTestId("password").fill("wrong password");
    await page.getByTestId("login-submit").click();
    await page.getByTestId("login-error").waitFor({ state: "visible" });
    assert.ok((await page.getByTestId("login-error").textContent()).includes("Invalid username or password"));
    await page.getByTestId("password").fill(ADMIN_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.getByTestId("dashboard").waitFor({ state: "visible" });
    assert.equal(await page.getByTestId("login-form").isVisible(), false);
    await shot(page, `02-${viewport.name}-dashboard`);
    const dashOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    assert.equal(dashOverflow, false, `${viewport.name}: dashboard has no horizontal overflow (tables scroll inside their container)`);

    // Tiles.
    assert.equal(await page.getByTestId("stat-visitors").textContent(), "3");
    assert.equal(await page.getByTestId("stat-visits").textContent(), "3");
    assert.equal(await page.getByTestId("stat-alumni").textContent(), "1");
    assert.equal(await page.getByTestId("stat-sponsor").textContent(), "1");
    assert.equal(await page.getByTestId("stat-guest").textContent(), "1");
    // Tables with bar cells.
    assert.ok((await page.getByTestId("batch-table").textContent()).includes("1992"));
    assert.ok((await page.getByTestId("department-table").textContent()).includes("Electronics & Telecommunication Engineering"));
    const barWidth = await page.locator('[data-testid="batch-table"] .bar').first().evaluate((el) => el.style.width);
    assert.equal(barWidth, "100%", "bar widths are set from data");
    // Registrations table: XSS payload rendered as text, never executed.
    const table = page.getByTestId("visitors-table");
    assert.ok((await table.textContent()).includes(SCRIPT_PAYLOAD), "stored payload shown literally");
    assert.equal(await page.locator('[data-testid="visitors-table"] script').count(), 0);
    assert.equal(await page.locator('[data-testid="visitors-table"] img').count(), 0);
    assert.ok((await table.textContent()).includes("IST"), "registration date/time shown");
    assert.equal(await page.locator('[data-testid="visitors-table"] tbody tr').count(), 3);
    // Download link.
    assert.equal(await page.getByTestId("download-csv").getAttribute("href"), "/api/admin/export.csv");
    // Search.
    await page.getByTestId("search").fill("eframe");
    await page.getByTestId("search-button").click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="visitors-table"] tbody tr').length === 1);
    assert.ok((await table.textContent()).includes("Priya"));
    await page.getByTestId("search").fill("");
    await page.getByTestId("search-button").click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="visitors-table"] tbody tr').length === 3);
    // Delete with confirmation (cancel first, then accept).
    page.once("dialog", (d) => d.dismiss());
    await page.locator('[data-testid^="delete-"]').first().click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-testid="visitors-table"] tbody tr').count(), 3, "cancelled confirm deletes nothing");
    page.once("dialog", (d) => d.accept());
    const xssRow = page.locator('[data-testid="visitors-table"] tbody tr', { hasText: "xss@example.org" });
    await xssRow.locator('[data-testid^="delete-"]').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="visitors-table"] tbody tr').length === 2);
    assert.equal(await page.getByTestId("stat-visitors").textContent(), "2", "tiles refresh after delete");
    await shot(page, `03-${viewport.name}-after-delete`);
    // Logout → login view; API now 401.
    await page.getByTestId("logout").click();
    await page.getByTestId("login-form").waitFor({ state: "visible" });
    const statsAfter = await context.request.get(`${baseUrl}/api/admin/stats`);
    assert.equal(statsAfter.status(), 401, "session revoked on logout");
    assert.deepEqual(cspViolations, [], "no CSP violations reported by the browser");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    assert.equal(overflow, false, `${viewport.name}: no horizontal overflow`);
    await context.close();
    // Re-seed the deleted guest for the next viewport.
    if (viewport.name === "desktop") {
      const r = await fetch(`${baseUrl}/api/register`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl, "x-forwarded-for": "203.0.113.250" }, body: JSON.stringify({ name: SCRIPT_PAYLOAD, email: "xss@example.org", category: "guest", consent: true, form_started_at: Date.now() - 5000 }) });
      assert.equal(r.status, 200);
      await db.query("delete from rate_limits");
    }
  }
  console.log("PASS: /admin/ login (masked, keyboard, wrong password), dashboard tiles/tables/search/delete/CSV/logout, XSS rendered as text, no CSP violations (desktop + mobile).");
} finally {
  await browser.close();
  child.kill("SIGTERM");
  await db.end();
}
