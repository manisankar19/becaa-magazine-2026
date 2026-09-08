import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureDir, siteRoot } from "./lib.mjs";

// Sprint v2 Task 13: dedicated QA screenshots for the three new items.
// visual-qa.mjs already covers the home page and advertisement frames;
// this covers the new gallery card and the two new standalone article pages,
// which it does not, at both viewport sizes, following the same
// per-new-item QA precedent as art006-qa.mjs.
const outDir = path.join(siteRoot, "qa-output", "v2-items");
fs.rmSync(outDir, { recursive: true, force: true });
ensureDir(outDir);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 1200 },
];

const browser = await chromium.launch();
const findings = [];

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport });

  // Home page: the new gallery card (GAL-007).
  await page.goto(`file://${path.join(siteRoot, "_site", "index.html").replaceAll("\\", "/")}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return img.decode ? img.decode().catch(() => undefined) : new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  });
  const galItem = page.locator("#GAL-007");
  await galItem.scrollIntoViewIfNeeded();
  await galItem.screenshot({ path: path.join(outDir, `${viewport.name}-GAL-007-card.png`) });
  const galBox = await galItem.boundingBox();
  const galOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (!galBox || galBox.width <= 0 || galBox.height <= 0) findings.push(`${viewport.name}: GAL-007 card has no visible bounding box.`);
  if (galOverflow) findings.push(`${viewport.name}: horizontal overflow on home page.`);

  // Standalone article pages: ART-010 and ART-011.
  for (const id of ["ART-010", "ART-011"]) {
    const slug = id === "ART-010" ? "ART-010-item" : "ART-011-item";
    const articlePath = path.join(siteRoot, "_site", "content", "articles", slug, "index.html");
    if (!fs.existsSync(articlePath)) {
      findings.push(`${viewport.name}: built page missing for ${id} at ${articlePath}`);
      continue;
    }
    await page.goto(`file://${articlePath.replaceAll("\\", "/")}`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (overflow) findings.push(`${viewport.name}: horizontal overflow on ${id} page.`);
    await page.screenshot({ path: path.join(outDir, `${viewport.name}-${id}-page.png`), fullPage: true });
  }

  await page.close();
}
await browser.close();

if (findings.length) {
  console.error(findings.join("\n"));
  process.exit(1);
}
console.log(`v2 item QA screenshots written to ${path.relative(siteRoot, outDir)}`);
