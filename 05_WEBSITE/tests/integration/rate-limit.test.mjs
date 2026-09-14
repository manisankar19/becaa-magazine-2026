// Integration test for lib/rate-limit.ts + lib/http.ts — Sprint v3 Task 22.
// Runs against becaa_test (npm run db:local:start; migrations applied by the test).
// Run with: node --env-file-if-exists=.env.local --import tsx tests/integration/rate-limit.test.mjs
import assert from "node:assert/strict";
import pg from "pg";
import { migrate } from "../../scripts/db-migrate.mjs";
import { consume, recordLoginFailure, clearLoginFailures, isLockedOut } from "../../lib/rate-limit.ts";
import { json, html, text, securityHeaders, assertSameOrigin, readJsonBody, MAX_BODY_BYTES } from "../../lib/http.ts";

const url = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
await migrate(url);
const db = new pg.Pool({ connectionString: url, max: 8 }); // a pool, so the concurrency check really runs in parallel
await db.query("delete from rate_limits");

// --- sliding window: 5 per 10 minutes for register ---
const t0 = Date.UTC(2026, 8, 14, 10, 0, 0);
const results = [];
for (let i = 0; i < 6; i++) results.push(await consume(db, "register:iphash-a", 5, 600, t0 + i * 1000));
assert.deepEqual(results.map((r) => r.allowed), [true, true, true, true, true, false], "6th call within the window is refused");
assert.equal(results[5].retryAfterSeconds > 0 && results[5].retryAfterSeconds <= 600, true, "retry-after is within the window");
assert.equal(results[4].remaining, 0);
assert.equal((await db.query("select count(*)::int as n from rate_limits")).rows[0].n, 1, "one row per bucket, no row per hit");
// A different bucket is independent.
assert.equal((await consume(db, "register:iphash-b", 5, 600, t0)).allowed, true);
// The window resets after windowSeconds.
assert.equal((await consume(db, "register:iphash-a", 5, 600, t0 + 601 * 1000)).allowed, true, "window reset after 10 minutes");
assert.equal((await consume(db, "register:iphash-a", 5, 600, t0 + 601 * 1000)).remaining, 3);
// Concurrency: 20 parallel hits on a fresh bucket with limit 10 → exactly 10 allowed (single upsert statement, no race).
const parallel = await Promise.all(Array.from({ length: 20 }, () => consume(db, "register:parallel", 10, 600, t0))); // 8 connections contend on one row
assert.equal(parallel.filter((r) => r.allowed).length, 10, "atomic upsert admits exactly `limit` concurrent requests");

// --- login lockout: 10 failures → locked for 15 minutes; success clears ---
for (let i = 0; i < 9; i++) await recordLoginFailure(db, "login:admin", 10, 900, t0 + i * 1000);
assert.equal(await isLockedOut(db, "login:admin", 10, 900, t0 + 10_000), false, "9 failures: not locked");
await recordLoginFailure(db, "login:admin", 10, 900, t0 + 10_000);
assert.equal(await isLockedOut(db, "login:admin", 10, 900, t0 + 11_000), true, "10th failure locks");
assert.equal(await isLockedOut(db, "login:admin", 10, 900, t0 + 901 * 1000), false, "lockout expires after 15 minutes");
await recordLoginFailure(db, "login:admin", 10, 900, t0 + 2_000_000);
await clearLoginFailures(db, "login:admin");
assert.equal((await db.query("select count(*)::int as n from rate_limits where bucket='login:admin'")).rows[0].n, 0, "success clears the failure counter");

// --- HTTP helpers ---
const r1 = json({ ok: true }, { status: 200, path: "/api/register" });
assert.equal(r1.status, 200);
assert.equal(r1.headers.get("content-type"), "application/json; charset=utf-8");
assert.equal(r1.headers.get("cache-control"), "no-store", "API responses are never cached");
assert.equal(r1.headers.get("content-security-policy"), "default-src 'self'");
assert.equal(r1.headers.get("x-content-type-options"), "nosniff");
assert.equal(r1.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
assert.equal(await r1.json().then((b) => b.ok), true);
const r2 = json({ ok: false }, { status: 422, path: "/api/admin/login" });
assert.equal(r2.headers.get("x-frame-options"), "DENY", "admin responses forbid framing");
assert.equal(r2.status, 422);
const r3 = html("<p>hi</p>", { path: "/admin/" });
assert.equal(r3.headers.get("content-type"), "text/html; charset=utf-8");
assert.equal(r3.headers.get("x-frame-options"), "DENY");
assert.equal(r3.headers.get("cache-control"), "no-store");
const r4 = text("ok", { path: "/welcome/" });
assert.equal(r4.headers.get("x-frame-options"), null, "public pages are not framed-blocked by the helper");
assert.equal(r4.headers.get("cache-control"), null, "non-API, non-admin responses keep default caching");
assert.equal(new Headers(securityHeaders("/api/x")).get("cache-control"), "no-store");

// same-origin: Origin (preferred) or Referer must match the request host.
const req = (headers, u = "https://magazine.example/api/register") => new Request(u, { method: "POST", headers });
assert.equal(assertSameOrigin(req({ origin: "https://magazine.example" })), true);
assert.equal(assertSameOrigin(req({ referer: "https://magazine.example/welcome/" })), true);
assert.equal(assertSameOrigin(req({ origin: "https://evil.example" })), false, "foreign Origin refused");
assert.equal(assertSameOrigin(req({ origin: "null" })), false);
assert.equal(assertSameOrigin(req({})), false, "missing Origin and Referer refused for POST");
assert.equal(assertSameOrigin(req({ "x-forwarded-host": "magazine.example", origin: "https://magazine.example" }, "https://internal.local/api/register")), true, "x-forwarded-host is honoured behind the platform proxy");
assert.equal(assertSameOrigin(new Request("https://magazine.example/api/health", { method: "GET" })), true, "GET requests are not subject to the check");

// body cap: 8 KB, malformed JSON, non-object JSON.
assert.equal(MAX_BODY_BYTES, 8192);
const small = await readJsonBody(new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a: 1 }) }));
assert.deepEqual(small, { ok: true, value: { a: 1 } });
const big = await readJsonBody(new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a: "x".repeat(9000) }) }));
assert.deepEqual(big, { ok: false, status: 413 });
const bad = await readJsonBody(new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" }));
assert.deepEqual(bad, { ok: false, status: 400 });
const arr = await readJsonBody(new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/json" }, body: "[1,2]" }));
assert.deepEqual(arr, { ok: false, status: 400 });
const form = await readJsonBody(new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "name=A+B&consent=on" }));
assert.deepEqual(form, { ok: true, value: { name: "A B", consent: "on" }, form: true }, "classic form posts are accepted too (no-JS fallback)");

await db.end();
console.log("PASS: sliding-window rate limit (6th refused, reset, atomic under concurrency), login lockout, security headers, same-origin, body cap.");
