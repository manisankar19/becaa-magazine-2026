// Administrator authentication guard for /api/admin/* handlers (Sprint v3 Task 28).
// Resolves the `becaa_a` cookie against admin_sessions (refreshing idle expiry) and, for
// state-changing requests, checks the CSRF synchroniser token bound to that session.
import { ADMIN_COOKIE, hashToken, resolveAdminSession, type AdminSessionRow } from "./admin-session.js";
import { verifyCsrf } from "./csrf.js";
import { getPool } from "./db.js";
import { requireEnv } from "./env.js";
import { assertSameOrigin, json } from "./http.js";
import { parseCookies } from "./session.js";

export type AdminAuth = { ok: true; session: AdminSessionRow; token: string; tokenHash: string } | { ok: false; response: Response };

export async function requireAdmin(request: Request): Promise<AdminAuth> {
  const path = new URL(request.url).pathname;
  const token = parseCookies(request.headers.get("cookie"))[ADMIN_COOKIE];
  const session = await resolveAdminSession(getPool(), token);
  if (!session || !token) return { ok: false, response: json({ ok: false, error: "Administrator login required." }, { status: 401, path }) };
  return { ok: true, session, token, tokenHash: await hashToken(token) };
}

// For POST/DELETE: same-origin + CSRF token (from the JSON body or the x-csrf-token header).
export async function requireAdminMutation(request: Request, body: Record<string, unknown> | null): Promise<AdminAuth> {
  const path = new URL(request.url).pathname;
  if (!assertSameOrigin(request)) return { ok: false, response: json({ ok: false, error: "Cross-site request refused." }, { status: 403, path }) };
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth;
  const csrf = (typeof body?.csrf === "string" ? body.csrf : null) ?? request.headers.get("x-csrf-token");
  if (!(await verifyCsrf(csrf, auth.tokenHash, requireEnv("SESSION_SECRET")))) {
    return { ok: false, response: json({ ok: false, error: "Invalid or missing CSRF token." }, { status: 403, path }) };
  }
  return auth;
}
