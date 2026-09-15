// Unit test for lib/http.ts guarded(): an exception becomes structured JSON, a Response passes through.
// Run with: node --import tsx tests/unit/http-guarded.test.mjs
import assert from "node:assert/strict";
import { guarded, json } from "../../lib/http.ts";

const req = new Request("http://localhost/api/register", { method: "POST" });
const logged = [];
const origError = console.error;
console.error = (...args) => logged.push(args.join(" "));
try {
  const boom = guarded(async () => { throw new Error("connect ECONNREFUSED 10.0.0.1:5432"); }, "/api/register");
  const r = await boom(req);
  assert.equal(r.status, 500);
  assert.equal(r.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(r.headers.get("cache-control"), "no-store");
  const body = await r.json();
  assert.equal(body.ok, false);
  assert.equal(typeof body.error, "string", "error is always a string for the browser to display");
  assert.ok(!body.error.includes("ECONNREFUSED"), "internal detail is not sent to the client");
  assert.equal(logged.length, 1);
  assert.ok(logged[0].startsWith("/api/register 500 connect ECONNREFUSED"), "message-only log line");

  const custom = guarded(async () => { throw "string throw"; }, "/api/admin/stats", "Custom text.");
  const c = await (await custom(req)).json();
  assert.deepEqual(c, { ok: false, error: "Custom text." });
  assert.ok(logged[1].startsWith("/api/admin/stats 500 string throw"));

  const fine = guarded(async () => json({ ok: true, hello: 1 }, { path: "/api/health" }), "/api/health");
  const f = await fine(req);
  assert.equal(f.status, 200);
  assert.deepEqual(await f.json(), { ok: true, hello: 1 });
  assert.equal(logged.length, 2);
} finally {
  console.error = origError;
}
console.log("All http-guarded unit tests passed (3 cases).");
