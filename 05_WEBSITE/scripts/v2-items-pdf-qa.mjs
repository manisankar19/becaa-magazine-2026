import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { siteRoot, ensureDir } from "./lib.mjs";

// Sprint v2 Task 14: PDF QA for the new cover page and the three new items.
// pdf-qa.mjs already covers advertisements only; this follows the same
// manifest-driven "find the real content page, render it" approach for
// GAL-007/ART-010/ART-011, plus the fixed cover page.
const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
if (!fs.existsSync(pdf)) throw new Error("Complete review PDF is missing.");

const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 30_000_000 });
const pages = text.split("\f");

const outDir = path.join(siteRoot, "qa-output", "pdf-v2-items");
ensureDir(outDir);

const report = [{ id: "COV-001", page: 1, image: "pdf-v2-items/COV-001-page.png" }];
execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-singlefile", "-png", "-r", "96", pdf, path.join(outDir, "COV-001-page")]);

for (const id of ["ART-010", "ART-011", "GAL-007"]) {
  // Last match wins: the ID also appears once in the earlier table of
  // contents, and always again later on its own real content page.
  const pageIndex = pages.reduce((found, page, index) => (page.includes(id) ? index : found), -1);
  if (pageIndex < 0) throw new Error(`${id} is not present in PDF text.`);
  const prefix = path.join(outDir, `${id}-page`);
  execFileSync("pdftoppm", ["-f", String(pageIndex + 1), "-l", String(pageIndex + 1), "-singlefile", "-png", "-r", "96", pdf, prefix]);
  report.push({ id, page: pageIndex + 1, image: `pdf-v2-items/${id}-page.png` });
}

fs.writeFileSync(path.join(siteRoot, "qa-output", "pdf-v2-items-qa.json"), JSON.stringify({ generated: new Date().toISOString(), items: report }, null, 2));
console.log(`Rendered ${report.length} v2 item PDF pages: ${report.map((r) => `${r.id} (p.${r.page})`).join(", ")}`);
