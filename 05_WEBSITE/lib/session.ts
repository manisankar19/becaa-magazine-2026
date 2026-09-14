// Stateless visitor session cookie (Sprint v3 Task 21, PRD §5.1).
// value = base64url(JSON payload) "." base64url(HMAC-SHA256(secret, payloadPart))
// Web Crypto only, so the same code verifies cookies inside Vercel edge middleware.
import { VISITOR_SESSION_MAX_AGE_SECONDS } from "./config.ts";

export const VISITOR_COOKIE = "becaa_v";

export interface VisitorSession {
  visitor_id: string;
  issued_at: number; // epoch ms
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(new ArrayBuffer(bin.length)); // plain ArrayBuffer so it satisfies BufferSource
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function hmacSign(secret: string, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return b64url(sig);
}

export async function hmacVerify(secret: string, data: string, signature: string): Promise<boolean> {
  const sigBytes = fromB64url(signature);
  if (!sigBytes || sigBytes.length !== 32) return false;
  // crypto.subtle.verify is constant-time with respect to the signature bytes.
  return crypto.subtle.verify("HMAC", await hmacKey(secret), sigBytes, enc.encode(data));
}

export async function signVisitorSession(session: VisitorSession, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ visitor_id: session.visitor_id, issued_at: session.issued_at })));
  return `${payload}.${await hmacSign(secret, payload)}`;
}

export async function verifyVisitorSession(value: string | undefined | null, secret: string, now: number = Date.now()): Promise<VisitorSession | null> {
  if (!value || typeof value !== "string") return null;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot !== value.lastIndexOf(".")) return null;
  const payloadPart = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!(await hmacVerify(secret, payloadPart, signature))) return null;
  const bytes = fromB64url(payloadPart);
  if (!bytes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { visitor_id, issued_at } = parsed as Record<string, unknown>;
  if (typeof visitor_id !== "string" || typeof issued_at !== "number") return null;
  if (issued_at > now + 60_000) return null; // issued in the future
  if (now - issued_at > VISITOR_SESSION_MAX_AGE_SECONDS * 1000) return null;
  return { visitor_id, issued_at };
}

export interface CookieOptions {
  secure: boolean;
}

export function isSecureCookieEnvironment(): boolean {
  return process.env.NODE_ENV !== "development";
}

export function visitorCookie(value: string, { secure }: CookieOptions): string {
  return [`${VISITOR_COOKIE}=${value}`, "HttpOnly", secure ? "Secure" : "", "SameSite=Lax", "Path=/", `Max-Age=${VISITOR_SESSION_MAX_AGE_SECONDS}`].filter(Boolean).join("; ");
}

export function clearCookie(name: string): string {
  return `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}
