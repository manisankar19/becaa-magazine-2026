// Synchroniser CSRF token for administrator state-changing requests (Sprint v3 Task 21).
// token = HMAC-SHA256(SESSION_SECRET, "csrf:" + sha256(adminSessionToken)); no server state needed,
// and a token issued for one session cannot be replayed against another.
import { hmacSign, hmacVerify } from "./session.ts";

export async function csrfTokenFor(sessionTokenHash: string, secret: string): Promise<string> {
  return hmacSign(secret, `csrf:${sessionTokenHash}`);
}

export async function verifyCsrf(token: string | undefined | null, sessionTokenHash: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  return hmacVerify(secret, `csrf:${sessionTokenHash}`, token);
}
