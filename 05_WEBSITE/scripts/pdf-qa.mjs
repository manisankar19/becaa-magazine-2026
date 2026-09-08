import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readManifest, siteRoot, ensureDir } from "./lib.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
if (!fs.existsSync(pdf)) throw new Error("Complete review PDF is missing.");
const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 30_000_000 });
const pages = text.split("\f");
const ads = readManifest().items.filter((item) => item.type === "advertisement" && item.print_include);
const outDir = path.join(siteRoot, "qa-output", "pdf-advertisements");
ensureDir(outDir);
const report = [];
for (const ad of ads) {
  const pageIndex = pages.reduce((found, page, index) => page.includes(ad.id) ? index : found, -1);
  if (pageIndex < 0) throw new Error(`${ad.id} is not present in PDF text.`);
  const prefix = path.join(outDir, `${ad.id}-page`);
  execFileSync("pdftoppm", ["-f", String(pageIndex + 1), "-l", String(pageIndex + 1), "-singlefile", "-png", "-r", "96", pdf, prefix]);
  report.push({ id: ad.id, page: pageIndex + 1, image: `pdf-advertisements/${ad.id}-page.png` });
}
fs.writeFileSync(path.join(siteRoot, "qa-output", "pdf-advertisement-qa.json"), JSON.stringify({ generated: new Date().toISOString(), advertisements: report }, null, 2));
console.log(`Rendered ${report.length} advertisement PDF pages.`);
