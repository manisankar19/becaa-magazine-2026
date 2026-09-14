// Unit test for lib/session.ts, lib/admin-session.ts, lib/csrf.ts, lib/hash.ts, lib/ip.ts — Sprint v3 Task 21.
// Hermetic: Web Crypto only; the admin-session store is exercised against an in-memory fake `query`.
// Run with: node --import tsx tests/unit/session.test.mjs
import assert from "node:assert/strict";
import { signVisitorSession, verifyVisitorSession, visitorCookie, clearCookie, parseCookies, VISITOR_COOKIE } from "../../lib/session.ts";
import { createAdminSession, resolveAdminSession, revokeAdminSession, hashToken, adminCookie, ADMIN_COOKIE } from "../../lib/admin-session.ts";
import { csrfTokenFor, verifyCsrf } from "../../lib/csrf.ts";
import { hashPassword, verifyPassword } from "../../lib/hash.ts";
import { clientIp, hashIp } from "../../lib/ip.ts";

const secret = "unit-test-secret-not-a-real-value";
const now = Date.UTC(2026, 8, 14, 12, 0, 0);
const visitorId = "0c0f4a2e-8d5e-4c1e-9a3b-1c2d3e4f5a6b";

// --- visitor session cookie (HMAC-SHA256, stateless) ---
const value = await signVisitorSession({ visitor_id: visitorId, issued_at: now }, secret);
assert.match(value, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, "base64url payload.signature");
assert.deepEqual(await verifyVisitorSession(value, secret, now + 1000), { visitor_id: visitorId, issued_at: now });
assert.equal(await verifyVisitorSession(value.slice(0, -2) + "zz", secret, now), null, "tampered signature rejected");
const [payloadPart, sig] = value.split(".");
const tamperedPayload = Buffer.from(JSON.stringify({ visitor_id: "other", issued_at: now })).toString("base64url") + "." + sig;
assert.equal(await verifyVisitorSession(tamperedPayload, secret, now), null, "tampered payload rejected");
assert.equal(await verifyVisitorSession(value, "different-secret", now), null, "wrong secret rejected");
assert.equal(await verifyVisitorSession(value, secret, now + 31 * 24 * 3600 * 1000), null, "expired after 30 days");
assert.notEqual(await verifyVisitorSession(value, secret, now + 29 * 24 * 3600 * 1000), null, "still valid at 29 days");
assert.equal(await verifyVisitorSession("garbage", secret, now), null);
assert.equal(await verifyVisitorSession("", secret, now), null);
assert.ok(payloadPart.length > 0);

const prodCookie = visitorCookie(value, { secure: true });
assert.ok(prodCookie.startsWith(`${VISITOR_COOKIE}=${value}; `));
for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age=2592000"]) assert.ok(prodCookie.includes(flag), `visitor cookie has ${flag}`);
const devCookie = visitorCookie(value, { secure: false });
assert.ok(!devCookie.includes("Secure"), "Secure omitted only in development");
assert.ok(devCookie.includes("HttpOnly"));
assert.ok(clearCookie(VISITOR_COOKIE).includes("Max-Age=0"));
assert.deepEqual(parseCookies("a=1; becaa_v=abc.def; x=y"), { a: "1", becaa_v: "abc.def", x: "y" });
assert.deepEqual(parseCookies(null), {});

// --- admin session (server-side, hashed token) ---
function fakeDb() {
  const rows = new Map();
  return {
    rows,
    async query(text, params = []) {
      const t = text.replace(/\s+/g, " ").trim().toLowerCase();
      if (t.startsWith("insert into admin_sessions")) { const [token_hash, expires_at, ip_hash, now_] = params; rows.set(token_hash, { token_hash, created_at: now_, last_used_at: now_, expires_at, ip_hash }); return { rowCount: 1, rows: [] }; }
      if (t.startsWith("delete from admin_sessions where token_hash")) { const had = rows.delete(params[0]); return { rowCount: had ? 1 : 0, rows: [] }; }
      if (t.startsWith("delete from admin_sessions")) { const n = rows.size; rows.clear(); return { rowCount: n, rows: [] }; }
      if (t.startsWith("select")) { const r = rows.get(params[0]); return { rowCount: r ? 1 : 0, rows: r ? [r] : [] }; }
      if (t.startsWith("update admin_sessions set last_used_at")) { const r = rows.get(params[1]); if (r) r.last_used_at = params[0]; return { rowCount: r ? 1 : 0, rows: [] }; }
      throw new Error(`fake db: unexpected query ${text}`);
    },
  };
}
const db = fakeDb();
const token = await createAdminSession(db, { ipHash: "ip", now });
assert.match(token, /^[A-Za-z0-9_-]{43}$/, "256-bit base64url token");
assert.equal(db.rows.size, 1);
const stored = [...db.rows.values()][0];
assert.equal(stored.token_hash, await hashToken(token), "only sha256(token) is stored");
assert.ok(!stored.token_hash.includes(token));
assert.equal(new Date(stored.expires_at).getTime(), now + 12 * 3600 * 1000, "12 h absolute expiry");
const s1 = await resolveAdminSession(db, token, now + 30 * 60 * 1000);
assert.ok(s1, "valid session resolves");
assert.equal(new Date([...db.rows.values()][0].last_used_at).getTime(), now + 30 * 60 * 1000, "last_used_at refreshed");
assert.equal(await resolveAdminSession(db, token, now + 30 * 60 * 1000 + 61 * 60 * 1000), null, "idle > 60 min rejected");
assert.equal(db.rows.size, 0, "idle-expired row is deleted");
const token2 = await createAdminSession(db, { ipHash: "ip", now });
assert.equal(await resolveAdminSession(db, token2, now + 12 * 3600 * 1000 + 1), null, "absolute expiry rejected even with recent use");
const token3 = await createAdminSession(db, { ipHash: "ip", now });
const token4 = await createAdminSession(db, { ipHash: "ip", now });
assert.equal(db.rows.size, 1, "creating a session rotates: previous sessions removed");
assert.equal(await resolveAdminSession(db, token3, now + 1000), null, "rotated-out token no longer valid");
assert.ok(await resolveAdminSession(db, token4, now + 1000));
assert.equal(await revokeAdminSession(db, token4), true);
assert.equal(await resolveAdminSession(db, token4, now + 2000), null, "revoked on logout");
assert.equal(await resolveAdminSession(db, "not-a-token", now), null);
const ac = adminCookie(token4, { secure: true });
for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"]) assert.ok(ac.includes(flag), `admin cookie has ${flag}`);
assert.ok(ac.startsWith(`${ADMIN_COOKIE}=`));
assert.ok(!ac.includes("Max-Age"), "admin cookie is a session cookie (server-side expiry governs)");

// --- CSRF synchroniser token bound to the admin session ---
const sessionHash = await hashToken(token4);
const csrf = await csrfTokenFor(sessionHash, secret);
assert.ok(await verifyCsrf(csrf, sessionHash, secret));
assert.equal(await verifyCsrf(csrf, await hashToken("other"), secret), false, "token bound to a different session rejected");
assert.equal(await verifyCsrf(csrf.slice(1) + "A", sessionHash, secret), false, "altered token rejected");
assert.equal(await verifyCsrf("", sessionHash, secret), false);
assert.equal(await verifyCsrf(csrf, sessionHash, "other-secret"), false);

// --- password hashing (argon2id) ---
const hash = await hashPassword("correct horse battery staple");
assert.match(hash, /^\$argon2id\$/);
assert.equal(await verifyPassword(hash, "correct horse battery staple"), true);
assert.equal(await verifyPassword(hash, "Correct horse battery staple"), false);
assert.equal(await verifyPassword("", "anything"), false, "missing hash never verifies");
assert.equal(await verifyPassword("not-a-hash", "anything"), false, "malformed hash never verifies (and never throws)");
assert.equal(await verifyPassword(undefined, "anything"), false);

// --- client IP hashing ---
const req = (headers) => new Request("https://example.test/", { headers });
assert.equal(clientIp(req({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9", "first hop of x-forwarded-for");
assert.equal(clientIp(req({ "x-real-ip": "203.0.113.7" })), "203.0.113.7");
assert.equal(clientIp(req({})), "0.0.0.0");
const h1 = await hashIp("203.0.113.9", "salt-a");
assert.match(h1, /^[0-9a-f]{64}$/);
assert.equal(h1, await hashIp("203.0.113.9", "salt-a"), "deterministic");
assert.notEqual(h1, await hashIp("203.0.113.9", "salt-b"), "salted");
assert.ok(!h1.includes("203"));
console.log("All session/admin-session/csrf/hash/ip unit tests passed.");
