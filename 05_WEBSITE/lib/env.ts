// Environment access for the function handlers (Sprint v3). Secrets are read at call
// time (not import time) so tests can set them, and a missing secret fails loudly.
export function requireEnv(name: "SESSION_SECRET" | "IP_HASH_SALT" | "DATABASE_URL" | "ADMIN_USERNAME" | "ADMIN_PASSWORD_HASH"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function registrationEnabled(): boolean {
  return (process.env.REGISTRATION_ENABLED ?? "true").toLowerCase() !== "false";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
