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

// Sprint v4 Task 7 (sprints/v4/PRD.md §4.2): derive the expected poem lines
// from the committed ART-010-item.md itself (not retyped), so this check
// stays correct if the poem is ever re-extracted.
const golapContentPath = path.join(siteRoot, "src", "content", "articles", "ART-010-item.md");
const golapExpectedLines = fs
  .readFileSync(golapContentPath, "utf8")
  .split("\n")
  .filter((line) => line.endsWith("<br>"))
  .map((line) => line.slice(0, -"<br>".length));
if (golapExpectedLines.length !== 17) {
  console.error(`Expected 17 <br>-terminated lines in ART-010-item.md, found ${golapExpectedLines.length}.`);
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
// Sprint v4 Task 7: the poem's hard breaks must render as real <br> tags
// inside #ART-010 .prose, one <p> per stanza-free block, 17 lines total.
const golapBrCount = await page.locator("#ART-010 .prose br").count();
const golapRenderedLines = await page.evaluate(() => {
  const poemParagraph = document.querySelector("#ART-010 .prose p:has(br)");
  if (!poemParagraph) return null;
  const lines = [];
  let current = "";
  for (const node of poemParagraph.childNodes) {
    if (node.nodeName === "BR") {
      lines.push(current.trim());
      current = "";
    } else {
      current += node.textContent;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
});
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
if (golapBrCount !== 17) {
  console.error(`Expected 17 <br> tags inside #ART-010 .prose, found ${golapBrCount}.`);
  process.exit(1);
}
if (!golapRenderedLines) {
  console.error("Could not find the ART-010 poem paragraph (#ART-010 .prose p:has(br)).");
  process.exit(1);
}
if (golapRenderedLines.length !== 17) {
  console.error(`Expected 17 <br>-separated poem lines rendered inside #ART-010 .prose, found ${golapRenderedLines.length}.`);
  process.exit(1);
}
if (JSON.stringify(golapRenderedLines) !== JSON.stringify(golapExpectedLines)) {
  console.error("Rendered ART-010 poem lines do not match the committed ART-010-item.md lines, in order.");
  process.exit(1);
}
if (JSON.stringify(golapRenderedLines.slice(0, 4)) !== JSON.stringify(golapExpectedLines.slice(0, 4))) {
  console.error("The four-line example did not render as four consecutive lines matching the source.");
  process.exit(1);
}
console.log(`Website smoke tests passed (${publishedAds.length} advertisement titles verified, ART-010 poem 17 lines verified).`);
