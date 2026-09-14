// Password hashing for the single administrator credential (Sprint v3 Task 21).
// argon2id with the library defaults (m=65536 KiB, t=3, p=4). The stored value is the
// ADMIN_PASSWORD_HASH environment variable; the plaintext is never persisted or logged.
import argon2 from "argon2";

// A real argon2id hash of a random string, used so that a missing/malformed configured
// hash still costs one verification — login timing does not reveal configuration state.
const DUMMY_HASH_PROMISE = argon2.hash("becaa-dummy-" + Math.random().toString(36).slice(2));

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string | undefined | null, password: string): Promise<boolean> {
  const candidate = typeof hash === "string" && hash.startsWith("$argon2id$") ? hash : await DUMMY_HASH_PROMISE;
  let ok = false;
  try {
    ok = await argon2.verify(candidate, password);
  } catch {
    ok = false;
  }
  return candidate === hash && ok;
}
