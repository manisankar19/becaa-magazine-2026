// Pure secret-leak scanner rules (Sprint v3 Task 18). No I/O.
// Findings never include the matched value — only path, line number and rule name.
const RULES = [
  // Password segment must contain a lowercase letter or digit, so documentation placeholders
  // such as postgres://USER:PASSWORD@HOST/DB are not reported.
  { rule: "postgres connection string with credentials", re: /postgres(?:ql)?:\/\/[^\s"'`:@/]+:(?=[^\s"'`@/]*[a-z0-9])[^\s"'`@/]+@[A-Za-z0-9]/ },
  { rule: "SESSION_SECRET / IP_HASH_SALT value", re: /\b(?:SESSION_SECRET|IP_HASH_SALT)\s*=\s*["']?[A-Za-z0-9+/=_-]{8,}/ },
  { rule: "argon2 hash", re: /\$argon2(?:id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+/ },
  { rule: "ADMIN_PASSWORD_HASH value", re: /\bADMIN_PASSWORD_HASH\s*=\s*["']?\$/ },
];
const EXEMPT = [/^scripts\/check-secrets(?:-core)?\.mjs$/, /^tests\/unit\/check-secrets-core\.test\.mjs$/];
const SKIP_DIRS = /^(?:node_modules|\.pgdata|\.vercel|\.cache|qa-output|tests\/screenshots)\//;
const BINARY = /\.(?:png|jpe?g|webp|gif|svg|pdf|woff2?|ttf|otf|ico|xlsx|docx|pptx|zip|lock)$/i;

export function isScannable(path) {
  if (SKIP_DIRS.test(path)) return false;
  if (/^\.env(?:\..*)?$/.test(path) && path !== ".env.example") return false;
  if (path === "package-lock.json" || BINARY.test(path)) return false;
  return true;
}

export function findSecretLeaks(files) {
  const leaks = [];
  for (const { path, content } of files) {
    if (EXEMPT.some((re) => re.test(path))) continue;
    const lines = String(content).split("\n");
    lines.forEach((text, i) => {
      const hit = RULES.find(({ re }) => re.test(text)); // one finding per line
      if (hit) leaks.push({ path, line: i + 1, rule: hit.rule });
    });
  }
  return leaks;
}
