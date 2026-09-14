// Integration test for api/admin/stats.ts, api/admin/visitors.ts, api/admin/visitors/[id].ts, lib/admin-queries.ts — Sprint v3 Task 29.
// Run with: node --env-file-if-exists=.env.local --import tsx tests/integration/admin-queries.test.mjs
import assert from "node:assert/strict";
import pg from "pg";
import { migrate } from "../../scripts/db-migrate.mjs";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
process.env.SESSION_SECRET ||= "admin-test-secret";
process.env.IP_HASH_SALT ||= "salt";
process.env.NODE_ENV = "development";
process.env.ADMIN_USERNAME = "committee-admin";
await migrate(process.env.DATABASE_URL);
const { hashPassword } = await import("../../lib/hash.ts");
process.env.ADMIN_PASSWORD_HASH = await hashPassword("correct horse battery staple");

const { default: login } = await import("../../api/admin/login.ts");
const { default: stats } = await import("../../api/admin/stats.ts");
const { default: visitors } = await import("../../api/admin/visitors.ts");
const { default: visitorById } = await import("../../api/admin/visitors/[id].ts");
const { formatIst } = await import("../../lib/admin-queries.ts");
const { closePool } = await import("../../lib/db.ts");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("delete from visits; delete from visitors; delete from admin_sessions; delete from rate_limits;");

// --- seed 6 visitors + visits ---
const seed = [
  ["Abir Banerjee", "abir@example.co.in", "alumni", 1992, "Electronics & Telecommunication Engineering", null, null, null],
  ["Manik Barman", "manik@example.org", "alumni", 1987, "Civil Engineering", null, null, null],
  ["Kallol Roy", "kallol@example.org", "alumni", 1991, "Civil Engineering", null, null, null],
  ["Naval Person", "naval@example.org", "alumni", 1991, "Other", "Naval Architecture", null, null],
  ["Priya", "priya@eframe.in", "sponsor", null, null, null, "Eframe Infomedia", "9836063677"],
  ["সিদ্ধার্থ মুখোপাধ্যায়", "sid@example.org", "guest", null, null, null, "Rotary", null],
];
const ids = {};
for (const [name, email, category, batch, dept, other, org, mobile] of seed) {
  const { rows } = await db.query("insert into visitors(name,email,category,batch_year,department,department_other,organisation,mobile,consent_at,privacy_version) values ($1,$2,$3,$4,$5,$6,$7,$8,now(),1) returning id", [name, email, category, batch, dept, other, org, mobile]);
  ids[email] = rows[0].id;
  await db.query("insert into visits(visitor_id, ip_hash, user_agent) values ($1, repeat('a',64), 'UA')", [rows[0].id]);
}
await db.query("insert into visits(visitor_id, ip_hash, user_agent) values ($1, repeat('b',64), 'UA')", [ids["abir@example.co.in"]]); // 7 visits total
await db.query("update visitors set visit_count = 2 where email = 'abir@example.co.in'");

const ORIGIN = "https://magazine.example";
const r0 = await login(new Request(`${ORIGIN}/api/admin/login`, { method: "POST", headers: { host: "magazine.example", origin: ORIGIN, "content-type": "application/json", "x-forwarded-for": "198.51.100.9" }, body: JSON.stringify({ username: "committee-admin", password: "correct horse battery staple" }) }));
const loginText = await r0.text();
assert.equal(r0.status, 200, loginText);
const cookie = r0.headers.get("set-cookie").split(";")[0];
const csrf = JSON.parse(loginText).csrf;
const get = (handler, path) => handler(new Request(`${ORIGIN}${path}`, { headers: { host: "magazine.example", cookie } }));

// --- unauthenticated → 401 everywhere ---
assert.equal((await stats(new Request(`${ORIGIN}/api/admin/stats`))).status, 401);
assert.equal((await visitors(new Request(`${ORIGIN}/api/admin/visitors`))).status, 401);
assert.equal((await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${ids["sid@example.org"]}`, { method: "DELETE", headers: { origin: ORIGIN, host: "magazine.example", "x-csrf-token": csrf } }))).status, 401);

// --- stats ---
let r = await get(stats, "/api/admin/stats");
assert.equal(r.status, 200);
assert.equal(r.headers.get("cache-control"), "no-store");
const s = await r.json();
assert.equal(s.visitors_total, 6);
assert.equal(s.visits_total, 7);
assert.deepEqual(s.by_category, { alumni: 4, sponsor: 1, guest: 1 });
assert.deepEqual(s.by_batch_year, [{ batch_year: 1987, count: 1 }, { batch_year: 1991, count: 2 }, { batch_year: 1992, count: 1 }]);
assert.deepEqual(s.by_department, [{ department: "Civil Engineering", count: 2 }, { department: "Electronics & Telecommunication Engineering", count: 1 }, { department: "Other", count: 1 }], "Other is grouped as Other, sorted by count then name");
assert.equal(s.latest.length, 6);
assert.match(s.latest[0].registered_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} IST$/, "IST timestamps");
assert.deepEqual(Object.keys(s.latest[0]).sort(), ["category", "email", "id", "name", "registered_at"]);
assert.match(formatIst(new Date("2026-09-14T04:30:00Z")), /^2026-09-14 10:00 IST$/);

// --- search + pagination ---
r = await get(visitors, "/api/admin/visitors");
assert.equal(r.status, 200);
let list = await r.json();
assert.equal(list.total, 6);
assert.equal(list.page, 1);
assert.equal(list.per_page, 50);
assert.equal(list.rows.length, 6);
const row = list.rows.find((x) => x.email === "priya@eframe.in");
assert.deepEqual(Object.keys(row).sort(), ["batch_year", "category", "department", "department_other", "email", "id", "last_seen_at", "mobile", "name", "organisation", "registered_at", "visit_count"], "approved fields only");
assert.ok(!JSON.stringify(list).match(/ip_hash|user_agent|token|password|consent_at/), "no internal fields");
r = await get(visitors, "/api/admin/visitors?q=eframe");
list = await r.json();
assert.equal(list.total, 1, "search matches organisation");
assert.equal(list.rows[0].name, "Priya");
r = await get(visitors, "/api/admin/visitors?q=ABIR");
assert.equal((await r.json()).total, 1, "case-insensitive name/email search");
r = await get(visitors, `/api/admin/visitors?q=${encodeURIComponent("সিদ্ধার্থ")}`);
assert.equal((await r.json()).rows[0].email, "sid@example.org", "Bengali search");
r = await get(visitors, `/api/admin/visitors?q=${encodeURIComponent("%")}`);
assert.equal((await r.json()).total, 0, "LIKE wildcards are escaped, not interpreted");
r = await get(visitors, `/api/admin/visitors?q=${encodeURIComponent("' OR 1=1 --")}`);
assert.equal(r.status, 200);
assert.equal((await r.json()).total, 0, "SQL injection attempt is just a string");
r = await get(visitors, "/api/admin/visitors?page=2");
list = await r.json();
assert.equal(list.page, 2);
assert.equal(list.rows.length, 0, "page 2 of 6 rows is empty");
assert.equal(list.total, 6);
r = await get(visitors, "/api/admin/visitors?page=abc");
assert.equal((await r.json()).page, 1, "bad page → 1");
r = await get(visitors, `/api/admin/visitors?q=${"x".repeat(500)}`);
assert.equal(r.status, 400, "over-long query refused");

// --- delete (CSRF + same-origin) ---
const target = ids["naval@example.org"];
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${target}`, { method: "DELETE", headers: { host: "magazine.example", origin: ORIGIN, cookie } }));
assert.equal(r.status, 403, "delete without CSRF refused");
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${target}`, { method: "DELETE", headers: { host: "magazine.example", origin: "https://evil.example", cookie, "x-csrf-token": csrf } }));
assert.equal(r.status, 403, "delete from a foreign origin refused");
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/not-a-uuid`, { method: "DELETE", headers: { host: "magazine.example", origin: ORIGIN, cookie, "x-csrf-token": csrf } }));
assert.equal(r.status, 400);
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${target}`, { method: "DELETE", headers: { host: "magazine.example", origin: ORIGIN, cookie, "x-csrf-token": csrf } }));
assert.equal(r.status, 200);
assert.deepEqual(await r.json(), { ok: true, deleted: 1 });
assert.equal((await db.query("select count(*)::int as n from visitors")).rows[0].n, 5);
assert.equal((await db.query("select count(*)::int as n from visits where visitor_id=$1", [target])).rows[0].n, 0, "visits cascade");
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${target}`, { method: "DELETE", headers: { host: "magazine.example", origin: ORIGIN, cookie, "x-csrf-token": csrf } }));
assert.equal(r.status, 404, "already gone");
r = await visitorById(new Request(`${ORIGIN}/api/admin/visitors/${target}`, { method: "GET", headers: { cookie } }));
assert.equal(r.status, 405);
const s2 = await (await get(stats, "/api/admin/stats")).json();
assert.equal(s2.visitors_total, 5);
assert.deepEqual(s2.by_department, [{ department: "Civil Engineering", count: 2 }, { department: "Electronics & Telecommunication Engineering", count: 1 }]);

await db.end();
await closePool();
console.log("PASS: admin stats (totals, category/batch/department aggregates, IST latest), search/pagination (escaped LIKE, injection-safe, approved fields only), CSRF-guarded delete.");
