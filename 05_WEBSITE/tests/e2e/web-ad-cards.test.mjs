// Playwright E2E for Sprint v3 Task 14 — tinted advertisement cards on the website,
// advertisement byline suppressed. Requires `npm run build` first.
import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { resolveInk } from "../../scripts/ad-presentation-core.mjs";

const hexToRgbCss = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const ads = readManifest().items.filter((i) => i.type === "advertisement" && i.web_include);
assert.equal(ads.length, 22);

const browser = await chromium.launch();
for (const viewport of [{ name: "desktop", width: 1440, height: 1100 }, { name: "mobile", width: 390, height: 1200 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`file://${path.join(siteRoot, "_site", "index.html").replaceAll("\\", "/")}`, { waitUntil: "networkidle" });
  for (const ad of ads) {
    const card = page.locator(`[data-testid="ad-card-${ad.id}"]`);
    assert.equal(await card.count(), 1, `${viewport.name} ${ad.id}: advertisement article has data-testid`);
    const s = await card.evaluate((el) => {
      const frame = el.querySelector(".ad-frame");
      const h2 = el.querySelector("h2");
      const kicker = el.querySelector(".section-kicker");
      const img = frame.querySelector("img");
      const r = img.getBoundingClientRect();
      return { frameBg: getComputedStyle(frame).backgroundColor, h2: getComputedStyle(h2).color, kicker: getComputedStyle(kicker).color, h2Text: h2.textContent.trim(), bylines: el.querySelectorAll(".byline").length, imgW: r.width, imgH: r.height, natW: img.naturalWidth, natH: img.naturalHeight };
    });
    const ink = resolveInk(ad);
    assert.equal(s.frameBg, hexToRgbCss(ad.page_background), `${viewport.name} ${ad.id}: frame background is the manifest colour`);
    assert.equal(s.h2, hexToRgbCss(ink.colour), `${viewport.name} ${ad.id}: heading uses the resolved ink`);
    assert.equal(s.kicker, hexToRgbCss(ink.colour), `${viewport.name} ${ad.id}: kicker uses the resolved ink`);
    assert.equal(s.h2Text, ad.title);
    assert.equal(s.bylines, 0, `${viewport.name} ${ad.id}: no byline on advertisement cards (company name is in the heading)`);
    assert.ok(Math.abs(s.imgW / s.imgH - s.natW / s.natH) < 0.02, `${viewport.name} ${ad.id}: artwork not distorted`);
  }
  // Gallery cards keep the plain white frame and their byline.
  const gal = await page.locator("#GAL-007").evaluate((el) => ({ bg: getComputedStyle(el.querySelector(".ad-frame")).backgroundColor, bylines: el.querySelectorAll(".byline").length }));
  assert.equal(gal.bg, "rgb(255, 255, 255)", `${viewport.name}: gallery frame stays white`);
  assert.equal(gal.bylines, 1, `${viewport.name}: gallery byline retained`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(overflow, false, `${viewport.name}: no horizontal overflow`);
  for (const id of ["ADV-018", "ADV-019"]) {
    const card = page.locator(`[data-testid="ad-card-${id}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task14-${viewport.name}-${id}.png`) });
  }
  await page.close();
}
await browser.close();
console.log("PASS: 22 advertisement cards tinted with readable ink, no advertisement bylines, gallery unchanged, no overflow (desktop + mobile).");
