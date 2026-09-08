import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { siteRoot } from "./lib.mjs";

const index = path.join(siteRoot, "_site", "index.html");
if (!fs.existsSync(index)) {
  console.error("Build output missing: _site/index.html");
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
console.log("Website smoke tests passed.");
