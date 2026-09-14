import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { siteRoot } from "./lib.mjs";
import { findSecretLeaks, isScannable } from "./check-secrets-core.mjs";

// Sprint v3 Task 18 — `npm run check:secrets`: scan every git-tracked file under
// 05_WEBSITE plus the built _site/ for credential-shaped strings. Exit 1 on any hit.
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: siteRoot, encoding: "utf8" }).split("\0").filter(Boolean);
const built = fs.existsSync(path.join(siteRoot, "_site"))
  ? execFileSync("find", ["_site", "-type", "f"], { cwd: siteRoot, encoding: "utf8" }).split("\n").filter(Boolean)
  : [];
const candidates = [...new Set([...tracked, ...built])].filter(isScannable);
const files = candidates.map((p) => ({ path: p, content: fs.readFileSync(path.join(siteRoot, p), "utf8") }));
const leaks = findSecretLeaks(files);
const envFiles = tracked.filter((p) => /^\.env(?:\..*)?$/.test(p) && p !== ".env.example");
if (envFiles.length) leaks.push(...envFiles.map((p) => ({ path: p, line: 0, rule: "env file tracked by git" })));
if (leaks.length) {
  console.error(`Secret scan FAILED (${leaks.length} finding(s)):`);
  for (const l of leaks) console.error(`  ${l.path}:${l.line}  ${l.rule}`);
  process.exit(1);
}
console.log(`Secret scan passed: ${files.length} files scanned, no findings.`);
