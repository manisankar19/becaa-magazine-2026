// Registration gate decision logic (Sprint v3 Task 26, PRD §5.2). Pure and edge-safe:
// used by middleware.ts on Vercel and by scripts/dev-app.mjs locally, so both agree.
//
//   page   → without a valid visitor session, rewrite to /welcome/ (URL stays the same)
//   asset  → without a valid visitor session, 403 (images, the PDF, raw content files)
//   public → never gated (welcome page, CSS/JS, cover + QR assets, API, admin)
import { parseCookies, verifyVisitorSession, VISITOR_COOKIE } from "./session.ts";

export type PathClass = "page" | "asset" | "public";
export type GateDecision = { action: "pass" } | { action: "rewrite"; to: "/welcome/" } | { action: "forbid" };

// Kept in sync with middleware.ts `config.matcher` (asserted by tests/unit/gate.test.mjs).
export const PROTECTED_MATCHER = ["/", "/index.html", "/print/:path*", "/content/:path*", "/assets/normalized/advertisements/:path*", "/assets/normalized/images/:path*"] as const;

const PUBLIC_PREFIXES = ["/welcome", "/assets/css/", "/assets/js/", "/assets/normalized/cover/", "/assets/normalized/qr/", "/api/", "/admin"];

export function classifyPath(pathname: string): PathClass {
  const p = pathname.replace(/\/{2,}/g, "/");
  if (PUBLIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix) || p.startsWith(`${prefix}/`))) return "public";
  if (p === "/" || p === "/index.html") return "page";
  if (p === "/print" || p === "/print/" || p === "/print/index.html") return "page";
  if (p.startsWith("/print/")) return "asset";
  if (p.startsWith("/content/")) return p.endsWith("/") || p.endsWith(".html") ? "page" : "asset";
  if (p.startsWith("/assets/normalized/advertisements") || p.startsWith("/assets/normalized/images")) return "asset";
  return "public";
}

export async function decide(pathname: string, cookieHeader: string | null | undefined, secret: string | undefined, now: number = Date.now()): Promise<GateDecision> {
  const kind = classifyPath(pathname);
  if (kind === "public") return { action: "pass" };
  // Fail closed: without a configured secret no session can be valid.
  const session = secret ? await verifyVisitorSession(parseCookies(cookieHeader)[VISITOR_COOKIE], secret, now) : null;
  if (session) return { action: "pass" };
  return kind === "page" ? { action: "rewrite", to: "/welcome/" } : { action: "forbid" };
}
