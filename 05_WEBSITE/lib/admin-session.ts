// Server-side administrator sessions (Sprint v3 Task 21, PRD §5.1).
// The raw 256-bit token lives only in the `becaa_a` cookie; the table stores sha256(token).
// Absolute expiry 12 h, idle expiry 60 min; creating a session rotates (deletes) all others
// because there is exactly one administrator.
import { ADMIN_SESSION_ABSOLUTE_SECONDS, ADMIN_SESSION_IDLE_SECONDS } from "./config.ts";

export const ADMIN_COOKIE = "becaa_a";

// Minimal query interface so the store can be unit-tested with a fake and used with pg in production.
export interface Queryable {
  query(text: string, params?: readonly unknown[]): Promise<{ rowCount: number | null; rows: Array<Record<string, unknown>> }>;
}

export interface AdminSessionRow {
  token_hash: string;
  created_at: Date | string;
  last_used_at: Date | string;
  expires_at: Date | string;
  ip_hash: string | null;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

export async function createAdminSession(db: Queryable, { ipHash, now = Date.now() }: { ipHash: string | null; now?: number }): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const nowIso = new Date(now).toISOString();
  const expiresIso = new Date(now + ADMIN_SESSION_ABSOLUTE_SECONDS * 1000).toISOString();
  await db.query("delete from admin_sessions"); // rotate: single administrator, one live session
  await db.query("insert into admin_sessions (token_hash, expires_at, ip_hash, created_at, last_used_at) values ($1, $2, $3, $4, $4)", [tokenHash, expiresIso, ipHash, nowIso]);
  return token;
}

export async function resolveAdminSession(db: Queryable, token: string | undefined | null, now: number = Date.now()): Promise<AdminSessionRow | null> {
  if (!token || typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = await hashToken(token);
  const { rows } = await db.query("select token_hash, created_at, last_used_at, expires_at, ip_hash from admin_sessions where token_hash = $1", [tokenHash]);
  const row = rows[0] as AdminSessionRow | undefined;
  if (!row) return null;
  const expiresAt = new Date(row.expires_at as string).getTime();
  const lastUsed = new Date(row.last_used_at as string).getTime();
  if (now > expiresAt || now - lastUsed > ADMIN_SESSION_IDLE_SECONDS * 1000) {
    await db.query("delete from admin_sessions where token_hash = $1", [tokenHash]);
    return null;
  }
  await db.query("update admin_sessions set last_used_at = $1 where token_hash = $2", [new Date(now).toISOString(), tokenHash]);
  return { ...row, last_used_at: new Date(now).toISOString() };
}

export async function revokeAdminSession(db: Queryable, token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const { rowCount } = await db.query("delete from admin_sessions where token_hash = $1", [await hashToken(token)]);
  return (rowCount ?? 0) > 0;
}

export function adminCookie(token: string, { secure }: { secure: boolean }): string {
  // No Max-Age: a browser session cookie; real expiry is enforced server-side.
  return [`${ADMIN_COOKIE}=${token}`, "HttpOnly", secure ? "Secure" : "", "SameSite=Strict", "Path=/"].filter(Boolean).join("; ");
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
