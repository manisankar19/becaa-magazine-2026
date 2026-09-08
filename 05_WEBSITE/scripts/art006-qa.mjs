import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ensureDir, siteRoot } from "./lib.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
const pageCount = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
let start = 0, end = 0, contact = 0;
for (let page = 1; page <= pageCount; page++) {
  const text = execFileSync("pdftotext", ["-f", String(page), "-l", String(page), pdf, "-"], { encoding: "utf8" });
  if (!start && text.includes("ARTICLES · ART-006")) start = page;
  if (start && text.includes("linkedin.com/in/indranil-ghosh")) end = page;
  if (!contact && text.includes("Connect with BECAA Maharashtra")) contact = page;
}
if (!start || !end || !contact) throw new Error(`Unable to locate required QA pages: ART-006 ${start}-${end}; contact ${contact}.`);
const articleDir = path.join(siteRoot, "qa-output", "art-006");
const publicationDir = path.join(siteRoot, "qa-output", "publication-pages");
fs.rmSync(articleDir, { recursive: true, force: true });
fs.rmSync(publicationDir, { recursive: true, force: true });
ensureDir(articleDir); ensureDir(publicationDir);
for (let page = start; page <= end; page++) execFileSync("pdftoppm", ["-f", String(page), "-l", String(page), "-singlefile", "-png", "-r", "120", pdf, path.join(articleDir, `ART-006-page-${page}`)]);
for (const page of [1, contact]) execFileSync("pdftoppm", ["-f", String(page), "-l", String(page), "-singlefile", "-png", "-r", "120", pdf, path.join(publicationDir, `page-${page}`)]);
console.log(`Rendered ART-006 pages ${start}-${end}, cover page 1 and contact page ${contact}.`);
