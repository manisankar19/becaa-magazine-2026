// Unit test for scripts/check-secrets-core.mjs — Sprint v3 Task 18. Hermetic.
import assert from "node:assert/strict";
import { findSecretLeaks, isScannable } from "../../scripts/check-secrets-core.mjs";

const files = (entries) => entries.map(([path, content]) => ({ path, content }));

assert.deepEqual(findSecretLeaks(files([["README.md", "Set DATABASE_URL in Vercel. Example placeholder: postgres://USER:PASSWORD@HOST/DB"]])), [], "placeholder-style URL with upper-case tokens is not a leak");
assert.deepEqual(findSecretLeaks(files([[".env.example", "DATABASE_URL=\nSESSION_SECRET=\nADMIN_PASSWORD_HASH="]])), [], "empty values in .env.example are fine");

let leaks = findSecretLeaks(files([["lib/db.ts", 'const url = "postgres://becaa:s3cretpw@ep-cool-123.neon.tech/becaa?sslmode=require";']]));
assert.equal(leaks.length, 1); assert.equal(leaks[0].path, "lib/db.ts"); assert.match(leaks[0].rule, /postgres/i); assert.equal(leaks[0].line, 1);

leaks = findSecretLeaks(files([["scripts/x.mjs", "\n\nSESSION_SECRET=" + "Zm9v".repeat(10) + "==\n"]])); // fixture built at runtime so it is not itself a literal
assert.equal(leaks.length, 1); assert.match(leaks[0].rule, /SESSION_SECRET/); assert.equal(leaks[0].line, 3);

leaks = findSecretLeaks(files([["notes.md", "hash: $argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG"]]));
assert.equal(leaks.length, 1); assert.match(leaks[0].rule, /argon2/);

leaks = findSecretLeaks(files([["a.ts", "IP_HASH_SALT=abc123def456"], ["b.ts", "ADMIN_PASSWORD_HASH='$argon2id$v=19$m=1,t=1,p=1$YQ$YQ'"]]));
assert.equal(leaks.length, 2, "both env-style assignments with real values are leaks");

assert.deepEqual(findSecretLeaks(files([["tests/unit/check-secrets-core.test.mjs", "postgres://becaa:s3cretpw@host/db"]])), [], "the scanner's own test fixtures are exempt");
assert.deepEqual(findSecretLeaks(files([["scripts/check-secrets-core.mjs", "/postgres:\\/\\//"]])), [], "the scanner itself is exempt");

// Leaked value is never echoed back — only path, line and rule.
leaks = findSecretLeaks(files([["c.ts", "SESSION_SECRET=supersecretvalue123456"]]));
assert.ok(!JSON.stringify(leaks).includes("supersecretvalue"), "findings must not contain the secret");

assert.equal(isScannable("lib/db.ts"), true);
assert.equal(isScannable("node_modules/pg/lib/index.js"), false);
assert.equal(isScannable("_site/index.html"), true, "built output is scanned too");
assert.equal(isScannable("src/assets/normalized/cover/x.png"), false, "binaries skipped");
assert.equal(isScannable(".env.local"), false, "ignored env files are not read at all (they must not exist in git)");
assert.equal(isScannable("package-lock.json"), false);
console.log("All check-secrets-core unit tests passed.");
