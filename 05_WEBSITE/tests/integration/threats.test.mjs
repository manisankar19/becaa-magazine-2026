// Threat-table verification — Sprint v3 Task 32 (sprints/v3/PRD.md §5.7, sprints/v3/THREAT_CHECKS.md).
// Covers the rows not already exercised by Tasks 20–31, end-to-end through the handlers and the built site.
// Run with: node --env-file-if-exists=.env.local --import tsx tests/integration/threats.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { migrate } from "../../scripts/db-migrate.mjs";
import { siteRoot } from "../../scripts/lib.mjs";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
process.env.SESSION_SECRET ||= "threat-test-secret";
process.env.IP_HASH_SALT ||= "salt";
process.env.NODE_ENV = "development";
process.env.ADMIN_USERNAME = "committee-admin";
await migrate(process.env.DATABASE_URL);
const { hashPassword } = await import("../../lib/hash.ts");
process.env.ADMIN_PASSWORD_HASH = await hashPassword("correct horse battery staple");
const { default: register } = await import("../../api/register.ts");
const { default: login } = await import("../../api/admin/login.ts");
const { default: exportCsv } = await import("../../api/admin/export.csv.ts");
const { default: visitorById } = await import("../../api/admin/visitors/[id].ts");
const { closePool } = await import("../../lib/db.ts");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("delete from visits; delete from visitors; delete from admin_sessions; delete from rate_limits;");
const ORIGIN = "https://magazine.example";
const H = (extra = {}) => ({ host: "magazine.example", origin: ORIGIN, "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}`, ...extra });

// --- Mass assignment end-to-end: privileged/internal fields in the body never reach the row ---
let r = await register(new Request(`${ORIGIN}/api/register`, { method: "POST", headers: H(), body: JSON.stringify({ name: "Mass Assign", email: "mass@example.org", category: "guest", consent: true, form_started_at: Date.now() - 5000, visit_count: 999, privacy_version: 99, id: "00000000-0000-4000-8000-000000000000", created_at: "2000-01-01", role: "admin", is_admin: true }) }));
assert.equal(r.status, 200);
let row = (await db.query("select id, visit_count, privacy_version, created_at from visitors where email='mass@example.org'")).rows[0];
assert.equal(row.visit_count, 1);
assert.equal(row.privacy_version, 1);
assert.notEqual(row.id, "00000000-0000-4000-8000-000000000000");
assert.ok(Date.now() - new Date(row.created_at).getTime() < 60_000);

// --- Open redirect: a `next`/`redirect` parameter is ignored everywhere ---
r = await register(new Request(`${ORIGIN}/api/register?next=https://evil.example`, { method: "POST", redirect: "manual", headers: H({ "content-type": "application/x-www-form-urlencoded" }), body: new URLSearchParams({ name: "Redirect Try", email: "redir@example.org", category: "guest", consent: "on", form_started_at: String(Date.now() - 5000), next: "https://evil.example", redirect: "//evil.example" }).toString() }));
assert.equal(r.status, 303);
assert.equal(r.headers.get("location"), "/", "form post always lands on / regardless of next/redirect params");
r = await login(new Request(`${ORIGIN}/api/admin/login?next=https://evil.example`, { method: "POST", headers: H(), body: JSON.stringify({ username: "committee-admin", password: "correct horse battery staple", next: "https://evil.example" }) }));
assert.equal(r.status, 200);
assert.equal(r.headers.get("location"), null, "login never redirects");
const cookie = r.headers.get("set-cookie").split(";")[0];
const csrf = (await r.json()).csrf;

// --- CSRF: foreign Origin on a state-changing admin request is refused even with a valid session + token ---
const { rows: [{ id: victim }] } = await db.query("select id from visitors where email='mass@example.org'");
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${victim}`, { method: "DELETE", headers: { host: "magazine.example", origin: "https://evil.example", cookie, "x-csrf-token": csrf } }));
assert.equal(r.status, 403);
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${victim}`, { method: "DELETE", headers: { host: "magazine.example", referer: "https://evil.example/page", cookie, "x-csrf-token": csrf } }));
assert.equal(r.status, 403, "foreign Referer without Origin is refused too");
assert.equal((await db.query("select count(*)::int as n from visitors where id=$1", [victim])).rows[0].n, 1, "nothing deleted");
// The CSV export is a same-site GET with SameSite=Strict cookie; a cross-site page cannot read it. A foreign
// Origin header on a GET is simply not authenticated when the cookie is absent:
r = await exportCsv(new Request(`${ORIGIN}/api/admin/export.csv`, { headers: { host: "magazine.example", origin: "https://evil.example" } }));
assert.equal(r.status, 401);

// --- Stored XSS at the API layer: values are stored verbatim and returned as JSON strings (the admin UI renders with textContent — Task 31 E2E) ---
r = await register(new Request(`${ORIGIN}/api/register`, { method: "POST", headers: H(), body: JSON.stringify({ name: ["<scr", "ipt>alert(1)</scr", "ipt>"].join(""), email: "xss@example.org", category: "guest", consent: true, form_started_at: Date.now() - 5000 }) }));
assert.equal(r.status, 200);
const { default: visitors } = await import("../../api/admin/visitors.ts");
r = await visitors(new Request(`${ORIGIN}/api/admin/visitors?q=xss`, { headers: { host: "magazine.example", cookie } }));
assert.equal(r.headers.get("content-type"), "application/json; charset=utf-8", "JSON, never text/html, so a browser cannot render it as markup");
assert.equal(r.headers.get("x-content-type-options"), "nosniff");

// --- Session fixation / forged cookie: an attacker-chosen cookie value never authenticates ---
const { requireAdmin } = await import("../../lib/require-admin.ts");
assert.equal((await requireAdmin(new Request(`${ORIGIN}/x`, { headers: { cookie: "becaa_a=" + "A".repeat(43) } }))).ok, false);
const { verifyVisitorSession } = await import("../../lib/session.ts");
assert.equal(await verifyVisitorSession("eyJ2aXNpdG9yX2lkIjoieCJ9.AAAA", process.env.SESSION_SECRET), null);

// --- Visitor-list scraping: the built site contains no registration data and no secrets ---
const site = path.join(siteRoot, "_site");
assert.ok(fs.existsSync(site), "run npm run build first");
const seededEmails = (await db.query("select email from visitors")).rows.map((x) => x.email);
const built = spawnSync("grep", ["-rIl", "-e", "@example.org", "-e", "@example.co.in", "-e", "@eframe.in", site], { encoding: "utf8" }); // exit 1 = no matches
assert.equal(built.stdout.trim(), "", `built site must not contain test registrations: ${built.stdout}`);
for (const email of seededEmails) {
  const hit = spawnSync("grep", ["-rIl", email, site], { encoding: "utf8" });
  assert.equal(hit.stdout.trim(), "", `built site contains ${email}`);
}
assert.equal(spawnSync("grep", ["-rIlE", "SESSION_SECRET=|ADMIN_PASSWORD_HASH=|\\$argon2id\\$", site], { encoding: "utf8" }).stdout.trim(), "", "no secrets in the built site");
assert.ok(!fs.existsSync(path.join(site, "api")) && !fs.existsSync(path.join(site, "lib")), "server code is not published as static files");

// --- Secret leakage gates ---
assert.equal(spawnSync(process.execPath, ["scripts/check-secrets.mjs"], { cwd: siteRoot, encoding: "utf8" }).status, 0, "check:secrets passes");
assert.equal(spawnSync("git", ["ls-files", ".env.local"], { cwd: siteRoot, encoding: "utf8" }).stdout.trim(), "", ".env.local is not tracked");

// --- SQL injection gate over the source tree ---
const sqlGate = spawnSync(process.execPath, ["scripts/check-sql.mjs"], { cwd: siteRoot, encoding: "utf8" });
assert.equal(sqlGate.status, 0, `check:sql must pass on the current tree:\n${sqlGate.stdout}${sqlGate.stderr}`);
const fixtureDir = path.join(siteRoot, "lib", "__threat_fixture__");
fs.mkdirSync(fixtureDir, { recursive: true });
fs.writeFileSync(path.join(fixtureDir, "bad.ts"), "export async function bad(db: any, email: string) { return db.query(`select * from visitors where email = '${email}'`); }\n");
try {
  const failing = spawnSync(process.execPath, ["scripts/check-sql.mjs"], { cwd: siteRoot, encoding: "utf8" });
  assert.equal(failing.status, 1, "check:sql fails on template-literal SQL");
  assert.ok(failing.stderr.includes("__threat_fixture__/bad.ts"));
} finally {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}

await db.end();
await closePool();
console.log("PASS: threat checks — mass assignment, open redirect, cross-site delete/export, XSS at the API layer, forged cookies, no data/secrets/server code in _site, secret + SQL gates.");
