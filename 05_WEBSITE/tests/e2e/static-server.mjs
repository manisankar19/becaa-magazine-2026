// Minimal static file server over _site/ for browser tests that need a real http origin
// (fetch/route interception does not work from file:// pages). No gate, no API — Task 27's
// dev-app server is the full mirror of production; this is only for page-level tests.
// Sprint v5 Task 24 (PRD §11, Decision Q): responses carry the headers vercel.json gives
// production (CSP, nosniff, referrer policy, admin frame/cache rules), read from the file, so
// page tests see what production browsers enforce — e.g. the CSP refusing inline styles.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf" };

// vercel.json `headers`: each rule's `source` in this project is a path prefix followed by
// "(.*)" (e.g. "/(.*)", "/admin/(.*)"), so plain prefix matching reproduces Vercel's routing.
// Any other form is rejected loudly rather than guessed.
const vercelConfig = JSON.parse(fs.readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
const WILDCARD = "(.*)";
const HEADER_RULES = (vercelConfig.headers ?? []).map((rule) => {
  if (!rule.source.endsWith(WILDCARD) || rule.source.slice(0, -WILDCARD.length).includes("(")) throw new Error(`static-server: unsupported vercel.json header source ${rule.source}`);
  return { prefix: rule.source.slice(0, -WILDCARD.length), headers: rule.headers };
});
export function productionHeaders(urlPath) {
  const out = {};
  for (const rule of HEADER_RULES) {
    if (!urlPath.startsWith(rule.prefix)) continue;
    for (const { key, value } of rule.headers) out[key.toLowerCase()] = value;
  }
  return out;
}

export function startStaticServer(root, port = 0) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, urlPath);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { ...productionHeaders(urlPath), "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })));
}
