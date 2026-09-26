// Sprint v5 Task 22 (PRD §11, Decision Q): `npm run qa:blocklist` — fail if any class or id used
// by the built pages is hidden site-wide by EasyList's generic cosmetic rules (committed snapshot:
// scripts/data/easylist-generic-hide-selectors.txt). Requires `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib.mjs";
import { extractGenericHideSelectors, findBlockedTokens } from "./blocklist-guard-core.mjs";

const PAGES = ["index.html", "print/index.html", "welcome/index.html", "admin/index.html"];
const snapshot = fs.readFileSync(path.join(siteRoot, "scripts", "data", "easylist-generic-hide-selectors.txt"), "utf8");
const selectors = extractGenericHideSelectors(snapshot);
const source = (snapshot.match(/^! Source: (.+)$/m) ?? [])[1] ?? "snapshot";
let problems = 0;
for (const page of PAGES) {
  const file = path.join(siteRoot, "_site", page);
  if (!fs.existsSync(file)) throw new Error(`_site/${page} is missing — run npm run build first`);
  const blocked = findBlockedTokens(fs.readFileSync(file, "utf8"), selectors);
  for (const b of blocked) console.error(`  BLOCKED _site/${page}: ${b.kind === "class" ? "." : "#"}${b.name} (generic rule ${b.kind === "class" ? "##." : "###"}${b.name})`);
  problems += blocked.length;
}
if (problems) {
  console.error(`Ad-blocker guard FAILED: ${problems} class/id name(s) would be hidden by EasyList for visitors with an ad blocker.`);
  process.exit(1);
}
console.log(`Ad-blocker guard passed: ${PAGES.length} pages, no class or id matches ${selectors.classes.size + selectors.ids.size} generic EasyList hide rules (${source}).`);
