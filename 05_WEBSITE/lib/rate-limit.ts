// PostgreSQL-backed rate limiting (Sprint v3 Task 22, PRD §5.3).
// One row per bucket; a single INSERT … ON CONFLICT statement both resets an elapsed
// window and increments the counter, so concurrent requests cannot race past the limit.
// Buckets look like "register:<ip_hash>" or "login:<username>". Old rows are removed by
// `npm run db:purge`.
import type { Queryable } from "./admin-session";

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  count: number;
  retryAfterSeconds: number;
}

const UPSERT = `
  insert into rate_limits (bucket, window_start, count)
  values ($1, $2, 1)
  on conflict (bucket) do update set
    count = case when rate_limits.window_start < $3 then 1 else rate_limits.count + 1 end,
    window_start = case when rate_limits.window_start < $3 then $2 else rate_limits.window_start end
  returning count, window_start`;

export async function consume(db: Queryable, bucket: string, limit: number, windowSeconds: number, now: number = Date.now()): Promise<ConsumeResult> {
  const nowIso = new Date(now).toISOString();
  const cutoffIso = new Date(now - windowSeconds * 1000).toISOString();
  const { rows } = await db.query(UPSERT, [bucket, nowIso, cutoffIso]);
  const row = rows[0] as { count: number; window_start: Date | string };
  const count = Number(row.count);
  const windowStart = new Date(row.window_start as string).getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowSeconds * 1000 - now) / 1000));
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), count, retryAfterSeconds };
}

// Login lockout: count failures in the same bucket; locked while count >= lockoutAfter within the window.
export async function recordLoginFailure(db: Queryable, bucket: string, lockoutAfter: number, lockoutSeconds: number, now: number = Date.now()): Promise<ConsumeResult> {
  return consume(db, bucket, lockoutAfter, lockoutSeconds, now);
}

export async function isLockedOut(db: Queryable, bucket: string, lockoutAfter: number, lockoutSeconds: number, now: number = Date.now()): Promise<boolean> {
  const { rows } = await db.query("select count, window_start from rate_limits where bucket = $1", [bucket]);
  const row = rows[0] as { count: number; window_start: Date | string } | undefined;
  if (!row) return false;
  const windowStart = new Date(row.window_start as string).getTime();
  return Number(row.count) >= lockoutAfter && now - windowStart < lockoutSeconds * 1000;
}

export async function clearLoginFailures(db: Queryable, bucket: string): Promise<void> {
  await db.query("delete from rate_limits where bucket = $1", [bucket]);
}
