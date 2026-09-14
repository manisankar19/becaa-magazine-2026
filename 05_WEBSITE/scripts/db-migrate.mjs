import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { siteRoot } from "./lib.mjs";

// Sprint v3 Task 19 — forward-only SQL migrations with a reverse file per version.
//   npm run db:migrate            apply pending db/migrations/NNN_*.sql in order (each in a transaction)
//   npm run db:status             list applied / pending versions
//   npm run db:rollback -- <N>    run db/rollback/NNN_*.sql for version N and remove it from the ledger
// The ledger table `schema_migrations` is created on first use.
const migrationsDir = path.join(siteRoot, "db", "migrations");
const rollbackDir = path.join(siteRoot, "db", "rollback");

function files(dir) {
  return fs.readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort().map((f) => ({ version: Number(f.slice(0, 3)), file: path.join(dir, f) }));
}

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("create table if not exists schema_migrations (version integer primary key, applied_at timestamptz not null default now())");
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function status(url) {
  return withClient(url, async (client) => {
    const applied = (await client.query("select version from schema_migrations order by version")).rows.map((r) => r.version);
    const pending = files(migrationsDir).map((m) => m.version).filter((v) => !applied.includes(v));
    return { applied, pending };
  });
}

export async function migrate(url) {
  return withClient(url, async (client) => {
    const applied = new Set((await client.query("select version from schema_migrations")).rows.map((r) => r.version));
    const done = [];
    for (const m of files(migrationsDir)) {
      if (applied.has(m.version)) continue;
      await client.query("begin");
      try {
        await client.query(fs.readFileSync(m.file, "utf8"));
        await client.query("insert into schema_migrations(version) values ($1)", [m.version]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw new Error(`migration ${path.basename(m.file)} failed: ${error.message}`);
      }
      done.push(m.version);
    }
    return { applied: done };
  });
}

export async function rollback(url, version) {
  return withClient(url, async (client) => {
    const target = files(rollbackDir).find((r) => r.version === Number(version));
    if (!target) throw new Error(`no rollback file for version ${version}`);
    const isApplied = (await client.query("select 1 from schema_migrations where version=$1", [version])).rowCount === 1;
    if (!isApplied) return { reverted: [] };
    await client.query("begin");
    try {
      await client.query(fs.readFileSync(target.file, "utf8"));
      await client.query("delete from schema_migrations where version=$1", [version]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    return { reverted: [Number(version)] };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL is not set"); process.exit(2); }
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "migrate") { const r = await migrate(url); console.log(r.applied.length ? `Applied migration(s): ${r.applied.join(", ")}` : "No pending migrations."); }
  else if (cmd === "status") { const r = await status(url); console.log(`Applied: ${r.applied.join(", ") || "none"}\nPending: ${r.pending.join(", ") || "none"}`); }
  else if (cmd === "rollback") { if (!arg) { console.error("usage: db-migrate.mjs rollback <version>"); process.exit(2); } const r = await rollback(url, Number(arg)); console.log(r.reverted.length ? `Reverted: ${r.reverted.join(", ")}` : "Nothing to revert."); }
  else { console.error("usage: db-migrate.mjs migrate|status|rollback <version>"); process.exit(2); }
}
