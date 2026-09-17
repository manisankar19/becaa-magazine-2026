// Playwright E2E for the front-page hero (2026-09-17 owner request). Requires `npm run build`.
// Serves _site/ over http and checks, at 390, 820 and 1440 px: the tagline replaces the old
// review lede and badges; exactly two small links; "Explore the 2026 Edition" jumps to the first
// magazine section below the sticky header; "Watch BECAA 2026 ↗" opens the official YouTube
// channel safely in a new tab with an accessible name; no overflow; visible keyboard focus.
// Screenshots: qa-output/front-page/{mobile,tablet,desktop}.png
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { startStaticServer } from "./static-server.mjs";

const TAGLINE = "Roots remembered. Stories celebrated. Bonds renewed.";
const YOUTUBE = "https://youtube.com/@BecaaMaharashtra";
const firstItem = readManifest().items.filter((i) => i.web_include).sort((a, b) => Number(a.order) - Number(b.order))[0];

// Static checks on the built page.
const html = fs.readFileSync(path.join(siteRoot, "_site", "index.html"), "utf8");
for (const gone of ["A traceable review edition assembled only from approved, permission-cleared source material.", "approved web items", "Website review", "Print scope controlled separately", "cover__meta"]) {
  assert.ok(!html.includes(gone), `front page no longer contains "${gone}"`);
}
const welcome = fs.readFileSync(path.join(siteRoot, "_site", "welcome", "index.html"), "utf8");
assert.ok(!welcome.includes(TAGLINE) && !welcome.includes(YOUTUBE + '"'), "the public welcome page is unchanged by the hero edit");

const outDir = path.join(siteRoot, "qa-output", "front-page");
fs.mkdirSync(outDir, { recursive: true });
const { server, baseUrl } = await startStaticServer(path.join(siteRoot, "_site"));
const browser = await chromium.launch();
try {
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "tablet", width: 820, height: 1180 }, { name: "desktop", width: 1440, height: 900 }]) {
    const tag = (m) => `${viewport.name} (${viewport.width}px): ${m}`;
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });

    const hero = page.locator("#top");
    const tagline = hero.locator(".cover__tagline");
    assert.equal(await tagline.count(), 1, tag("one tagline"));
    assert.equal((await tagline.textContent()).trim(), TAGLINE, tag("tagline text exact"));
    assert.ok(Number(await tagline.evaluate((el) => getComputedStyle(el).fontWeight)) >= 600, tag("tagline is bold"));
    assert.equal((await hero.locator("h1#cover-title").textContent()).trim(), "একই শিকড়", tag("cover title unchanged"));
    assert.equal(await hero.locator("img.cover__art").count(), 1, tag("cover artwork unchanged"));

    const links = hero.locator(".cover__links a");
    assert.equal(await links.count(), 2, tag("exactly two hero links"));
    const explore = hero.getByRole("link", { name: "Explore the 2026 Edition", exact: true });
    const watch = hero.getByRole("link", { name: "Watch BECAA 2026 (opens in a new tab)", exact: true });
    assert.equal(await explore.count(), 1, tag("Explore link by accessible name"));
    assert.equal(await watch.count(), 1, tag("Watch link: accessible name says it opens in a new tab"));

    assert.equal(await explore.getAttribute("href"), `#${firstItem.id}`, tag(`Explore points at the first magazine section (#${firstItem.id})`));
    assert.equal(await explore.getAttribute("target"), null, tag("Explore stays in the same tab"));
    assert.equal(await watch.getAttribute("href"), YOUTUBE, tag("Watch href exact"));
    assert.equal(await watch.getAttribute("target"), "_blank", tag("Watch opens a new tab"));
    const rel = (await watch.getAttribute("rel")).split(/\s+/);
    assert.ok(rel.includes("noopener") && rel.includes("noreferrer"), tag("Watch rel has noopener and noreferrer"));
    assert.equal((await watch.textContent()).replace(/\s+/g, " ").trim(), "Watch BECAA 2026 ↗ (opens in a new tab)", tag("visible label plus hidden hint"));
    assert.equal(await watch.locator('[aria-hidden="true"]').textContent().then((t) => t.trim()), "↗", tag("arrow hidden from assistive technology"));

    // Layout: no overflow, both links inside the viewport, comfortable target size, no overlap.
    const layout = await page.evaluate(() => {
      const box = (el) => el.getBoundingClientRect().toJSON();
      const [a, b] = [...document.querySelectorAll("#top .cover__links a")].map(box);
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, a, b, tagline: box(document.querySelector("#top .cover__tagline")) };
    });
    assert.ok(layout.scrollWidth <= layout.clientWidth, tag(`no horizontal overflow (${layout.scrollWidth} <= ${layout.clientWidth})`));
    for (const [name, r] of [["Explore", layout.a], ["Watch", layout.b]]) {
      assert.ok(r.left >= 0 && r.right <= layout.clientWidth, tag(`${name} link inside the viewport`));
      assert.ok(r.height >= 24, tag(`${name} link target at least 24px tall (${Math.round(r.height)})`));
      assert.ok(r.top >= layout.tagline.bottom, tag(`${name} link sits below the tagline`));
    }
    const overlap = layout.a.left < layout.b.right && layout.b.left < layout.a.right && layout.a.top < layout.b.bottom && layout.b.top < layout.a.bottom;
    assert.ok(!overlap, tag("the two links do not overlap"));

    // Keyboard focus is visible on both links.
    for (const link of [explore, watch]) {
      const before = await link.evaluate((el) => { const s = getComputedStyle(el); return `${s.outlineStyle}|${s.outlineWidth}|${s.backgroundColor}`; });
      await link.focus();
      const after = await link.evaluate((el) => { const s = getComputedStyle(el); return `${s.outlineStyle}|${s.outlineWidth}|${s.backgroundColor}`; });
      assert.notEqual(after, before, tag("visible focus style"));
    }
    await page.evaluate(() => document.activeElement?.blur());
    await hero.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outDir, `${viewport.name}.png`) });

    // Explore jumps to the first magazine section, below the sticky header.
    await explore.click();
    await page.waitForFunction((h) => location.hash === h, `#${firstItem.id}`);
    const jump = await page.evaluate((id) => {
      const header = document.querySelector(".site-header");
      const sticky = getComputedStyle(header).position === "sticky";
      return { top: document.getElementById(id).getBoundingClientRect().top, headerBottom: sticky ? header.getBoundingClientRect().bottom : 0 };
    }, firstItem.id);
    assert.ok(jump.top >= jump.headerBottom - 1 && jump.top <= jump.headerBottom + 64, tag(`first section lands just below the header (top ${Math.round(jump.top)}, header ${Math.round(jump.headerBottom)})`));
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`front-page-hero: tagline and two links verified at 390/820/1440 px; screenshots in ${path.relative(siteRoot, outDir)}/`);
