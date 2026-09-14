import pg from "pg";

// Sprint v3 Task 19 — retention housekeeping (sprints/v3/PRD.md §5.6). Owner-run, never on a timer.
//   npm run db:purge                    clear visits.ip_hash older than 30 days, delete rate_limits
//                                       rows older than 1 day and expired admin_sessions
//   npm run db:purge -- --email <addr>  additionally delete one visitor (visits cascade)
export async function purge(url, { email } = {}) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const result = {
      visits_ip_hash_cleared: (await client.query("update visits set ip_hash = null where ip_hash is not null and started_at < now() - interval '30 days'")).rowCount,
      rate_limits_deleted: (await client.query("delete from rate_limits where window_start < now() - interval '1 day'")).rowCount,
      admin_sessions_deleted: (await client.query("delete from admin_sessions where expires_at < now()")).rowCount,
      visitors_deleted: 0,
    };
    if (email) result.visitors_deleted = (await client.query("delete from visitors where lower(email) = lower($1)", [String(email).trim()])).rowCount;
    return result;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL is not set"); process.exit(2); }
  const i = process.argv.indexOf("--email");
  const email = i > -1 ? process.argv[i + 1] : undefined;
  const r = await purge(url, { email });
  console.log(JSON.stringify(r));
}
