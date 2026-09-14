// Integration test for api/admin/login.ts, api/admin/logout.ts, lib/require-admin.ts, scripts/admin-hash.mjs — Sprint v3 Task 28.
// Run with: node --env-file-if-exists=.env.local --import tsx tests/integration/admin-auth.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { migrate } from "../../scripts/db-migrate.mjs";
import { siteRoot } from "../../scripts/lib.mjs";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
process.env.SESSION_SECRET ||= "admin-test-secret";
process.env.IP_HASH_SALT ||= "salt";
process.env.NODE_ENV = "development";
await migrate(process.env.DATABASE_URL);

// The hash tool must work non-interactively (password on stdin) so it can be tested; interactively it masks input.
const tool = spawnSync(process.execPath, [path.join(siteRoot, "scripts", "admin-hash.mjs")], { input: "correct horse battery staple\n", encoding: "utf8" });
assert.equal(tool.status, 0, tool.stderr);
const hash = tool.stdout.trim().split("\n").pop();
assert.match(hash, /^\$argon2id\$/, "admin:hash prints an argon2id hash");
assert.ok(!tool.stdout.includes("correct horse"), "the tool never echoes the password");
process.env.ADMIN_USERNAME = "committee-admin";
process.env.ADMIN_PASSWORD_HASH = hash;

const { default: login } = await import("../../api/admin/login.ts");
const { default: logout } = await import("../../api/admin/logout.ts");
const { requireAdmin } = await import("../../lib/require-admin.ts");
const { closePool } = await import("../../lib/db.ts");
const { verifyCsrf } = await import("../../lib/csrf.ts");
const { hashToken } = await import("../../lib/admin-session.ts");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("delete from admin_sessions; delete from rate_limits;");

const ORIGIN = "https://magazine.example";
const post = (path, body, { origin = ORIGIN, ip = "198.51.100.1", cookie } = {}) => {
  const headers = { host: "magazine.example", "x-forwarded-for": ip, "content-type": "application/json" };
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  return (path === "/api/admin/login" ? login : logout)(new Request(`${ORIGIN}${path}`, { method: "POST", headers, body: JSON.stringify(body) }));
};
const cookieOf = (r) => r.headers.get("set-cookie")?.split(";")[0];

// --- success ---
let r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" });
const firstText = await r.text(); // read once
assert.equal(r.status, 200, firstText);
const setCookie = r.headers.get("set-cookie");
assert.ok(setCookie.startsWith("becaa_a="));
for (const flag of ["HttpOnly", "SameSite=Strict", "Path=/"]) assert.ok(setCookie.includes(flag), flag);
assert.ok(!setCookie.includes("Max-Age"), "session cookie, server-side expiry");
assert.ok(!setCookie.includes("Secure"), "no Secure flag in development");
assert.equal(r.headers.get("cache-control"), "no-store");
assert.equal(r.headers.get("x-frame-options"), "DENY");
const okBody = JSON.parse(firstText);
assert.equal(okBody.ok, true);
assert.match(okBody.csrf, /^[A-Za-z0-9_-]{43}$/, "login returns the CSRF token for this session");
const token = cookieOf(r).slice("becaa_a=".length);
assert.equal(await verifyCsrf(okBody.csrf, await hashToken(token), process.env.SESSION_SECRET), true);
assert.equal((await db.query("select count(*)::int as n from admin_sessions")).rows[0].n, 1);
assert.ok(!(await db.query("select token_hash from admin_sessions")).rows[0].token_hash.includes(token), "raw token never stored");

// requireAdmin resolves the session and refreshes it.
const auth = await requireAdmin(new Request(`${ORIGIN}/api/admin/stats`, { headers: { cookie: `becaa_a=${token}` } }));
assert.ok(auth.ok, "valid cookie authenticates");
assert.equal(typeof auth.tokenHash, "string");
const unauth = await requireAdmin(new Request(`${ORIGIN}/api/admin/stats`));
assert.equal(unauth.ok, false);
assert.equal(unauth.response.status, 401);
assert.equal(unauth.response.headers.get("cache-control"), "no-store");

// --- second login rotates the session: the first token is dead ---
r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" });
assert.equal(r.status, 200);
const token2 = cookieOf(r).slice("becaa_a=".length);
assert.equal((await requireAdmin(new Request(`${ORIGIN}/x`, { headers: { cookie: `becaa_a=${token}` } }))).ok, false, "old session rotated out");
assert.equal((await db.query("select count(*)::int as n from admin_sessions")).rows[0].n, 1);

// --- wrong password and unknown user: identical status and body ---
const wrong = await post("/api/admin/login", { username: "committee-admin", password: "nope" }, { ip: "198.51.100.2" });
const unknown = await post("/api/admin/login", { username: "someone-else", password: "correct horse battery staple" }, { ip: "198.51.100.2" });
assert.equal(wrong.status, 401);
assert.equal(unknown.status, 401);
const wrongText = await wrong.text(); // read once, reused below
assert.equal(wrongText, await unknown.text(), "no user enumeration through the response");
assert.equal(wrong.headers.get("set-cookie"), null);

// --- foreign origin / missing fields / method ---
r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" }, { origin: "https://evil.example", ip: "198.51.100.3" });
assert.equal(r.status, 403);
r = await post("/api/admin/login", { username: "committee-admin" }, { ip: "198.51.100.3" });
assert.equal(r.status, 400);
r = await login(new Request(`${ORIGIN}/api/admin/login`, { method: "GET" }));
assert.equal(r.status, 405);

// --- rate limit: 5 attempts per 15 min per IP → 429 with Retry-After ---
const statuses = [];
for (let i = 0; i < 6; i++) { const rr = await post("/api/admin/login", { username: "committee-admin", password: "wrong" }, { ip: "198.51.100.50" }); statuses.push(rr.status); }
assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);

// --- lockout: after 10 failures for the username, even the correct password is refused ---
await db.query("delete from rate_limits");
for (let i = 0; i < 10; i++) await post("/api/admin/login", { username: "committee-admin", password: "wrong" }, { ip: `198.51.100.${60 + i}` });
r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" }, { ip: "198.51.100.99" });
assert.equal(r.status, 429, "locked out after 10 failures even with the correct password");
assert.ok(Number(r.headers.get("retry-after")) > 0);
await db.query("delete from rate_limits");
r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" }, { ip: "198.51.100.99" });
assert.equal(r.status, 200, "clear lockout → login works again");
const token3 = cookieOf(r).slice("becaa_a=".length);
const csrf3 = (await r.json()).csrf;

// --- logout requires the session + CSRF token, then invalidates ---
r = await post("/api/admin/logout", {}, { cookie: `becaa_a=${token3}` });
assert.equal(r.status, 403, "logout without CSRF token refused");
r = await post("/api/admin/logout", { csrf: csrf3 }, { cookie: `becaa_a=${token3}`, origin: "https://evil.example" });
assert.equal(r.status, 403, "logout from a foreign origin refused");
r = await post("/api/admin/logout", { csrf: csrf3 }, { cookie: `becaa_a=${token3}` });
assert.equal(r.status, 200);
assert.ok(r.headers.get("set-cookie").includes("Max-Age=0"), "cookie cleared");
assert.equal((await requireAdmin(new Request(`${ORIGIN}/x`, { headers: { cookie: `becaa_a=${token3}` } }))).ok, false, "logout invalidates the token");
assert.equal((await db.query("select count(*)::int as n from admin_sessions")).rows[0].n, 0);

// --- idle expiry: 61 minutes without use ---
r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" }, { ip: "198.51.100.100" });
const token4 = cookieOf(r).slice("becaa_a=".length);
await db.query("update admin_sessions set last_used_at = now() - interval '61 minutes'");
assert.equal((await requireAdmin(new Request(`${ORIGIN}/x`, { headers: { cookie: `becaa_a=${token4}` } }))).ok, false, "idle session rejected");
assert.equal((await db.query("select count(*)::int as n from admin_sessions")).rows[0].n, 0, "idle-expired row removed");

// --- missing configuration fails closed, without revealing it ---
const savedHash = process.env.ADMIN_PASSWORD_HASH;
delete process.env.ADMIN_PASSWORD_HASH;
r = await post("/api/admin/login", { username: "committee-admin", password: "correct horse battery staple" }, { ip: "198.51.100.101" });
assert.equal(r.status, 401);
assert.equal(await r.text(), wrongText, "missing hash → same 401 body as a wrong password");
process.env.ADMIN_PASSWORD_HASH = savedHash;

await db.end();
await closePool();
console.log("PASS: admin login/logout (rotation, identical 401s, 403/400/405, 429 rate limit, lockout, CSRF-guarded logout, idle expiry, fail-closed config) and admin:hash.");
