// Shared HTTP helpers for the Web-standard function handlers (Sprint v3 Task 22, PRD §5.5).
// Every response carries the baseline security headers; API and admin responses are never
// cached and admin responses cannot be framed. Request bodies are capped at 8 KB.
export { MAX_BODY_BYTES } from "./config";
import { MAX_BODY_BYTES } from "./config";

export interface ResponseOptions {
  status?: number;
  path?: string;                 // request path, used to decide cache/frame policy
  headers?: Record<string, string>;
}

export function securityHeaders(path: string = "/"): Record<string, string> {
  const headers: Record<string, string> = {
    "content-security-policy": "default-src 'self'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  if (path.startsWith("/api/") || path.startsWith("/admin")) headers["cache-control"] = "no-store";
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) headers["x-frame-options"] = "DENY";
  if (process.env.NODE_ENV === "production") headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

function build(body: BodyInit | null, contentType: string, { status = 200, path = "/", headers = {} }: ResponseOptions): Response {
  return new Response(body, { status, headers: { "content-type": contentType, ...securityHeaders(path), ...headers } });
}

export function json(body: unknown, options: ResponseOptions = {}): Response {
  return build(JSON.stringify(body), "application/json; charset=utf-8", options);
}

export function html(body: string, options: ResponseOptions = {}): Response {
  return build(body, "text/html; charset=utf-8", options);
}

export function text(body: string, options: ResponseOptions = {}): Response {
  return build(body, "text/plain; charset=utf-8", options);
}

export function redirect(location: string, options: ResponseOptions = {}): Response {
  return build(null, "text/plain; charset=utf-8", { status: 303, ...options, headers: { location, ...(options.headers ?? {}) } });
}

// The host the browser actually used (Vercel and the local dev server sit behind a proxy).
export function requestHost(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
}

// Same-origin check for state-changing requests: Origin must match; fall back to Referer.
export function assertSameOrigin(request: Request): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) return true;
  const host = requestHost(request);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

export type BodyResult = { ok: true; value: Record<string, unknown>; form?: true } | { ok: false; status: 400 | 413 | 415 };

// Reads a JSON object or a classic form post, enforcing the 8 KB cap before parsing.
export async function readJsonBody(request: Request): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { ok: false, status: 413 };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return { ok: false, status: 413 };
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  if (type.startsWith("application/x-www-form-urlencoded")) {
    const value: Record<string, unknown> = {};
    for (const [k, v] of new URLSearchParams(raw)) value[k] = v;
    return { ok: true, value, form: true };
  }
  if (!type.startsWith("application/json")) return { ok: false, status: 415 };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, status: 400 };
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400 };
  }
}
