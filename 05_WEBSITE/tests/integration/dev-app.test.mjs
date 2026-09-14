// Integration test for scripts/dev-app.mjs + lib/node-adapter.ts — Sprint v3 Task 27.
// Boots the local server as a child process (like `npm run dev:app`) on an ephemeral port
// against becaa_test and probes it over real HTTP. Requires `npm run build` and the local cluster.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { siteRoot } from "../../scripts/lib.mjs";
import { migrate } from "../../scripts/db-migrate.mjs";

const DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
await migrate(DATABASE_URL); // other tests may have rolled the schema back
const env = { ...process.env, DATABASE_URL, SESSION_SECRET: process.env.SESSION_SECRET || "dev-app-test-secret", IP_HASH_SALT: process.env.IP_HASH_SALT || "salt", NODE_ENV: "development", PORT: "0", REGISTRATION_ENABLED: "true" };
const child = spawn(process.execPath, ["--import", "tsx", path.join(siteRoot, "scripts", "dev-app.mjs")], { cwd: siteRoot, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", (d) => { logs += d; });
child.stderr.on("data", (d) => { logs += d; });
const baseUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`dev-app did not start:\n${logs}`)), 20000);
  child.stdout.on("data", function onData() { const m = logs.match(/listening on (http:\/\/[^\s]+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
  child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`dev-app exited early (${code}):\n${logs}`)); });
});

try {
  const get = (p, headers = {}) => fetch(`${baseUrl}${p}`, { headers, redirect: "manual" });

  // Unauthenticated page → welcome content served at the same URL (rewrite, not redirect).
  let r = await get("/");
  assert.equal(r.status, 200);
  let body = await r.text();
  assert.ok(body.includes('data-testid="welcome-title"'), "/ shows the welcome page without a session");
  assert.ok(!body.includes("With best compliments from"), "no magazine content leaks");
  assert.equal(r.headers.get("cache-control"), "no-store");

  r = await get("/welcome/");
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes('data-testid="register-form"'));

  // Gated assets → 403; public assets → 200.
  r = await get("/assets/normalized/advertisements/web/ADV-018-eframe-advertisement-web.jpg");
  assert.equal(r.status, 403);
  r = await get("/print/BECAA-2026-complete-review.pdf");
  assert.ok([403, 404].includes(r.status), "PDF is gated (403) or absent (404) — never served");
  r = await get("/assets/css/site.css");
  assert.equal(r.status, 200);
  assert.ok(r.headers.get("content-type").startsWith("text/css"));
  r = await get("/assets/normalized/cover/cover%20page%20new.png");
  assert.equal(r.status, 200, "cover is public");
  r = await get("/assets/js/welcome.js");
  assert.equal(r.status, 200);
  r = await get("/nope/../../package.json");
  assert.notEqual(r.status, 200, "path traversal refused");

  // API routing through the adapter.
  r = await get("/api/health");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, db: true });
  r = await get("/api/does-not-exist");
  assert.equal(r.status, 404);

  // Register through the real server, then the cookie opens the magazine.
  r = await fetch(`${baseUrl}/api/register`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ name: "Dev Server Test", email: "devserver@example.org", category: "guest", consent: true, form_started_at: Date.now() - 5000 }) });
  assert.equal(r.status, 200, await r.text());
  const cookie = r.headers.get("set-cookie").split(";")[0];
  assert.ok(cookie.startsWith("becaa_v="));
  r = await get("/", { cookie });
  body = await r.text();
  assert.equal(r.status, 200);
  assert.ok(body.includes("With best compliments from Eframe"), "valid session → magazine page");
  assert.equal((body.match(/class="publication-item /g) || []).length, 44);
  r = await get("/assets/normalized/advertisements/web/ADV-018-eframe-advertisement-web.jpg", { cookie });
  assert.equal(r.status, 200, "valid session → artwork served");
  assert.ok(r.headers.get("content-type").startsWith("image/jpeg"));
  r = await get("/", { cookie: "becaa_v=forged.value" });
  assert.ok((await r.text()).includes('data-testid="welcome-title"'), "forged cookie → welcome");

  // Classic form post (no JS) → 303 to / with the cookie.
  r = await fetch(`${baseUrl}/api/register`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", origin: baseUrl }, body: new URLSearchParams({ name: "Form Person", email: "form2@example.org", category: "guest", consent: "on", form_started_at: String(Date.now() - 5000) }).toString() });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/");

  // Logs never contain bodies, cookies or emails.
  await new Promise((res) => setTimeout(res, 200));
  assert.ok(!logs.includes("devserver@example.org") && !logs.includes("becaa_v=") && !logs.includes("Dev Server Test"), `logs must not contain request data:\n${logs}`);
  assert.ok(/POST \/api\/register 200/.test(logs), "access log line with method, path and status");
  console.log("PASS: dev-app serves the gate, static files and API exactly like production routing.");
} finally {
  child.kill("SIGTERM");
}
