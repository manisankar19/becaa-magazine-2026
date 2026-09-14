// Integration test for api/admin/export.csv.ts — Sprint v3 Task 30.
// Run with: node --env-file-if-exists=.env.local --import tsx tests/integration/export.test.mjs
import assert from "node:assert/strict";
import pg from "pg";
import { migrate } from "../../scripts/db-migrate.mjs";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
process.env.SESSION_SECRET ||= "admin-test-secret";
process.env.IP_HASH_SALT ||= "salt";
process.env.NODE_ENV = "development";
process.env.ADMIN_USERNAME = "committee-admin";
await migrate(process.env.DATABASE_URL);
const { hashPassword } = await import("../../lib/hash.ts");
process.env.ADMIN_PASSWORD_HASH = await hashPassword("correct horse battery staple");
const { default: login } = await import("../../api/admin/login.ts");
const { default: exportCsv } = await import("../../api/admin/export.csv.ts");
const { closePool } = await import("../../lib/db.ts");
const { EXPORT_COLUMNS } = await import("../../lib/csv-core.ts");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("delete from visits; delete from visitors; delete from admin_sessions; delete from rate_limits;");
await db.query("insert into visitors(name,email,category,batch_year,department,department_other,organisation,mobile,consent_at,privacy_version,visit_count) values ($1,$2,'guest',null,null,null,$3,$4,now(),1,3)", ["সিদ্ধার্থ মুখোপাধ্যায়", "sid@example.org", "=HYPERLINK(\"http://evil\")", "9836063677"]);
await db.query("insert into visitors(name,email,category,batch_year,department,department_other,organisation,mobile,consent_at,privacy_version) values ($1,$2,'alumni',1992,'Other','Naval, \"Arch\"',null,null,now(),1)", ["Abir", "abir@example.co.in"]);

const ORIGIN = "https://magazine.example";
const r0 = await login(new Request(`${ORIGIN}/api/admin/login`, { method: "POST", headers: { host: "magazine.example", origin: ORIGIN, "content-type": "application/json", "x-forwarded-for": "198.51.100.9" }, body: JSON.stringify({ username: "committee-admin", password: "correct horse battery staple" }) }));
const cookie = r0.headers.get("set-cookie").split(";")[0];

// Unauthenticated → 401 (no CSV leaks).
let r = await exportCsv(new Request(`${ORIGIN}/api/admin/export.csv`));
assert.equal(r.status, 401);
assert.ok(!(await r.text()).includes("sid@example.org"));

// Capture the audit log line.
const logged = [];
const origLog = console.log;
console.log = (...args) => logged.push(args.join(" "));
r = await exportCsv(new Request(`${ORIGIN}/api/admin/export.csv`, { headers: { host: "magazine.example", cookie } }));
console.log = origLog;
assert.equal(r.status, 200);
assert.equal(r.headers.get("content-type"), "text/csv; charset=utf-8");
assert.match(r.headers.get("content-disposition"), /^attachment; filename="becaa-2026-visitors-\d{4}-\d{2}-\d{2}\.csv"$/);
assert.equal(r.headers.get("cache-control"), "no-store");
assert.equal(r.headers.get("x-frame-options"), "DENY");
const bytes = new Uint8Array(await r.arrayBuffer()); // response.text() would strip the BOM per the Fetch spec
assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM so Excel opens Bengali correctly");
const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
const lines = text.slice(1).split("\r\n").filter(Boolean);
assert.equal(lines.length, 3, "header + 2 rows, CRLF terminated");
const header = lines[0].split(",").map((c) => c.replace(/^"|"$/g, ""));
assert.deepEqual(header, EXPORT_COLUMNS);
assert.ok(!header.some((h) => /hash|token|ip|agent/.test(h)), "no internal columns");
const parse = (line) => { const out = []; let cur = ""; let q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
const rows = lines.slice(1).map(parse).map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i]])));
const sid = rows.find((x) => x.email === "sid@example.org");
assert.equal(sid.name, "সিদ্ধার্থ মুখোপাধ্যায়", "Bengali name round-trips");
assert.equal(sid.organisation, "'=HYPERLINK(\"http://evil\")", "formula injection neutralised");
assert.equal(sid.mobile, "9836063677");
assert.equal(sid.visit_count, "3");
assert.match(sid.consent_at, /IST$/);
assert.match(sid.registered_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} IST$/);
const abir = rows.find((x) => x.email === "abir@example.co.in");
assert.equal(abir.department_other, 'Naval, "Arch"', "commas and quotes survive quoting");
assert.equal(abir.batch_year, "1992");
assert.equal(abir.category, "alumni");
assert.equal(logged.length, 1, "exactly one audit line");
assert.match(logged[0], /^csv export \S+ session=[0-9a-f]{8} rows=2$/, "audit line has timestamp, session display id and row count only");
assert.ok(!logged[0].includes("sid@example.org"), "no data in the log");
r = await exportCsv(new Request(`${ORIGIN}/api/admin/export.csv`, { method: "POST", headers: { cookie } }));
assert.equal(r.status, 405);

await db.end();
await closePool();
console.log("PASS: CSV export — auth required, approved columns only, BOM/CRLF, quoting, formula guard, Bengali round-trip, audit line without data.");
