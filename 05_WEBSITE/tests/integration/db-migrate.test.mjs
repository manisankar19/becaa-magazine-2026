// Integration test for db/migrations + scripts/db-migrate.mjs — Sprint v3 Task 19.
// Runs against the local becaa_test database (npm run db:local:start).
// Flow: drop everything → migrate from scratch → assert schema → migrate again (no-op)
//       → purge behaviour → rollback → assert tables gone.
import assert from "node:assert/strict";
import pg from "pg";
import { migrate, status, rollback } from "../../scripts/db-migrate.mjs";
import { purge } from "../../scripts/db-purge.mjs";

const url = process.env.DATABASE_URL_TEST || "postgres://becaa@127.0.0.1:5433/becaa_test";
const client = new pg.Client({ connectionString: url });
await client.connect();
const tables = async () => (await client.query("select tablename from pg_tables where schemaname='public' order by 1")).rows.map((r) => r.tablename);
const q = (text, params) => client.query(text, params);

// Start from nothing.
await q("drop schema public cascade; create schema public;");
assert.deepEqual(await tables(), []);

const first = await migrate(url);
assert.deepEqual(first.applied, [1], "migration 001 applied on a fresh database");
assert.deepEqual(await tables(), ["admin_sessions", "rate_limits", "schema_migrations", "visitors", "visits"]);
const st = await status(url);
assert.deepEqual(st, { applied: [1], pending: [] });

const second = await migrate(url);
assert.deepEqual(second.applied, [], "re-running applies nothing (idempotent)");

// Schema checks (PRD §5.4).
const cols = async (t) => (await q("select column_name, data_type, is_nullable from information_schema.columns where table_name=$1 order by ordinal_position", [t])).rows;
const visitors = await cols("visitors");
assert.deepEqual(visitors.map((c) => c.column_name), ["id", "name", "email", "category", "batch_year", "department", "department_other", "organisation", "mobile", "consent_at", "privacy_version", "visit_count", "created_at", "updated_at", "last_seen_at"]);
assert.equal(visitors.find((c) => c.column_name === "email").data_type, "text");
assert.equal((await q("select count(*)::int as n from pg_extension where extname<>'plpgsql'")).rows[0].n, 0, "no extensions required");
assert.deepEqual((await cols("visits")).map((c) => c.column_name), ["id", "visitor_id", "started_at", "ip_hash", "user_agent"]);
assert.deepEqual((await cols("admin_sessions")).map((c) => c.column_name), ["token_hash", "created_at", "last_used_at", "expires_at", "ip_hash"]);
assert.deepEqual((await cols("rate_limits")).map((c) => c.column_name), ["bucket", "window_start", "count"]);
const idx = (await q("select indexname from pg_indexes where schemaname='public' order by 1")).rows.map((r) => r.indexname);
for (const name of ["visitors_created_at_idx", "visitors_category_idx", "visits_started_at_idx", "visitors_email_lower_key"]) assert.ok(idx.includes(name), `index ${name}`);
assert.ok(!visitors.some((c) => /password/i.test(c.column_name)), "no visitor password column (Decision H)");

// Constraint checks.
await assert.rejects(q("insert into visitors(name,email,category,consent_at,privacy_version) values('x','a@b.co','robot',now(),1)"), /check/i, "category enum enforced");
await assert.rejects(q("insert into visitors(name,email,category,mobile,consent_at,privacy_version) values('x','a@b.co','guest','12345',now(),1)"), /check/i, "mobile must be 10 digits starting 6-9");
await q("insert into visitors(name,email,category,consent_at,privacy_version) values('Case','Same@Example.org','guest',now(),1)");
await assert.rejects(q("insert into visitors(name,email,category,consent_at,privacy_version) values('Case2','same@example.ORG','guest',now(),1)"), /duplicate|unique/i, "email uniqueness is case-insensitive");

// Purge: old ip hashes, old rate-limit rows, expired admin sessions, --email deletion.
const { rows: [{ id: vid }] } = await q("select id from visitors where lower(email)='same@example.org'");
await q("insert into visits(visitor_id, started_at, ip_hash, user_agent) values ($1, now() - interval '40 days', repeat('a',64), 'old'), ($1, now(), repeat('b',64), 'new')", [vid]);
await q("insert into rate_limits(bucket, window_start, count) values ('old', now() - interval '2 days', 1), ('fresh', now(), 1)");
await q("insert into admin_sessions(token_hash, expires_at) values (repeat('c',64), now() - interval '1 hour'), (repeat('d',64), now() + interval '1 hour')");
const purged = await purge(url, {});
assert.deepEqual(purged, { visits_ip_hash_cleared: 1, rate_limits_deleted: 1, admin_sessions_deleted: 1, visitors_deleted: 0 });
assert.equal((await q("select count(*)::int as n from visits where ip_hash is null")).rows[0].n, 1, "old visit row kept, only its ip_hash cleared");
assert.equal((await q("select count(*)::int as n from visits")).rows[0].n, 2);
const purgedEmail = await purge(url, { email: "SAME@example.org" });
assert.equal(purgedEmail.visitors_deleted, 1);
assert.equal((await q("select count(*)::int as n from visits")).rows[0].n, 0, "visits cascade with the visitor");

// Rollback.
const rb = await rollback(url, 1);
assert.deepEqual(rb.reverted, [1]);
assert.deepEqual(await tables(), ["schema_migrations"], "rollback drops the application tables and leaves the ledger");
assert.deepEqual(await status(url), { applied: [], pending: [1] });
await client.end();
console.log("PASS: migrations apply from scratch, are idempotent, enforce constraints, purge correctly, and roll back.");
