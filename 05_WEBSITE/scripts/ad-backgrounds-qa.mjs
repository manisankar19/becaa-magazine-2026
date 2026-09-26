import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { startStaticServer } from "../tests/e2e/static-server.mjs";
import { readManifest, siteRoot, ensureDir } from "./lib.mjs";
import { resolveInk } from "./ad-presentation-core.mjs";
import { buildReviewMarkdown, contactSheetLayout, swatchSvg } from "./ad-review-core.mjs";

// Sprint v3 Task 16 — one review sheet for all advertisement page backgrounds.
// Inputs: publication.yaml, qa-output/pdf-advertisements/<ID>-page.png (from `npm run qa:pdf`).
// Outputs: qa-output/ad-backgrounds/AD_BACKGROUND_REVIEW.md, swatches/*.svg, web-cards/*.png, contact-sheet.png.
const qaRoot = path.join(siteRoot, "qa-output");
const outDir = path.join(qaRoot, "ad-backgrounds");
const pdfDir = path.join(qaRoot, "pdf-advertisements");
if (!fs.existsSync(pdfDir)) throw new Error("qa-output/pdf-advertisements is missing; run `npm run qa:pdf` first.");
fs.rmSync(outDir, { recursive: true, force: true });
ensureDir(path.join(outDir, "swatches"));
ensureDir(path.join(outDir, "web-cards"));

const ads = readManifest().items.filter((i) => i.type === "advertisement" && (i.web_include || i.print_include));
const pdfReport = JSON.parse(fs.readFileSync(path.join(qaRoot, "pdf-advertisement-qa.json"), "utf8")).advertisements;

// Desktop web-card renders (header + frame as one tinted card).
// Sprint v5 Task 24 (PRD §11): served over http with the production headers from vercel.json
// (CSP included), not file://, so results match what visitors' browsers enforce.
const siteServer = await startStaticServer(path.join(siteRoot, "_site"));
siteServer.server.unref();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto(`${siteServer.baseUrl}/`, { waitUntil: "networkidle" });
const entries = [];
for (const ad of ads) {
  const card = page.locator(`[data-testid="ad-card-${ad.id}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: path.join(outDir, "web-cards", `${ad.id}.png`) });
  const ink = resolveInk(ad);
  if (!ink) throw new Error(`${ad.id} has no resolvable page background/ink.`);
  const pdf = pdfReport.find((r) => r.id === ad.id);
  if (!pdf) throw new Error(`${ad.id} missing from pdf-advertisement-qa.json.`);
  fs.writeFileSync(path.join(outDir, "swatches", `${ad.id}.svg`), swatchSvg(ad.page_background, ink.colour, ad.id), "utf8");
  entries.push({ id: ad.id, title: ad.title, page_background: ad.page_background, page_background_mode: ad.page_background_mode ?? "auto", ink: ink.ink, inkColour: ink.colour, ratio: ink.ratio, pdfPage: pdf.page, pdfImage: pdf.image, webImage: `ad-backgrounds/web-cards/${ad.id}.png` });
}
await browser.close();

// Contact sheet of every rendered PDF page (thumbnails at 1/4 of the 96-dpi render).
const thumbW = 199, thumbH = 281, cols = 6, gap = 12;
const layout = contactSheetLayout(entries.length, thumbW, thumbH, cols, gap);
const composites = [];
for (const [i, e] of entries.entries()) {
  const buf = await sharp(path.join(qaRoot, e.pdfImage)).resize(thumbW, thumbH, { fit: "contain", background: "#ffffff" }).png().toBuffer();
  composites.push({ input: buf, left: layout.positions[i].left, top: layout.positions[i].top });
}
await sharp({ create: { width: layout.width, height: layout.height, channels: 3, background: "#e8e4dc" } }).composite(composites).png().toFile(path.join(outDir, "contact-sheet.png"));

const md = buildReviewMarkdown(entries, { generated: new Date().toISOString(), contactSheet: "ad-backgrounds/contact-sheet.png" });
fs.writeFileSync(path.join(outDir, "AD_BACKGROUND_REVIEW.md"), md, "utf8");
fs.writeFileSync(path.join(outDir, "ad-backgrounds-qa.json"), JSON.stringify({ generated: new Date().toISOString(), advertisements: entries }, null, 2), "utf8");
console.log(`Review sheet written: qa-output/ad-backgrounds/AD_BACKGROUND_REVIEW.md (${entries.length} advertisements), contact-sheet.png`);
