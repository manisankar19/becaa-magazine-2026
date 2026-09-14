import fs from "node:fs";
import path from "node:path";
import { siteRoot, walkFiles } from "./lib.mjs";
import { findUnsafeSql } from "./check-sql-core.mjs";

// `npm run check:sql` — Sprint v3 Task 32. Scans api/ and lib/ (and middleware.ts) for
// string-built SQL. Exit 1 on any finding.
const roots = ["api", "lib"].map((d) => path.join(siteRoot, d));
const files = [...roots.flatMap((d) => walkFiles(d)), path.join(siteRoot, "middleware.ts")].filter((f) => /\.(ts|mjs|js)$/.test(f) && fs.existsSync(f));
const findings = files.flatMap((f) => findUnsafeSql(path.relative(siteRoot, f), fs.readFileSync(f, "utf8")));
if (findings.length) {
  console.error(`SQL gate FAILED (${findings.length} finding(s)):`);
  for (const f of findings) console.error(`  ${f.path}:${f.line}  ${f.reason}`);
  process.exit(1);
}
console.log(`SQL gate passed: ${files.length} files scanned, no string-built SQL.`);
