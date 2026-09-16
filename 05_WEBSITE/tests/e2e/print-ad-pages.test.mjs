// Playwright E2E for Sprint v3 Task 13 — tinted advertisement pages in the print HTML.
// Extended Sprint v4 Task 15 (sprints/v4/PRD.md §4.3-4.4, Decision K): counts are
// derived from the manifest, not hard-coded, and text/memorial presentation pages
// get their own assertions instead of the artwork-only img.print-ad checks.
// Requires `npm run build` first. Opens _site/print/index.html in print media and
// checks that every published advertisement section is painted with its manifest
// colour and that its heading uses the resolved ink. Screenshots go to tests/screenshots/.
import assert from "node:assert/strict";
import path from "node:path";
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { resolveInk } from "../../scripts/ad-presentation-core.mjs";

const hexToRgbCss = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const ads = readManifest().items.filter((i) => i.type === "advertisement" && i.print_include);
const adsWithArtwork = ads.filter((ad) => ad.print_asset); // artwork + memorial (text-only ads have no artwork)
assert.equal(ads.length, 25, "25 published advertisements (22 artwork + 2 text-only + 1 memorial)");
assert.equal(adsWithArtwork.length, 23, "23 advertisements with artwork to render (22 artwork + 1 memorial)");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } }); // A4 at 96 dpi
await page.emulateMedia({ media: "print" });
await page.goto(`file://${path.join(siteRoot, "_site", "print", "index.html").replaceAll("\\", "/")}`, { waitUntil: "networkidle" });

let checked = 0;
for (const ad of ads) {
  const section = page.locator(`[data-testid="print-page-${ad.id}"]`);
  assert.equal(await section.count(), 1, `${ad.id}: print section with data-testid present`);
  const ink = resolveInk(ad);
  const presentation = ad.presentation ?? "artwork";

  if (presentation === "text") {
    const s = await section.evaluate((el) => {
      const style = getComputedStyle(el);
      const h1 = el.querySelector("h1");
      const kicker = el.querySelector(".section-kicker");
      const adText = el.querySelector(".ad-text");
      return {
        bg: style.backgroundColor,
        h1: getComputedStyle(h1).color,
        kicker: getComputedStyle(kicker).color,
        h1Text: h1.textContent.trim(),
        hasImg: Boolean(el.querySelector("img")),
        adTextContent: adText ? adText.textContent.trim() : null,
        sectionText: el.textContent,
      };
    });
    assert.equal(s.bg, hexToRgbCss(ad.page_background), `${ad.id}: section background is the manifest colour`);
    assert.equal(s.h1, hexToRgbCss(ink.colour), `${ad.id}: heading uses the resolved ${ink.ink} ink`);
    assert.equal(s.kicker, hexToRgbCss(ink.colour), `${ad.id}: kicker uses the resolved ink`);
    assert.equal(s.h1Text, ad.title, `${ad.id}: heading text is the approved sentence`);
    assert.equal(s.hasImg, false, `${ad.id}: text-only advertisement print page must not render an <img>`);
    assert.equal(s.adTextContent, ad.text_lines[0], `${ad.id}: exact approved sentence, once`);
    assert.ok(!s.sectionText.includes("With best compliments"), `${ad.id}: text-only page must not carry the artwork compliments wording`);
    checked += 1;
    continue;
  }

  // artwork and memorial both render img.print-ad inside the section.
  const styles = await section.evaluate((el) => {
    const s = getComputedStyle(el);
    const h1 = el.querySelector("h1");
    const kicker = el.querySelector(".section-kicker");
    const img = el.querySelector("img.print-ad");
    const r = img.getBoundingClientRect();
    return { bg: s.backgroundColor, h1: getComputedStyle(h1).color, kicker: getComputedStyle(kicker).color, h1Text: h1.textContent.trim(), imgW: r.width, imgH: r.height, natW: img.naturalWidth, natH: img.naturalHeight, objectFit: getComputedStyle(img).objectFit, display: s.display, imgSrc: img.getAttribute("src"), imgAlt: img.getAttribute("alt") };
  });
  assert.equal(styles.bg, hexToRgbCss(ad.page_background), `${ad.id}: section background is the manifest colour`);
  assert.equal(styles.h1, hexToRgbCss(ink.colour), `${ad.id}: heading uses the resolved ${ink.ink} ink`);
  assert.equal(styles.kicker, hexToRgbCss(ink.colour), `${ad.id}: kicker uses the resolved ink`);
  assert.equal(styles.h1Text, ad.title, `${ad.id}: heading text is the compliments title`);
  assert.ok(styles.natW > 0 && styles.natH > 0, `${ad.id}: artwork image loaded (naturalWidth/naturalHeight > 0)`);
  if (presentation === "memorial") {
    assert.equal(styles.objectFit, "contain", `${ad.id}: memorial photograph uses object-fit: contain (uncropped, undistorted)`);
    const memorial = await section.evaluate((el) => {
      const block = el.querySelector(".ad-memorial");
      return { paras: block ? [...block.querySelectorAll("p")].map((p) => p.textContent.trim()) : null, kickerText: el.querySelector(".section-kicker").textContent.trim(), sectionText: el.textContent };
    });
    assert.deepEqual(memorial.paras, ad.text_lines, `${ad.id}: memorial lines exact and in order on the print page`);
    assert.match(memorial.kickerText, /In memoriam/, `${ad.id}: memorial kicker reads "In memoriam"`);
    assert.ok(!memorial.sectionText.includes("With best compliments"), `${ad.id}: memorial print page must not carry compliments wording`);
  } else {
    assert.ok(Math.abs(styles.imgW / styles.imgH - styles.natW / styles.natH) < 0.02, `${ad.id}: artwork aspect ratio preserved (no stretch)`);
  }
  assert.equal(styles.imgSrc, `../${ad.print_asset}`, `${ad.id}: <img src> matches the manifest print_asset`);
  assert.equal(styles.imgAlt, ad.alt, `${ad.id}: <img alt> matches the manifest alt`);
  assert.equal(styles.display, "grid", `${ad.id}: section is a grid so the artwork can be centred`);
  checked += 1;
}
assert.equal(checked, ads.length, "every published advertisement's print page was checked");

for (const id of ["ADV-018", "ADV-003", "ADV-019", "ADV-008", "ADV-027", "ADV-029"]) {
  const section = page.locator(`[data-testid="print-page-${id}"]`);
  await section.scrollIntoViewIfNeeded();
  await section.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task13-print-${id}.png`) });
}
// Non-advertisement pages must stay white.
const artBg = await page.locator('[data-testid="print-page-ART-012"]').evaluate((el) => getComputedStyle(el).backgroundColor);
assert.ok(["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"].includes(artBg), `article pages are not tinted (got ${artBg})`);
await browser.close();
console.log(`PASS: ${checked} advertisement print pages tinted with the manifest colour and readable ink (${adsWithArtwork.length} with artwork, 2 text-only, 1 memorial).`);
