// Local application server mirroring the Vercel deployment (Sprint v3 Task 27).
//   npm run dev:app        → http://127.0.0.1:8087  (reads .env.local; PORT overrides)
// Order per request: gate (lib/gate.ts, same code as middleware.ts) → /api/* handlers in api/
// (Web Request/Response via lib/node-adapter.ts, Vercel-style file routing incl. [id].ts)
// → static files from _site/. Access log = method, path, status, ms only: never bodies,
// cookies or query strings.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { siteRoot } from "./lib.mjs";
import { decide } from "../lib/gate.ts";
import { toWebRequest, sendWebResponse } from "../lib/node-adapter.ts";
import { securityHeaders } from "../lib/http.ts";

const SITE = path.join(siteRoot, "_site");
const API = path.join(siteRoot, "api");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8087);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };

if (!fs.existsSync(path.join(SITE, "index.html"))) { console.error("_site/ is missing — run `npm run build` first."); process.exit(1); }
for (const name of ["DATABASE_URL", "SESSION_SECRET", "IP_HASH_SALT"]) if (!process.env[name]) { console.error(`${name} is not set (copy .env.example to .env.local).`); process.exit(1); }

// Vercel-style file routing for api/: /api/a/b → api/a/b.ts, else api/a/[id].ts.
async function resolveHandler(pathname) {
  const rel = pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  if (!rel || rel.includes("..")) return null;
  const direct = path.join(API, `${rel}.ts`);
  if (direct.startsWith(API) && fs.existsSync(direct)) return (await import(pathToFileURL(direct).href)).default;
  const dir = path.dirname(rel);
  const dynamic = path.join(API, dir, "[id].ts");
  if (dynamic.startsWith(API) && fs.existsSync(dynamic)) return (await import(pathToFileURL(dynamic).href)).default;
  return null;
}

function serveStatic(pathname, res) {
  let file = path.join(SITE, decodeURIComponent(pathname));
  if (!file.startsWith(SITE + path.sep) && file !== SITE) { res.writeHead(403); res.end(); return 403; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not found"); return 404; }
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": type, ...securityHeaders(pathname) });
  fs.createReadStream(file).pipe(res);
  return 200;
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const method = (req.method ?? "GET").toUpperCase();
  let pathname = "/";
  try { pathname = new URL(req.url ?? "/", `http://${HOST}`).pathname; } catch { res.writeHead(400); res.end(); return; }
  const done = (status) => console.log(`${method} ${pathname} ${status} ${Date.now() - startedAt}ms`);
  try {
    if (pathname.startsWith("/api/")) {
      const handler = await resolveHandler(pathname);
      if (!handler) { res.writeHead(404, { "content-type": "application/json", ...securityHeaders(pathname) }); res.end('{"ok":false,"error":"Not found."}'); done(404); return; }
      const response = await handler(toWebRequest(req, `http://${req.headers.host ?? `${HOST}:${PORT}`}`));
      await sendWebResponse(res, response);
      done(response.status);
      return;
    }
    const decision = await decide(pathname, req.headers.cookie, process.env.SESSION_SECRET);
    if (decision.action === "forbid") { res.writeHead(403, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders(pathname) }); res.end("Please register at /welcome/ to read the magazine."); done(403); return; }
    if (decision.action === "rewrite") { res.setHeader("cache-control", "no-store"); done(serveStatic(decision.to, res)); return; }
    done(serveStatic(pathname, res));
  } catch (error) {
    console.error(`${method} ${pathname} 500 ${error?.message ?? error}`); // message only, never the request
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`dev-app listening on http://${HOST}:${server.address().port}`);
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
