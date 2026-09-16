// Sprint v4 Task 30 (release evidence; Tasks 27, 33, 34): render the PDF pages a reviewer
// needs to see for this sprint. Requires `npm run pdf`.
//   qa-output/v4-pages/pNN-<ID>.png          150 dpi — contents, ART-010, ADV-027/028/029 and
//                                            every page touched by a committee correction
//   qa-output/v4-justification/pdf-page-NN-<ID>.png  100 dpi — every article page
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureDir, readManifest, siteRoot } from "./lib.mjs";
import { V4_CORRECTIONS } from "./v4-corrections.mjs";
import { planV4PageRenders } from "./v4-pages-core.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
if (!fs.existsSync(pdf)) throw new Error("run npm run pdf first");

const correctedIds = [...new Set(V4_CORRECTIONS.map((c) => c.id))];
const evidenceIds = [...new Set(["ART-010", "ADV-027", "ADV-028", "ADV-029", ...correctedIds])];
const articleIds = readManifest().items.filter((i) => i.type === "article" && i.print_include).map((i) => i.id);
const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 50_000_000 });
const pages = text.split("\f");
if (pages.at(-1).trim() === "") pages.pop();
const plan = planV4PageRenders(pages, { evidenceIds, articleIds });

function render(entries, dir, dpi, name) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  for (const { page, id } of entries) {
    const prefix = path.join(dir, name(page, id));
    execFileSync("pdftoppm", ["-f", String(page), "-l", String(page), "-r", String(dpi), "-png", "-singlefile", pdf, prefix]);
    if (!fs.existsSync(`${prefix}.png`)) throw new Error(`render failed: ${prefix}.png`);
  }
  return entries.length;
}

const pad = (n) => String(n).padStart(2, "0");
const evidenceCount = render(plan.evidence, path.join(siteRoot, "qa-output", "v4-pages"), 150, (page, id) => `p${pad(page)}-${id}`);
const articleCount = render(plan.justification, path.join(siteRoot, "qa-output", "v4-justification"), 100, (page, id) => `pdf-page-${pad(page)}-${id}`);
fs.writeFileSync(path.join(siteRoot, "qa-output", "v4-pages", "index.json"), `${JSON.stringify({ generated: new Date().toISOString(), pdfPages: pages.length, ...plan }, null, 2)}\n`);
console.log(`Rendered ${evidenceCount} evidence pages (qa-output/v4-pages, 150 dpi) and ${articleCount} article pages (qa-output/v4-justification, 100 dpi) from a ${pages.length}-page PDF.`);
