// Sprint v5 Task 22 (Decision Q): regenerate scripts/data/easylist-generic-hide-selectors.txt from
// the published EasyList. Only the generic single-class/single-id hide selectors are kept (names,
// one per line), which is all `npm run qa:blocklist` needs. Run by hand when refreshing:
//   node scripts/refresh-blocklist-snapshot.mjs
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib.mjs";
import { extractGenericHideSelectors } from "./blocklist-guard-core.mjs";

export const SOURCE_URL = "https://easylist.to/easylist/easylist.txt";
export const SNAPSHOT = path.join(siteRoot, "scripts", "data", "easylist-generic-hide-selectors.txt");

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`${SOURCE_URL}: HTTP ${response.status}`);
const text = await response.text();
const version = (text.match(/^! Version: (.+)$/m) ?? [])[1] ?? "unknown";
const { classes, ids } = extractGenericHideSelectors(text);
if (classes.size < 1000) throw new Error(`only ${classes.size} generic class rules found — refusing to write a suspicious snapshot`);
const header = [
  "! Generic cosmetic hide selectors extracted from EasyList — used by `npm run qa:blocklist`.",
  `! Source: ${SOURCE_URL} (EasyList version ${version}, fetched ${new Date().toISOString().slice(0, 10)})`,
  "! EasyList is dual-licensed GPLv3 / CC BY-SA 3.0 (https://easylist.to/pages/licence.html); this file",
  "! keeps only the selector names of its site-wide `##.class` / `###id` rules, in EasyList's own syntax.",
  "! Regenerate with: node scripts/refresh-blocklist-snapshot.mjs",
];
const body = [...[...classes].sort().map((c) => `##.${c}`), ...[...ids].sort().map((i) => `###${i}`)];
fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
fs.writeFileSync(SNAPSHOT, `${header.join("\n")}\n${body.join("\n")}\n`);
console.log(`Wrote ${classes.size} class and ${ids.size} id selectors (EasyList ${version}) to ${path.relative(siteRoot, SNAPSHOT)}`);
