// Sprint v5 Task 16 (release evidence): render the PDF pages a reviewer needs for this sprint —
// the contents, the replaced MSG-001 (the President's new message) and the ART-011 byline
// correction. Requires `npm run pdf`. Uses the page planner from Sprint v4 (v4-pages-core.mjs).
//   qa-output/v5-pages/pNN-<ID>.png   150 dpi, plus index.json
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureDir, siteRoot } from "./lib.mjs";
import { V5_CORRECTIONS } from "./v5-corrections.mjs";
import { planV4PageRenders } from "./v4-pages-core.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
if (!fs.existsSync(pdf)) throw new Error("run npm run pdf first");

const evidenceIds = [...new Set(["MSG-001", ...V5_CORRECTIONS.map((c) => c.id)])];
const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 50_000_000 });
const pages = text.split("\f");
if (pages.at(-1).trim() === "") pages.pop();
const { contentsPages, evidence } = planV4PageRenders(pages, { evidenceIds });

const dir = path.join(siteRoot, "qa-output", "v5-pages");
fs.rmSync(dir, { recursive: true, force: true });
ensureDir(dir);
const pad = (n) => String(n).padStart(2, "0");
for (const { page, id } of evidence) {
  const prefix = path.join(dir, `p${pad(page)}-${id}`);
  execFileSync("pdftoppm", ["-f", String(page), "-l", String(page), "-r", "150", "-png", "-singlefile", pdf, prefix]);
  if (!fs.existsSync(`${prefix}.png`)) throw new Error(`render failed: ${prefix}.png`);
}
fs.writeFileSync(path.join(dir, "index.json"), `${JSON.stringify({ generated: new Date().toISOString(), pdfPages: pages.length, evidenceIds, contentsPages, evidence }, null, 2)}\n`);
console.log(`Rendered ${evidence.length} evidence pages (qa-output/v5-pages, 150 dpi) from a ${pages.length}-page PDF.`);
