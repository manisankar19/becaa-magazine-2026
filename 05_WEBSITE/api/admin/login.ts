// POST /api/admin/login — single-administrator login (Sprint v3 Task 28, PRD §5.5).
// Order: method → same-origin → body → per-IP rate limit → per-username lockout →
// constant-cost credential check (argon2id; a missing/malformed configured hash still costs
// one verification and yields the same 401) → rotate server-side session → cookie + CSRF.
import { RATE_LIMITS } from "../../lib/config.js";
import { adminCookie, createAdminSession, hashToken } from "../../lib/admin-session.js";
import { csrfTokenFor } from "../../lib/csrf.js";
import { getPool } from "../../lib/db.js";
import { requireEnv } from "../../lib/env.js";
import { verifyPassword } from "../../lib/hash.js";
import { assertSameOrigin, json, readJsonBody, guarded } from "../../lib/http.js";
import { clientIp, hashIp } from "../../lib/ip.js";
import { clearLoginFailures, consume, isLockedOut, recordLoginFailure } from "../../lib/rate-limit.js";
import { isSecureCookieEnvironment } from "../../lib/session.js";

const PATH = "/api/admin/login";
const FAILED = { ok: false, error: "Invalid username or password." }; // identical for every failure cause

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % x.length] ?? 0) ^ (y[i % y.length] ?? 0);
  return diff === 0;
}

async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "POST") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "POST" } });
  if (!assertSameOrigin(request)) return json({ ok: false, error: "Cross-site request refused." }, { status: 403, path: PATH });
  const body = await readJsonBody(request);
  if (!body.ok) return json({ ok: false, error: "Malformed submission." }, { status: body.status, path: PATH });
  const username = typeof body.value.username === "string" ? body.value.username.trim() : "";
  const password = typeof body.value.password === "string" ? body.value.password : "";
  if (!username || !password || username.length > 64 || password.length > 256) return json({ ok: false, error: "Username and password are required." }, { status: 400, path: PATH });

  const db = getPool();
  const ipHash = await hashIp(clientIp(request), requireEnv("IP_HASH_SALT"));
  const { limit, windowSeconds, lockoutAfter, lockoutSeconds } = RATE_LIMITS.adminLogin;
  const perIp = await consume(db, `login-ip:${ipHash}`, limit, windowSeconds);
  if (!perIp.allowed) return json({ ok: false, error: "Too many attempts. Please wait and try again." }, { status: 429, path: PATH, headers: { "retry-after": String(perIp.retryAfterSeconds) } });
  const userBucket = `login-user:${username.toLowerCase()}`;
  if (await isLockedOut(db, userBucket, lockoutAfter, lockoutSeconds)) return json({ ok: false, error: "Too many attempts. Please wait and try again." }, { status: 429, path: PATH, headers: { "retry-after": String(lockoutSeconds) } });

  // Always run the password verification so timing does not reveal whether the username matched.
  const usernameOk = timingSafeEqual(username, process.env.ADMIN_USERNAME ?? "");
  const passwordOk = await verifyPassword(process.env.ADMIN_PASSWORD_HASH, password);
  if (!usernameOk || !passwordOk) {
    await recordLoginFailure(db, userBucket, lockoutAfter, lockoutSeconds);
    return json(FAILED, { status: 401, path: PATH });
  }

  await clearLoginFailures(db, userBucket);
  const token = await createAdminSession(db, { ipHash });
  const csrf = await csrfTokenFor(await hashToken(token), requireEnv("SESSION_SECRET"));
  return json({ ok: true, csrf }, { path: PATH, headers: { "set-cookie": adminCookie(token, { secure: isSecureCookieEnvironment() }) } });
}

// Vercel Node runtime: a Web-standard `fetch` export receives a Request and returns a Response
// (a default export would be treated as the Node (req, res) signature and its Response ignored).
export const fetch = guarded(handler, PATH);
