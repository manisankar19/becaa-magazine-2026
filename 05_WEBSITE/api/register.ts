// POST /api/register — visitor registration (Sprint v3 Task 23, PRD §5.3).
// Web-standard handler: works on Vercel's Node runtime and under scripts/dev-app.mjs.
//
// Order of checks (each one stops the request without touching the database unless noted):
//   method → REGISTRATION_ENABLED → same-origin → body size/shape → honeypot (silent 200)
//   → minimum form-fill time → per-IP rate limit (one upsert) → validation → upsert visitor
//   + visit row → session cookie.
import { MIN_FORM_FILL_MS, PRIVACY_VERSION, RATE_LIMITS } from "../lib/config.ts";
import { getPool } from "../lib/db.ts";
import { registrationEnabled, requireEnv } from "../lib/env.ts";
import { assertSameOrigin, json, readJsonBody, redirect } from "../lib/http.ts";
import { clientIp, hashIp } from "../lib/ip.ts";
import { consume } from "../lib/rate-limit.ts";
import { isSecureCookieEnvironment, signVisitorSession, visitorCookie } from "../lib/session.ts";
import { validateRegistration } from "../lib/validate-registration.ts";
import { recordVisit, upsertVisitor } from "../lib/visitors.ts";

const PATH = "/api/register";
const HONEYPOT_FIELD = "website";

function fail(form: boolean, status: number, body: Record<string, unknown>, errorCode: string): Response {
  // Classic form posts (no JavaScript) go back to the welcome page with a generic error code;
  // JSON clients get field-level messages. Neither echoes submitted values.
  if (form) return redirect(`/welcome/?error=${encodeURIComponent(errorCode)}`, { path: PATH });
  return json(body, { status, path: PATH });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "POST") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "POST" } });
  if (!registrationEnabled()) return json({ ok: false, error: "Registration is temporarily closed. Please try again later." }, { status: 503, path: PATH });
  if (!assertSameOrigin(request)) return json({ ok: false, error: "Cross-site request refused." }, { status: 403, path: PATH });

  const body = await readJsonBody(request);
  if (!body.ok) return json({ ok: false, error: body.status === 413 ? "Submission too large." : "Malformed submission." }, { status: body.status, path: PATH });
  const form = body.form === true;
  const input = body.value;

  // Honeypot: bots fill hidden fields. Pretend success, write nothing, set no cookie.
  if (typeof input[HONEYPOT_FIELD] === "string" && input[HONEYPOT_FIELD].trim() !== "") {
    return form ? redirect("/", { path: PATH }) : json({ ok: true }, { path: PATH });
  }

  const startedAt = Number(input.form_started_at);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FORM_FILL_MS) {
    return fail(form, 422, { ok: false, errors: { form: "Please take a moment to complete the form, then submit again." } }, "form");
  }

  const db = getPool();
  const ipHash = await hashIp(clientIp(request), requireEnv("IP_HASH_SALT"));
  const limit = await consume(db, `register:${ipHash}`, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowSeconds);
  if (!limit.allowed) {
    return form
      ? redirect("/welcome/?error=rate", { path: PATH })
      : json({ ok: false, error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429, path: PATH, headers: { "retry-after": String(limit.retryAfterSeconds) } });
  }

  const validated = validateRegistration(input);
  if (!validated.ok) return fail(form, 422, { ok: false, errors: validated.errors }, "validation");

  const visitor = await upsertVisitor(db, validated.value, { privacyVersion: PRIVACY_VERSION });
  await recordVisit(db, visitor.id, { ipHash, userAgent: request.headers.get("user-agent") });

  const cookie = visitorCookie(await signVisitorSession({ visitor_id: visitor.id, issued_at: Date.now() }, requireEnv("SESSION_SECRET")), { secure: isSecureCookieEnvironment() });
  if (form) return redirect("/", { path: PATH, headers: { "set-cookie": cookie } });
  return json({ ok: true }, { path: PATH, headers: { "set-cookie": cookie } });
}
