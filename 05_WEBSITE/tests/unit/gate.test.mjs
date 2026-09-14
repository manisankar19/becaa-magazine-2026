// Unit test for lib/gate.ts + middleware.ts — Sprint v3 Task 26. Hermetic (Web Crypto only).
// Run with: node --import tsx tests/unit/gate.test.mjs
import assert from "node:assert/strict";
import { classifyPath, decide, PROTECTED_MATCHER } from "../../lib/gate.ts";
import { signVisitorSession } from "../../lib/session.ts";
import middleware, { config as middlewareConfig } from "../../middleware.ts";

const secret = "gate-unit-secret";
const now = Date.now();
const good = await signVisitorSession({ visitor_id: "v1", issued_at: now - 1000 }, secret);
const expired = await signVisitorSession({ visitor_id: "v1", issued_at: now - 31 * 24 * 3600 * 1000 }, secret);
const cookie = (v) => `other=1; becaa_v=${v}; x=y`;

// --- path classification ---
for (const p of ["/", "/index.html", "/print/", "/print/index.html", "/content/articles/ART-001-x/"]) assert.equal(classifyPath(p), "page", `${p} is a gated page`);
for (const p of ["/print/BECAA-2026-complete-review.pdf", "/assets/normalized/advertisements/web/ADV-018-eframe-advertisement-web.jpg", "/assets/normalized/images/print/GAL-007-chatgpt-print.jpg", "/content/x.md"]) assert.equal(classifyPath(p), "asset", `${p} is a gated asset`);
for (const p of ["/welcome/", "/welcome/index.html", "/assets/css/site.css", "/assets/js/welcome.js", "/assets/normalized/cover/cover%20page%20new.png", "/assets/normalized/qr/email.svg", "/api/register", "/api/admin/stats", "/admin/", "/admin/index.html", "/favicon.ico"]) assert.equal(classifyPath(p), "public", `${p} is never gated`);
assert.equal(classifyPath("/assets/normalized/advertisements"), "asset", "directory itself is gated too");

// --- decisions ---
assert.deepEqual(await decide("/", cookie(good), secret, now), { action: "pass" });
assert.deepEqual(await decide("/", cookie(expired), secret, now), { action: "rewrite", to: "/welcome/" }, "expired cookie → welcome");
assert.deepEqual(await decide("/", null, secret, now), { action: "rewrite", to: "/welcome/" });
assert.deepEqual(await decide("/", "becaa_v=tampered.value", secret, now), { action: "rewrite", to: "/welcome/" });
assert.deepEqual(await decide("/print/", null, secret, now), { action: "rewrite", to: "/welcome/" }, "print HTML page → welcome");
assert.deepEqual(await decide("/print/BECAA-2026-complete-review.pdf", null, secret, now), { action: "forbid" }, "PDF without session → 403");
assert.deepEqual(await decide("/print/BECAA-2026-complete-review.pdf", cookie(good), secret, now), { action: "pass" });
assert.deepEqual(await decide("/assets/normalized/advertisements/web/x.jpg", null, secret, now), { action: "forbid" });
assert.deepEqual(await decide("/assets/normalized/images/web/x.jpg", cookie(good), secret, now), { action: "pass" });
assert.deepEqual(await decide("/welcome/", null, secret, now), { action: "pass" }, "public paths pass without a cookie");
assert.deepEqual(await decide("/api/register", null, secret, now), { action: "pass" });
assert.deepEqual(await decide("/admin/", null, secret, now), { action: "pass" }, "admin has its own authentication");
assert.deepEqual(await decide("/assets/normalized/cover/x.png", null, secret, now), { action: "pass" });
assert.deepEqual(await decide("/", cookie(good), "wrong-secret", now), { action: "rewrite", to: "/welcome/" });

// --- matcher (what Vercel routes through the middleware) ---
assert.deepEqual(PROTECTED_MATCHER, ["/", "/index.html", "/print/:path*", "/content/:path*", "/assets/normalized/advertisements/:path*", "/assets/normalized/images/:path*"]);
assert.deepEqual(middlewareConfig.matcher, PROTECTED_MATCHER);

// --- middleware(request) → Vercel edge protocol ---
process.env.SESSION_SECRET = secret;
const req = (path, c) => new Request(`https://magazine.example${path}`, { headers: c ? { cookie: c } : {} });
let res = await middleware(req("/", cookie(good)));
assert.equal(res.headers.get("x-middleware-next"), "1", "valid session continues to the static file");
res = await middleware(req("/", null));
assert.equal(res.headers.get("x-middleware-rewrite"), "https://magazine.example/welcome/", "no session → rewrite to /welcome/ (URL unchanged for the visitor)");
assert.equal(res.headers.get("cache-control"), "no-store", "gated page responses are not cached");
res = await middleware(req("/print/BECAA-2026-complete-review.pdf", null));
assert.equal(res.status, 403);
assert.equal(res.headers.get("cache-control"), "no-store");
res = await middleware(req("/assets/normalized/advertisements/web/x.jpg", cookie(good)));
assert.equal(res.headers.get("x-middleware-next"), "1");
res = await middleware(req("/welcome/", null));
assert.equal(res.headers.get("x-middleware-next"), "1", "public path is untouched even if routed here");
delete process.env.SESSION_SECRET;
res = await middleware(req("/", cookie(good)));
assert.equal(res.headers.get("x-middleware-rewrite"), "https://magazine.example/welcome/", "missing secret fails closed");
console.log("All gate unit tests passed.");
