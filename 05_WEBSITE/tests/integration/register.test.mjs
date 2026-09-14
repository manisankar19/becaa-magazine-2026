// Integration test for api/register.ts, api/health.ts, lib/visitors.ts — Sprint v3 Task 23.
// Calls the Web-standard handlers directly with Request objects against becaa_test.
// Run with: node --env-file-if-exists=.env.local --import tsx tests/integration/register.test.mjs
import assert from "node:assert/strict";
import pg from "pg";
import { migrate } from "../../scripts/db-migrate.mjs";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
process.env.SESSION_SECRET ||= "test-session-secret-not-real";
process.env.IP_HASH_SALT ||= "test-salt";
process.env.NODE_ENV = "development";
delete process.env.REGISTRATION_ENABLED;

const { default: register } = await import("../../api/register.ts");
const { default: health } = await import("../../api/health.ts");
const { closePool } = await import("../../lib/db.ts");
const { verifyVisitorSession, parseCookies } = await import("../../lib/session.ts");

await migrate(process.env.DATABASE_URL);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("delete from visits; delete from visitors; delete from rate_limits;");

const ORIGIN = "https://magazine.example";
const started = () => Date.now() - 5000;
function post(body, { origin = ORIGIN, ip = "203.0.113.5", form = false, ua = "UnitTest/1.0" } = {}) {
  const headers = { host: "magazine.example", "x-forwarded-for": ip, "user-agent": ua };
  if (origin !== null) headers.origin = origin;
  headers["content-type"] = form ? "application/x-www-form-urlencoded" : "application/json";
  const payload = form ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString() : JSON.stringify(body);
  return register(new Request(`${ORIGIN}/api/register`, { method: "POST", headers, body: payload }));
}
const alumni = { name: "Abir Banerjee", email: "Abir@Example.co.in", category: "alumni", batch_year: "1992", department: "Electronics & Telecommunication Engineering", consent: true, form_started_at: started() };

// --- health ---
const h = await health(new Request(`${ORIGIN}/api/health`));
assert.equal(h.status, 200);
assert.deepEqual(await h.json(), { ok: true, db: true });
assert.equal(h.headers.get("cache-control"), "no-store");

// --- new visitor ---
let r = await post(alumni);
const firstBody = await r.text(); // read once; the body cannot be consumed twice
assert.equal(r.status, 200, firstBody);
assert.deepEqual(JSON.parse(firstBody), { ok: true });
const setCookie = r.headers.get("set-cookie");
assert.ok(setCookie && setCookie.startsWith("becaa_v="), "visitor cookie set");
for (const flag of ["HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=2592000"]) assert.ok(setCookie.includes(flag), flag);
assert.ok(!setCookie.includes("Secure"), "NODE_ENV=development → no Secure flag locally");
const cookieValue = parseCookies(setCookie.split(";")[0]).becaa_v;
const session = await verifyVisitorSession(cookieValue, process.env.SESSION_SECRET);
assert.ok(session, "cookie verifies with the server secret");
let rows = (await db.query("select * from visitors")).rows;
assert.equal(rows.length, 1);
assert.equal(rows[0].email, "abir@example.co.in", "email stored lower-cased");
assert.equal(rows[0].id, session.visitor_id, "cookie carries the visitor id");
assert.equal(rows[0].visit_count, 1);
assert.equal(rows[0].privacy_version, 1);
assert.ok(rows[0].consent_at instanceof Date);
let visits = (await db.query("select * from visits")).rows;
assert.equal(visits.length, 1);
assert.match(visits[0].ip_hash, /^[0-9a-f]{64}$/, "only a salted hash of the IP is stored");
assert.ok(!JSON.stringify(visits[0]).includes("203.0.113.5"), "raw IP never stored");
assert.equal(visits[0].user_agent, "UnitTest/1.0");

// --- repeat visitor (same email, different case, changed name) ---
r = await post({ ...alumni, email: "ABIR@example.co.in", name: "Abir B.", form_started_at: started() }, { ip: "203.0.113.6" });
assert.equal(r.status, 200);
rows = (await db.query("select * from visitors")).rows;
assert.equal(rows.length, 1, "no duplicate row for the same email");
assert.equal(rows[0].name, "Abir B.", "editable fields updated");
assert.equal(rows[0].visit_count, 2, "visit_count incremented");
assert.equal((await db.query("select count(*)::int as n from visits")).rows[0].n, 2);

// --- sponsor and guest ---
r = await post({ name: "Priya", email: "priya@eframe.in", category: "sponsor", organisation: "Eframe", mobile: "+91 98360 63677", consent: "on", form_started_at: started() }, { ip: "203.0.113.7" });
assert.equal(r.status, 200);
assert.equal((await db.query("select mobile from visitors where email='priya@eframe.in'")).rows[0].mobile, "9836063677");
r = await post({ name: "Guest", email: "g@x.org", category: "guest", consent: true, form_started_at: started() }, { ip: "203.0.113.8" });
assert.equal(r.status, 200);

// --- validation failure: 422, field errors, no echo ---
r = await post({ name: "", email: "not-an-email-ZZZ", category: "alumni", consent: false, form_started_at: started() }, { ip: "203.0.113.9" });
assert.equal(r.status, 422);
const body = await r.json();
assert.equal(body.ok, false);
assert.ok(body.errors.name && body.errors.email && body.errors.batch_year && body.errors.department && body.errors.consent);
assert.ok(!JSON.stringify(body).includes("not-an-email-ZZZ"), "raw input is not echoed");
assert.equal((await db.query("select count(*)::int as n from visitors")).rows[0].n, 3, "nothing written on validation failure");

// --- honeypot: silent 200, no write, no cookie ---
r = await post({ ...alumni, email: "bot@example.org", website: "http://spam.example", form_started_at: started() }, { ip: "203.0.113.10" });
assert.equal(r.status, 200);
assert.equal(r.headers.get("set-cookie"), null, "no session for honeypot submissions");
assert.equal((await db.query("select count(*)::int as n from visitors where email='bot@example.org'")).rows[0].n, 0);

// --- too fast (form_started_at < 2 s ago) ---
r = await post({ ...alumni, email: "fast@example.org", form_started_at: Date.now() - 500 }, { ip: "203.0.113.11" });
assert.equal(r.status, 422);
assert.ok((await r.json()).errors.form);

// --- foreign Origin → 403; missing Origin/Referer → 403 ---
r = await post({ ...alumni, email: "csrf@example.org", form_started_at: started() }, { origin: "https://evil.example", ip: "203.0.113.12" });
assert.equal(r.status, 403);
r = await post({ ...alumni, email: "csrf2@example.org", form_started_at: started() }, { origin: null, ip: "203.0.113.13" });
assert.equal(r.status, 403);
assert.equal((await db.query("select count(*)::int as n from visitors where email like 'csrf%'")).rows[0].n, 0);

// --- oversized body → 413; malformed JSON → 400 ---
r = await post({ ...alumni, email: "big@example.org", organisation: "x".repeat(9000), form_started_at: started() }, { ip: "203.0.113.14" });
assert.equal(r.status, 413);
r = await register(new Request(`${ORIGIN}/api/register`, { method: "POST", headers: { host: "magazine.example", origin: ORIGIN, "content-type": "application/json", "x-forwarded-for": "203.0.113.15" }, body: "{oops" }));
assert.equal(r.status, 400);

// --- rate limit: 5 per 10 minutes per IP hash → 6th is 429 ---
const statuses = [];
for (let i = 0; i < 6; i++) { const rr = await post({ ...alumni, email: `rl${i}@example.org`, form_started_at: started() }, { ip: "203.0.113.99" }); statuses.push(rr.status); if (rr.status === 429) assert.ok(Number(rr.headers.get("retry-after")) > 0, "429 carries Retry-After"); }
assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);

// --- classic form post (no JS): 303 to / with cookie; on error 303 back to /welcome/ ---
r = await post({ name: "Form User", email: "form@example.org", category: "guest", consent: "on", form_started_at: started() }, { form: true, ip: "203.0.113.20" });
assert.equal(r.status, 303);
assert.equal(r.headers.get("location"), "/");
assert.ok(r.headers.get("set-cookie")?.startsWith("becaa_v="));
r = await post({ name: "", email: "x", category: "guest", form_started_at: started() }, { form: true, ip: "203.0.113.21" });
assert.equal(r.status, 303);
assert.match(r.headers.get("location"), /^\/welcome\/\?error=/);

// --- method / disabled flag ---
r = await register(new Request(`${ORIGIN}/api/register`, { method: "GET" }));
assert.equal(r.status, 405);
process.env.REGISTRATION_ENABLED = "false";
r = await post({ ...alumni, email: "closed@example.org", form_started_at: started() }, { ip: "203.0.113.30" });
assert.equal(r.status, 503);
assert.ok((await r.json()).error);
delete process.env.REGISTRATION_ENABLED;

await db.end();
await closePool();
console.log("PASS: /api/register (new, repeat, sponsor/guest, 422, honeypot, timing, 403, 413/400, 429, form fallback, 405, 503) and /api/health.");
