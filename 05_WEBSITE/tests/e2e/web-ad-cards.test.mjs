// Playwright E2E for Sprint v3 Task 14 — tinted advertisement cards on the website,
// advertisement byline suppressed. Extended Sprint v4 Task 15 (sprints/v4/PRD.md
// §4.3-4.4, Decision K): counts are derived from the manifest, not hard-coded, and
// text/memorial presentation cards get their own assertions instead of the
// artwork-only `.artwork-frame`/`<img>` checks. Requires `npm run build` first.
import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { resolveInk } from "../../scripts/ad-presentation-core.mjs";

const hexToRgbCss = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const ads = readManifest().items.filter((i) => i.type === "advertisement" && i.web_include);
const adsWithArtwork = ads.filter((ad) => ad.web_asset); // artwork + memorial (text-only ads have no artwork)
assert.equal(ads.length, 25, "25 published advertisements (22 artwork + 2 text-only + 1 memorial)");
assert.equal(adsWithArtwork.length, 23, "23 advertisements with artwork to load (22 artwork + 1 memorial)");

const browser = await chromium.launch();
for (const viewport of [{ name: "desktop", width: 1440, height: 1100 }, { name: "mobile", width: 390, height: 1200 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`file://${path.join(siteRoot, "_site", "index.html").replaceAll("\\", "/")}`, { waitUntil: "networkidle" });
  for (const ad of ads) {
    const card = page.locator(`[data-testid="ad-card-${ad.id}"]`);
    assert.equal(await card.count(), 1, `${viewport.name} ${ad.id}: advertisement article has data-testid`);
    const ink = resolveInk(ad);
    const presentation = ad.presentation ?? "artwork";

    if (presentation === "text") {
      // Task 10: no .artwork-frame, no <img> — the tinted card is .ad-text itself.
      const s = await card.evaluate((el) => {
        const adText = el.querySelector(".ad-text");
        const kicker = el.querySelector(".section-kicker");
        return {
          headings: el.querySelectorAll("h1, h2, h3").length,
          ariaLabel: el.getAttribute("aria-label"),
          hasImg: Boolean(el.querySelector("img")),
          adTextPresent: Boolean(adText),
          adTextContent: adText ? adText.textContent.trim() : null,
          adTextBg: adText ? getComputedStyle(adText).backgroundColor : null,
          adTextColor: adText ? getComputedStyle(adText).color : null,
          kicker: getComputedStyle(kicker).color,
          bylines: el.querySelectorAll(".byline").length,
          cardText: el.textContent,
        };
      });
      assert.equal(s.hasImg, false, `${viewport.name} ${ad.id}: text-only advertisement must not render an <img>`);
      assert.equal(s.adTextPresent, true, `${viewport.name} ${ad.id}: .ad-text element present`);
      assert.equal(s.adTextContent, ad.text_lines[0], `${viewport.name} ${ad.id}: exact approved sentence, once`);
      assert.equal(s.adTextBg, hexToRgbCss(ad.page_background), `${viewport.name} ${ad.id}: .ad-text tinted with the manifest colour`);
      assert.equal(s.adTextColor, hexToRgbCss(ink.colour), `${viewport.name} ${ad.id}: .ad-text uses the resolved ink`);
      assert.equal(s.headings, 0, `${viewport.name} ${ad.id}: no visible heading repeats the sentence (2026-09-17 approval)`);
      assert.equal(s.ariaLabel, ad.title, `${viewport.name} ${ad.id}: card named by aria-label = manifest title`);
      assert.equal(s.cardText.split(ad.text_lines[0]).length - 1, 1, `${viewport.name} ${ad.id}: sentence visible exactly once`);
      assert.equal(s.kicker, hexToRgbCss(ink.colour), `${viewport.name} ${ad.id}: kicker uses the resolved ink`);
      assert.equal(s.bylines, 0, `${viewport.name} ${ad.id}: no byline on advertisement cards`);
      assert.ok(!s.cardText.includes("With best compliments"), `${viewport.name} ${ad.id}: text-only card must not carry the artwork compliments wording`);
      continue;
    }

    // artwork and memorial share the .artwork-frame + <img> structure (the memorial
    // figure carries both "artwork-frame" and "artwork-frame--memorial" classes).
    const s = await card.evaluate((el) => {
      const frame = el.querySelector(".artwork-frame");
      const h2 = el.querySelector("h2");
      const kicker = el.querySelector(".section-kicker");
      const img = frame.querySelector("img");
      const r = img.getBoundingClientRect();
      return { headings: el.querySelectorAll("h1, h2, h3").length, ariaLabel: el.getAttribute("aria-label"), cardText: el.textContent, frameBg: getComputedStyle(frame).backgroundColor, h2: h2 ? getComputedStyle(h2).color : null, kicker: getComputedStyle(kicker).color, h2Text: h2 ? h2.textContent.trim() : null, bylines: el.querySelectorAll(".byline").length, imgW: r.width, imgH: r.height, natW: img.naturalWidth, natH: img.naturalHeight, objectFit: getComputedStyle(img).objectFit, imgSrc: img.getAttribute("src"), imgAlt: img.getAttribute("alt") };
    });
    assert.equal(s.frameBg, hexToRgbCss(ad.page_background), `${viewport.name} ${ad.id}: frame background is the manifest colour`);
    if (presentation === "memorial") {
      assert.equal(s.headings, 0, `${viewport.name} ${ad.id}: memorial has no visible heading repeating lines 1–2 (2026-09-17 approval)`);
      assert.equal(s.ariaLabel, ad.title, `${viewport.name} ${ad.id}: memorial card named by aria-label = manifest title`);
      for (const line of ad.text_lines) assert.equal(s.cardText.split(line).length - 1, 1, `${viewport.name} ${ad.id}: "${line}" visible exactly once`);
    } else {
      assert.equal(s.h2, hexToRgbCss(ink.colour), `${viewport.name} ${ad.id}: heading uses the resolved ink`);
      assert.equal(s.h2Text, ad.title);
    }
    assert.equal(s.kicker, hexToRgbCss(ink.colour), `${viewport.name} ${ad.id}: kicker uses the resolved ink`);
    assert.equal(s.bylines, 0, `${viewport.name} ${ad.id}: no byline on advertisement cards (company name is in the heading)`);
    assert.ok(s.natW > 0 && s.natH > 0, `${viewport.name} ${ad.id}: artwork image loaded (naturalWidth/naturalHeight > 0)`);
    if (presentation === "memorial") {
      // The memorial photograph is deliberately letterboxed (max-height, object-fit:
      // contain) so the <img> box's own aspect ratio need not match the photo's —
      // "not stretched" is guaranteed by object-fit: contain, not by box shape.
      assert.equal(s.objectFit, "contain", `${viewport.name} ${ad.id}: memorial photograph uses object-fit: contain (uncropped, undistorted)`);
    } else {
      assert.ok(Math.abs(s.imgW / s.imgH - s.natW / s.natH) < 0.02, `${viewport.name} ${ad.id}: artwork not distorted`);
    }
    assert.equal(s.imgSrc, ad.web_asset, `${viewport.name} ${ad.id}: <img src> matches the manifest web_asset`);
    assert.equal(s.imgAlt, ad.alt, `${viewport.name} ${ad.id}: <img alt> matches the manifest alt`);

    if (presentation === "memorial") {
      // Task 11: the memorial text block, exact lines in order, distinct kicker, no compliments wording.
      const memorial = await card.evaluate((el) => {
        const block = el.querySelector(".ad-memorial");
        return {
          paras: block ? [...block.querySelectorAll("p")].map((p) => p.textContent.trim()) : null,
          kickerText: el.querySelector(".section-kicker").textContent.trim(),
          cardText: el.textContent,
        };
      });
      assert.deepEqual(memorial.paras, ad.text_lines, `${viewport.name} ${ad.id}: memorial lines exact and in order`);
      assert.match(memorial.kickerText, /In memoriam/, `${viewport.name} ${ad.id}: memorial kicker reads "In memoriam"`);
      assert.ok(!memorial.cardText.includes("With best compliments"), `${viewport.name} ${ad.id}: memorial must not carry the artwork compliments wording`);
    }
  }
  // Sprint v5 Task 23 (PRD §11, Decision O): no element uses the names EasyList hides site-wide.
  const blockerNames = await page.evaluate(() => document.querySelectorAll(".ad-frame, .ad-link").length);
  assert.equal(blockerNames, 0, `${viewport.name}: no .ad-frame/.ad-link elements (hidden by ad blockers)`);
  assert.equal(await page.locator(".artwork-frame img").count(), await page.locator(".publication-item img").count(), `${viewport.name}: every publication image sits in an .artwork-frame`);
  // Gallery cards keep the plain white frame and their byline.
  const gal = await page.locator("#GAL-007").evaluate((el) => ({ bg: getComputedStyle(el.querySelector(".artwork-frame")).backgroundColor, bylines: el.querySelectorAll(".byline").length }));
  assert.equal(gal.bg, "rgb(255, 255, 255)", `${viewport.name}: gallery frame stays white`);
  assert.equal(gal.bylines, 1, `${viewport.name}: gallery byline retained`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(overflow, false, `${viewport.name}: no horizontal overflow`);
  for (const id of ["ADV-018", "ADV-019", "ADV-027", "ADV-029"]) {
    const card = page.locator(`[data-testid="ad-card-${id}"]`);
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task14-${viewport.name}-${id}.png`) });
  }
  await page.close();
}
await browser.close();
console.log(`PASS: ${ads.length} advertisement cards tinted with readable ink (${adsWithArtwork.length} with artwork loaded, 2 text-only, 1 memorial), no advertisement bylines, gallery unchanged, no overflow (desktop + mobile).`);
