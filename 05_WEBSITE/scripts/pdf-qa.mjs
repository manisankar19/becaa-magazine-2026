import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { readManifest, siteRoot, ensureDir } from "./lib.mjs";
import { findBadAdvertisementTitles, findPdfPageIndex, pixelMatchesHex, contentBoxSamplePoint, contentsEntries } from "./ad-qa-checks-core.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
if (!fs.existsSync(pdf)) throw new Error("Complete review PDF is missing.");
const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 30_000_000 });
const pages = text.split("\f");
const ads = readManifest().items.filter((item) => item.type === "advertisement" && item.print_include);
const outDir = path.join(siteRoot, "qa-output", "pdf-advertisements");
ensureDir(outDir);
const report = [];
const DPI = 96;
const sample = contentBoxSamplePoint(DPI);
const renderedTitles = {};
// Contents pages (page 2 onward, before the first item page): "N. <title> <ID>" lines.
// The list spans more than one page, so gather every page that carries no item kicker.
const contentsLines = pages.filter((page) => !/· (?:MSG|ART|GAL|ADV)-\d{3}\b/.test(page)).flatMap((page) => page.split("\n"));
const pdfContentsEntries = contentsEntries(contentsLines); // long titles wrap onto the next line
for (const ad of ads) {
  const pageIndex = findPdfPageIndex(pages, ad.id);
  if (pageIndex < 0) throw new Error(`${ad.id} is not present in PDF text.`);
  const prefix = path.join(outDir, `${ad.id}-page`);
  execFileSync("pdftoppm", ["-f", String(pageIndex + 1), "-l", String(pageIndex + 1), "-singlefile", "-png", "-r", String(DPI), pdf, prefix]);

  // Sprint v3 Task 15: heading text on the page + contents entry, and the tinted content box.
  const pageLines = pages[pageIndex].split("\n").map((l) => l.trim()).filter(Boolean);
  const kickerAt = pageLines.findIndex((l) => l.includes(`· ${ad.id}`));
  const heading = pageLines.slice(kickerAt + 1, kickerAt + 3).join(" ").replace(/\s+/g, " ").trim(); // headings may wrap to 2 lines
  const headingText = heading.startsWith(ad.title) ? ad.title : heading;
  const contentsTitle = pdfContentsEntries.get(ad.id)?.title ?? "";
  renderedTitles[ad.id] = [headingText, contentsTitle];

  const { data } = await sharp(`${prefix}.png`).extract({ left: sample.x, top: sample.y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const rgb = [data[0], data[1], data[2]];
  const tinted = ad.page_background_mode === "none" ? null : pixelMatchesHex(rgb, ad.page_background, 6);
  if (tinted === false) throw new Error(`${ad.id} PDF page ${pageIndex + 1}: content box pixel rgb(${rgb.join(",")}) does not match page_background ${ad.page_background}.`);
  report.push({ id: ad.id, page: pageIndex + 1, image: `pdf-advertisements/${ad.id}-page.png`, title: ad.title, page_background: ad.page_background ?? null, sampled_rgb: rgb, tinted });
}
const badTitles = findBadAdvertisementTitles(ads, renderedTitles);
if (badTitles.length) throw new Error(`PDF advertisement title problems: ${badTitles.map((b) => `${b.id} "${b.text}" (${b.reason})`).join("; ")}`);
fs.writeFileSync(path.join(siteRoot, "qa-output", "pdf-advertisement-qa.json"), JSON.stringify({ generated: new Date().toISOString(), advertisements: report }, null, 2));
console.log(`Rendered ${report.length} advertisement PDF pages; titles and tinted content boxes verified.`);
