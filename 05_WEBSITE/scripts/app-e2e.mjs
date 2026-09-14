// Live-browser end-to-end suite for the registration application (Sprint v3 Task 33, PRD §5.9).
//   npm run e2e:app                          start scripts/dev-app.mjs against DATABASE_URL_TEST and test it
//   npm run e2e:app -- --base-url <url>      test an already-deployed preview (Task 35); needs
//                                            E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD in the environment
// Exits non-zero on the first failed assertion. Screenshots go to qa-output/app/.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureDir, siteRoot } from "./lib.mjs";

const args = process.argv.slice(2);
const baseUrlArg = args.includes("--base-url") ? args[args.indexOf("--base-url") + 1] : null;
const outDir = path.join(siteRoot, "qa-output", "app");
fs.rmSync(outDir, { recursive: true, force: true });
ensureDir(outDir);
const report = { generated: new Date().toISOString(), target: baseUrlArg ?? "local dev-app", steps: [] };
const step = (name, detail = "") => { report.steps.push({ name, detail }); console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`); };
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });

let child = null;
let baseUrl = baseUrlArg;
let adminUsername = process.env.E2E_ADMIN_USERNAME;
let adminPassword = process.env.E2E_ADMIN_PASSWORD;
let db = null;

if (!baseUrl) {
  const { migrate } = await import("./db-migrate.mjs");
  const { hashPassword } = await import("../lib/hash.ts");
  const pg = (await import("pg")).default;
  const DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
  await migrate(DATABASE_URL);
  db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  await db.query("delete from visits; delete from visitors; delete from admin_sessions; delete from rate_limits;");
  adminUsername = "e2e-admin";
  adminPassword = "e2e correct horse battery staple";
  const env = { ...process.env, DATABASE_URL, SESSION_SECRET: process.env.SESSION_SECRET || "e2e-session-secret", IP_HASH_SALT: process.env.IP_HASH_SALT || "e2e-salt", NODE_ENV: "development", PORT: "0", REGISTRATION_ENABLED: "true", ADMIN_USERNAME: adminUsername, ADMIN_PASSWORD_HASH: await hashPassword(adminPassword) };
  child = spawn(process.execPath, ["--import", "tsx", path.join(siteRoot, "scripts", "dev-app.mjs")], { cwd: siteRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  child.stdout.on("data", (d) => { logs += d; });
  child.stderr.on("data", (d) => { logs += d; });
  baseUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`dev-app did not start:\n${logs}`)), 20000);
    child.stdout.on("data", () => { const m = logs.match(/listening on (http:\/\/[^\s]+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`dev-app exited (${code}):\n${logs}`)); });
  });
}
if (!adminUsername || !adminPassword) throw new Error("E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD are required for --base-url runs.");
const isHttps = baseUrl.startsWith("https://");
const stamp = Date.now();
const people = {
  alumni: { name: "E2E Alumni", email: `e2e-alumni-${stamp}@example.org`, category: "alumni", batch_year: "1992", department: "Civil Engineering" },
  sponsor: { name: "E2E Sponsor", email: `e2e-sponsor-${stamp}@example.org`, category: "sponsor", organisation: "E2E Sponsor Ltd", mobile: "98360 63677" },
  guest: { name: "E2E Guest", email: `e2e-guest-${stamp}@example.org`, category: "guest" },
};

const browser = await chromium.launch();
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 1200 }]) {
    console.log(`\n${viewport.name} (${viewport.width}×${viewport.height}) against ${baseUrl}`);
    const context = await browser.newContext({ viewport, bypassCSP: true, ignoreHTTPSErrors: !isHttps });
    const page = await context.newPage();

    // 1. Unauthenticated visitor lands on the welcome content (URL unchanged: rewrite, not redirect).
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.getByTestId("register-form").waitFor({ state: "visible" });
    assert.ok(!(await page.content()).includes("With best compliments from"), "no magazine text before registration");
    await shot(page, `${viewport.name}-01-gate-welcome`);
    step("unauthenticated / shows the welcome page", `url ${page.url()}`);

    // 2. Invalid submission → field errors from the server.
    if (db) await db.query("delete from rate_limits");
    await page.getByTestId("name").fill("X");
    await page.getByTestId("email").fill("not-an-email");
    await page.getByTestId("category-alumni").check();
    await page.getByTestId("batch-year").fill("1949");
    await page.getByTestId("consent").check();
    await page.evaluate(() => document.querySelector('[data-testid="register-form"]').setAttribute("novalidate", "")); // let the server, not the browser, validate
    await page.waitForTimeout(2100); // past the server's minimum form-fill time, so we get field errors rather than the timing notice
    await page.getByTestId("submit").click();
    await page.getByTestId("error-email").waitFor({ state: "visible" });
    assert.ok(await page.getByTestId("error-name").isVisible());
    assert.ok(await page.getByTestId("error-batch_year").isVisible());
    assert.ok(await page.getByTestId("error-department").isVisible());
    await shot(page, `${viewport.name}-02-field-errors`);
    step("invalid submission shows server field errors");
    await context.close();

    // 3. Each category registers and opens the magazine. All requests in this suite share one IP, so the
    //    5-per-10-minute register limit (a feature, tested in tests/integration) would refuse the 6th call:
    //    locally the suite owns the test database and resets the limiter; against a remote preview the
    //    mobile pass reuses the desktop registrations instead of making more.
    const registrations = !baseUrlArg || viewport.name === "desktop" ? Object.entries(people) : [];
    if (baseUrlArg && viewport.name === "mobile") step("registrations skipped on mobile (remote per-IP rate limit)");
    for (const [kind, person] of registrations) {
      if (db) await db.query("delete from rate_limits");
      const ctx = await browser.newContext({ viewport, bypassCSP: true, ignoreHTTPSErrors: !isHttps });
      const p = await ctx.newPage();
      await p.goto(`${baseUrl}/welcome/`, { waitUntil: "networkidle" });
      await p.getByTestId("name").fill(person.name);
      await p.getByTestId("email").fill(viewport.name === "mobile" ? person.email.replace("@", "+m@") : person.email);
      await p.getByTestId(`category-${person.category}`).check();
      if (person.batch_year) { await p.getByTestId("batch-year").fill(person.batch_year); await p.getByTestId("department").selectOption(person.department); }
      if (person.organisation) await p.getByTestId("organisation").fill(person.organisation);
      if (person.mobile) await p.getByTestId("mobile").fill(person.mobile);
      await p.getByTestId("consent").check();
      await p.waitForTimeout(2100); // minimum form-fill time enforced server-side
      await p.getByTestId("submit").click();
      await p.waitForURL(`${baseUrl}/`);
      await p.waitForSelector("#cover-title");
      assert.equal(await p.locator("#cover-title").textContent(), "একই শিকড়", "cover title (Bengali) on the magazine");
      assert.equal(await p.locator(".publication-item").count(), 44, "44 publication items");
      assert.ok((await p.locator("#ART-012 .prose").textContent()).includes("প্যাঁড়া"), "Bengali story text renders");
      const cookie = (await ctx.cookies()).find((c) => c.name === "becaa_v");
      assert.ok(cookie, "visitor cookie set");
      assert.equal(cookie.httpOnly, true, "HttpOnly");
      assert.equal(cookie.sameSite, "Lax", "SameSite=Lax");
      assert.equal(cookie.secure, isHttps, `Secure flag ${isHttps ? "set" : "omitted locally"}`);
      const img = await ctx.request.get(`${baseUrl}/assets/normalized/advertisements/web/ADV-018-eframe-advertisement-web.jpg`);
      assert.equal(img.status(), 200, "artwork served with a session");
      await shot(p, `${viewport.name}-03-${kind}-magazine`);
      step(`${kind} registration opens the magazine`, `cookie flags ok`);
      await ctx.close();
    }

    // 4. A fresh context (no cookie) is refused on protected assets.
    const fresh = await browser.newContext({ viewport, ignoreHTTPSErrors: !isHttps });
    for (const asset of ["/assets/normalized/advertisements/web/ADV-018-eframe-advertisement-web.jpg", "/print/BECAA-2026-complete-review.pdf", "/assets/normalized/images/web/GAL-007-chatgpt-web.jpg"]) {
      const res = await fresh.request.get(`${baseUrl}${asset}`);
      assert.equal(res.status(), 403, `${asset} → 403 without a session`);
    }
    const printPage = await fresh.request.get(`${baseUrl}/print/`);
    assert.ok(!(await printPage.text()).includes("print-page--advertisement"), "print HTML not served without a session");
    await fresh.close();
    step("protected artwork, gallery image, PDF and print page refused without a session");

    // 5. Administrator flow.
    const admin = await browser.newContext({ viewport, bypassCSP: true, ignoreHTTPSErrors: !isHttps, acceptDownloads: true });
    const a = await admin.newPage();
    await a.goto(`${baseUrl}/admin/`, { waitUntil: "networkidle" });
    await a.getByTestId("username").fill(adminUsername);
    await a.getByTestId("password").fill(adminPassword);
    await a.getByTestId("login-submit").click();
    await a.getByTestId("dashboard").waitFor({ state: "visible" });
    const suffix = viewport.name === "mobile" && !baseUrlArg ? "+m@" : "@";
    const mine = (t) => t.includes(`e2e-alumni-${stamp}${suffix}`) || t.includes(`e2e-sponsor-${stamp}${suffix}`) || t.includes(`e2e-guest-${stamp}${suffix}`);
    await a.getByTestId("search").fill(`e2e-`);
    await a.getByTestId("search-button").click();
    await a.waitForFunction(() => document.querySelectorAll('[data-testid="visitors-table"] tbody tr').length >= 3);
    const visitorsTotal = Number(await a.getByTestId("stat-visitors").textContent());
    if (!baseUrlArg) {
      assert.equal(visitorsTotal, viewport.name === "desktop" ? 3 : 5, "dashboard counts the registrations made in this run (mobile run adds 3 more, minus 1 deleted)");
      assert.equal(await a.getByTestId("stat-alumni").textContent(), viewport.name === "desktop" ? "1" : "2");
    } else {
      assert.ok(visitorsTotal >= 3, "remote dashboard counts at least this run's registrations");
    }
    await shot(a, `${viewport.name}-04-admin-dashboard`);
    step("admin login and dashboard counts", `visitors=${visitorsTotal}`);
    await a.getByTestId("search").fill(people.sponsor.email.replace("@", suffix)); // exact email: the stamp alone matches both viewports' rows
    await a.getByTestId("search-button").click();
    await a.waitForFunction(() => document.querySelectorAll('[data-testid="visitors-table"] tbody tr').length === 1);
    assert.ok((await a.getByTestId("visitors-table").textContent()).includes("E2E Sponsor Ltd"));
    step("search finds one registration");
    // CSV via the authenticated context (download link) — parse and verify our rows are present.
    const csvRes = await admin.request.get(`${baseUrl}/api/admin/export.csv`);
    assert.equal(csvRes.status(), 200);
    const csv = await csvRes.text();
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    assert.equal(lines[0].split(",").length, 12, "12 approved columns");
    assert.ok(lines.some(mine), "CSV contains this run's registrations");
    assert.ok(!/ip_hash|token|user_agent/.test(lines[0]));
    fs.writeFileSync(path.join(outDir, `${viewport.name}-export.csv`), csv);
    step("CSV downloads and parses", `${lines.length - 1} rows`);
    // Delete the guest.
    await a.getByTestId("search").fill(people.guest.email.replace("@", suffix));
    await a.getByTestId("search-button").click();
    await a.waitForFunction(() => document.querySelectorAll('[data-testid="visitors-table"] tbody tr').length === 1);
    a.once("dialog", (d) => d.accept());
    await a.locator('[data-testid^="delete-"]').first().click();
    await a.waitForFunction((n) => Number(document.querySelector('[data-testid="stat-visitors"]').textContent) === n - 1, visitorsTotal);
    await shot(a, `${viewport.name}-05-after-delete`);
    step("delete removes a registration and refreshes counts");
    await a.getByTestId("logout").click();
    await a.getByTestId("login-form").waitFor({ state: "visible" });
    const statsAfter = await admin.request.get(`${baseUrl}/api/admin/stats`);
    assert.equal(statsAfter.status(), 401, "stats is 401 after logout");
    step("logout revokes the session");
    await admin.close();
  }
  fs.writeFileSync(path.join(outDir, "app-e2e.json"), JSON.stringify({ ...report, result: "pass" }, null, 2));
  console.log(`\nPASS: application E2E (${report.steps.length} steps) — screenshots in qa-output/app/`);
} catch (error) {
  fs.writeFileSync(path.join(outDir, "app-e2e.json"), JSON.stringify({ ...report, result: "fail", error: String(error?.message ?? error) }, null, 2));
  console.error(`\nFAIL: ${error?.stack ?? error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (child) child.kill("SIGTERM");
  if (db) await db.end();
}
