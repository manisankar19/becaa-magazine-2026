// Sprint v5 Task 26 (PRD §11): the magazine must survive an ad blocker. Every web image vanished
// on 2026-09-26 for visitors whose blocker applies EasyList's site-wide rules `##.ad-frame` and
// `##.ad-link`. This test serves _site/ with the production headers, applies ALL of EasyList's
// generic single-class/single-id hide rules from the committed snapshot as a real blocker would
// (a CSP-bypassing test context is needed to inject them), and asserts that every publication image
// is still visible, at desktop and mobile widths, with screenshots.
// Requires `npm run build`. AD_BLOCKER_SITE=<dir> tests another built site (used to prove red).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { siteRoot } from "../../scripts/lib.mjs";
import { extractGenericHideSelectors } from "../../scripts/blocklist-guard-core.mjs";
import { startStaticServer } from "./static-server.mjs";

const siteDir = process.env.AD_BLOCKER_SITE ? path.resolve(process.env.AD_BLOCKER_SITE) : path.join(siteRoot, "_site");
const outDir = path.join(siteRoot, "qa-output", "ad-blocker");
fs.mkdirSync(outDir, { recursive: true });
const snapshot = fs.readFileSync(path.join(siteRoot, "scripts", "data", "easylist-generic-hide-selectors.txt"), "utf8");
const { classes, ids } = extractGenericHideSelectors(snapshot);
const selectors = [...[...classes].map((c) => `.${c}`), ...[...ids].map((i) => `#${i}`)];
const blockerCss = `${selectors.join(",\n")} { display: none !important; }`;

const { server, baseUrl } = await startStaticServer(siteDir);
const browser = await chromium.launch();
const summary = [];
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, bypassCSP: true });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: blockerCss });
    const hiddenByRules = await page.evaluate((sel) => sel.filter((s) => { try { return document.querySelector(s); } catch { return false; } }), selectors);
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null))));
    const images = await page.evaluate(() => [...document.querySelectorAll(".publication-item img")].map((img) => {
      const r = img.getBoundingClientRect();
      const card = img.closest(".publication-item");
      return { id: card?.id, visible: r.width > 0 && r.height > 0 && getComputedStyle(img).visibility !== "hidden", loaded: img.complete && img.naturalWidth > 0 };
    }));
    await page.locator("#ADV-001").screenshot({ path: path.join(outDir, `${viewport.name}-ADV-001.png`) });
    await page.locator("#GAL-001").screenshot({ path: path.join(outDir, `${viewport.name}-GAL-001.png`) });
    const invisible = images.filter((i) => !i.visible).map((i) => i.id);
    summary.push(`${viewport.name}: ${images.length - invisible.length}/${images.length} images visible; page elements matched by generic rules: ${hiddenByRules.length ? hiddenByRules.join(" ") : "none"}`);
    assert.equal(images.length, 30, `${viewport.name}: 30 publication images on the page`);
    assert.ok(images.every((i) => i.loaded), `${viewport.name}: every image loaded`);
    assert.deepEqual(invisible, [], `${viewport.name}: images hidden by ad-blocker rules (${hiddenByRules.join(" ")})`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`PASS: magazine images survive EasyList's ${classes.size + ids.size} generic hide rules — ${summary.join("; ")}`);
