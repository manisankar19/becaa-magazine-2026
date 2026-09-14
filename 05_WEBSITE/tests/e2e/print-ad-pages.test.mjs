// Playwright E2E for Sprint v3 Task 13 — tinted advertisement pages in the print HTML.
// Requires `npm run build` first. Opens _site/print/index.html in print media and checks
// that every published advertisement section is painted with its manifest colour and
// that its heading uses the resolved ink. Screenshots go to tests/screenshots/.
import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { resolveInk } from "../../scripts/ad-presentation-core.mjs";

const hexToRgbCss = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const ads = readManifest().items.filter((i) => i.type === "advertisement" && i.print_include);
assert.equal(ads.length, 22);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } }); // A4 at 96 dpi
await page.emulateMedia({ media: "print" });
await page.goto(`file://${path.join(siteRoot, "_site", "print", "index.html").replaceAll("\\", "/")}`, { waitUntil: "networkidle" });

let checked = 0;
for (const ad of ads) {
  const section = page.locator(`[data-testid="print-page-${ad.id}"]`);
  assert.equal(await section.count(), 1, `${ad.id}: print section with data-testid present`);
  const styles = await section.evaluate((el) => {
    const s = getComputedStyle(el);
    const h1 = el.querySelector("h1");
    const kicker = el.querySelector(".section-kicker");
    const img = el.querySelector("img.print-ad");
    const r = img.getBoundingClientRect();
    return { bg: s.backgroundColor, h1: getComputedStyle(h1).color, kicker: getComputedStyle(kicker).color, h1Text: h1.textContent.trim(), imgW: r.width, imgH: r.height, natW: img.naturalWidth, natH: img.naturalHeight, display: s.display };
  });
  const ink = resolveInk(ad);
  assert.equal(styles.bg, hexToRgbCss(ad.page_background), `${ad.id}: section background is the manifest colour`);
  assert.equal(styles.h1, hexToRgbCss(ink.colour), `${ad.id}: heading uses the resolved ${ink.ink} ink`);
  assert.equal(styles.kicker, hexToRgbCss(ink.colour), `${ad.id}: kicker uses the resolved ink`);
  assert.equal(styles.h1Text, ad.title, `${ad.id}: heading text is the compliments title`);
  assert.ok(Math.abs(styles.imgW / styles.imgH - styles.natW / styles.natH) < 0.02, `${ad.id}: artwork aspect ratio preserved (no stretch)`);
  assert.equal(styles.display, "grid", `${ad.id}: section is a grid so the artwork can be centred`);
  checked += 1;
}

for (const id of ["ADV-018", "ADV-003", "ADV-019", "ADV-008"]) {
  const section = page.locator(`[data-testid="print-page-${id}"]`);
  await section.scrollIntoViewIfNeeded();
  await section.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task13-print-${id}.png`) });
}
// Non-advertisement pages must stay white.
const artBg = await page.locator('[data-testid="print-page-ART-012"]').evaluate((el) => getComputedStyle(el).backgroundColor);
assert.ok(["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"].includes(artBg), `article pages are not tinted (got ${artBg})`);
await browser.close();
console.log(`PASS: ${checked} advertisement print pages tinted with the manifest colour and readable ink.`);
