// Vercel Routing Middleware (framework-less, edge runtime) — Sprint v3 Task 26, PRD §5.1–5.2.
// Runs before the static files for the matched paths only. Uses Web Crypto via lib/gate.ts;
// no Node-only APIs. Responses follow Vercel's middleware protocol (the same headers
// `@vercel/edge`'s next()/rewrite() emit), so no extra dependency is needed.
import { decide } from "./lib/gate";

// Vercel parses this export statically: it must be a literal (no spread/computed values).
// tests/unit/gate.test.mjs asserts it equals lib/gate.ts PROTECTED_MATCHER.
export const config = { matcher: ["/", "/index.html", "/print/:path*", "/content/:path*", "/assets/normalized/advertisements/:path*", "/assets/normalized/images/:path*"] };

const NO_STORE = { "cache-control": "no-store" };

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const decision = await decide(url.pathname, request.headers.get("cookie"), process.env.SESSION_SECRET);
  if (decision.action === "pass") {
    return new Response(null, { headers: { "x-middleware-next": "1" } });
  }
  if (decision.action === "rewrite") {
    const target = new URL(decision.to, url.origin);
    return new Response(null, { headers: { "x-middleware-rewrite": target.toString(), ...NO_STORE } });
  }
  return new Response("Please register at /welcome/ to read the magazine.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8", ...NO_STORE } });
}
