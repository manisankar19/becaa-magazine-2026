import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { siteRoot } from "./lib.mjs";
import { findBadAdvertisementTitles } from "./ad-qa-checks-core.mjs";

const index = path.join(siteRoot, "_site", "index.html");
if (!fs.existsSync(index)) {
  console.error("Build output missing: _site/index.html");
  process.exit(1);
}

// Sprint v3 Task 24: per-item Markdown pages must not be emitted (they would bypass the registration gate).
const strayContentPages = fs.existsSync(path.join(siteRoot, "_site", "content")) ? fs.readdirSync(path.join(siteRoot, "_site", "content"), { recursive: true }).filter((f) => String(f).endsWith(".html")) : [];
if (strayContentPages.length) {
  console.error(`Build emitted ${strayContentPages.length} per-item page(s) under _site/content/ (gate bypass): ${strayContentPages.slice(0, 3).join(", ")}…`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`file://${index.replaceAll("\\", "/")}`);
const itemCount = await page.locator(".publication-item").count();
const manifest = (await import("./lib.mjs")).readManifest();
const expectedItemCount = manifest.items.filter((item) => item.web_include && item.verification === "verified").length;
const acknowledgementText = await page.locator("#with-thanks").textContent();
const acknowledgementImages = await page.locator("#with-thanks img").count();
const missingAnchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter((href) => href && !document.querySelector(href)));
const adSources = await page.locator('.publication-item--advertisement img').evaluateAll((images) => images.map((img) => img.getAttribute("src")));
const excludedIds = ["ADV-009","ADV-016","ADV-024","ADV-025","ADV-027"];
const accidentallyIncluded = await page.locator(excludedIds.map((id) => `#${id}`).join(",")).count();
const title = await page.locator("h1").first().textContent();
// Sprint v3 Task 15: every published advertisement title, wherever it is rendered.
const publishedAds = manifest.items.filter((item) => item.type === "advertisement" && item.web_include);
const renderedAdTitles = await page.evaluate((ids) => {
  const out = {};
  for (const id of ids) {
    const card = document.getElementById(id);
    out[id] = [
      card?.querySelector("h2")?.textContent,
      ...[...document.querySelectorAll(`.toc a[href="#${id}"] strong`)].map((el) => el.textContent),
    ].filter((t) => t !== undefined && t !== null);
  }
  return out;
}, publishedAds.map((ad) => ad.id));
const badAdTitles = findBadAdvertisementTitles(publishedAds, renderedAdTitles);
const adBylines = await page.locator(".publication-item--advertisement .byline").count();
const navAdLabels = await page.locator("nav a").evaluateAll((links) => links.map((a) => a.textContent.trim()).filter((t) => /Advertisement$/.test(t)));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
await browser.close();

if (itemCount !== expectedItemCount) {
  console.error(`Expected ${expectedItemCount} publication items, found ${itemCount}.`);
  process.exit(1);
}
if (!/একই শিকড়/.test(title || "")) {
  console.error("Missing expected cover title.");
  process.exit(1);
}
if (overflow) {
  console.error("Horizontal overflow detected.");
  process.exit(1);
}
if (acknowledgementImages || acknowledgementText?.includes("Worldline India") || acknowledgementText?.includes("Eegrab") || acknowledgementText?.includes("mepass")) {
  console.error("Excluded advertisers leaked into Sponsor Acknowledgements.");
  process.exit(1);
}
if (missingAnchors.length) {
  console.error(`Broken internal anchors: ${missingAnchors.join(", ")}`);
  process.exit(1);
}
if (new Set(adSources).size !== adSources.length) {
  console.error("Repeated advertisement artwork detected.");
  process.exit(1);
}
if (accidentallyIncluded) {
  console.error("An excluded advertisement ID appears in the website.");
  process.exit(1);
}
if (badAdTitles.length) {
  console.error(`Advertisement title problems: ${badAdTitles.map((b) => `${b.id} "${b.text}" (${b.reason})`).join("; ")}`);
  process.exit(1);
}
if (adBylines) {
  console.error(`${adBylines} advertisement card(s) still render a byline.`);
  process.exit(1);
}
if (navAdLabels.length) {
  console.error(`Navigation still contains labels ending in "Advertisement": ${navAdLabels.join(", ")}`);
  process.exit(1);
}
console.log(`Website smoke tests passed (${publishedAds.length} advertisement titles verified).`);
