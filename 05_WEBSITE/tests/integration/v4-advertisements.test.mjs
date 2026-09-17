// Integration test for Sprint v4 Task 16 (sprints/v4/PRD.md §4.3-4.4, Decisions
// C, D, E, F, K) — wording and consistency for ADV-027 (Sarc Epic), ADV-028
// (M/s Balajee Infrate) and ADV-029 (the memorial). For each item, asserts the
// exact approved wording is identical across five independent surfaces: the
// manifest, the built home page card, the website contents entry, the PDF page
// text (pdftotext), and the tracker row — plus ID uniqueness, memorial
// contributor accuracy, the absence of artwork-only wording on these pages,
// and that each text-only sentence appears exactly once as page *content*
// (the item-header heading legitimately restates it once more, by design —
// Task 9's validator requires title === text_lines[0], the same invariant
// tests/integration/ad-text-render.test.mjs already documents and asserts for
// a fixture; here it is checked against the real build).
//
// Requires `npm run build && npm run pdf` first (like tests/e2e/print-cover-page.test.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readManifest, siteRoot, projectRoot } from "../../scripts/lib.mjs";
import { findPdfPageIndex, contentsEntries } from "../../scripts/ad-qa-checks-core.mjs";
import { openTracker, readSheetRows, SHEET_NAME } from "../../scripts/tracker-io.mjs";

const NEW_ITEM_IDS = ["ADV-027", "ADV-028", "ADV-029"];

function countOccurrences(haystack, needle) {
  let count = 0;
  let index = 0;
  for (;;) {
    index = haystack.indexOf(needle, index);
    if (index === -1) break;
    count += 1;
    index += needle.length;
  }
  return count;
}

function extractArticle(html, id) {
  const startMarker = `id="${id}"`;
  const startIdx = html.indexOf(startMarker);
  assert.ok(startIdx !== -1, `expected to find the built web article for ${id}`);
  const tagOpenStart = html.lastIndexOf("<article", startIdx);
  const endIdx = html.indexOf("</article>", startIdx);
  assert.ok(endIdx !== -1, `expected a closing </article> for ${id}`);
  return html.slice(tagOpenStart, endIdx + "</article>".length);
}

async function run() {
  const manifest = readManifest();
  const items = Object.fromEntries(NEW_ITEM_IDS.map((id) => [id, manifest.items.find((i) => i.id === id)]));
  for (const id of NEW_ITEM_IDS) assert.ok(items[id], `${id} must be present in the manifest`);
  const [adv027, adv028, adv029] = NEW_ITEM_IDS.map((id) => items[id]);

  // --- 1. Manifest: exact approved wording ---
  assert.equal(adv027.title, "Best Compliment from Sarc Epic");
  assert.equal(adv027.contributor, "Sarc Epic");
  assert.deepEqual(adv027.text_lines, ["Best Compliment from Sarc Epic"]);
  assert.equal(adv028.title, "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate");
  assert.equal(adv028.contributor, "M/s Balajee Infrate");
  assert.deepEqual(adv028.text_lines, ["We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate"]);
  assert.equal(adv029.title, "In fond memory of Late Shri Bhakta Mohon Mitra");
  assert.equal(adv029.contributor, "Subrata Mitra (son), Soma Mitra (daughter)", "memorial contributors exact");
  assert.deepEqual(adv029.text_lines, [
    "In fond memory of",
    "Late Shri Bhakta Mohon Mitra",
    "B E (Mechanical) April 1951",
    "Bengal Engineering College, Shibpur, Howrah.",
    "With Love from",
    "Subrata Mitra (son)",
    "Soma Mitra (daughter)",
  ]);

  // --- IDs unique across the manifest ---
  const manifestIds = manifest.items.map((i) => i.id);
  assert.equal(new Set(manifestIds).size, manifestIds.length, "manifest IDs unique");

  // --- 2 & 3. Built home page card + website contents entry ---
  const indexHtmlPath = path.join(siteRoot, "_site", "index.html");
  assert.ok(fs.existsSync(indexHtmlPath), "run npm run build first");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  for (const [id, item] of Object.entries(items)) {
    const article = extractArticle(indexHtml, id);
    const h2Match = article.match(/<h2>([^<]*)<\/h2>/);
    assert.ok(h2Match, `${id}: expected an <h2> heading on the card`);
    assert.equal(h2Match[1], item.title, `${id}: card heading equals the manifest title exactly`);
    assert.ok(!article.includes("With best compliments"), `${id}: card must not carry artwork "With best compliments" wording`);
    assert.ok(!/Advertisement<\/h2>/.test(article), `${id}: card heading must not end with "Advertisement"`);

    // Website contents entry (#contents .toc), distinct from the primary nav
    // (which — pending the separate navigation-correction task — still loops
    // over every item and is not a "contents entry").
    const tocMatch = indexHtml.match(new RegExp(`<a href="#${id}">\\s*<span>[^<]*</span>\\s*<strong>([^<]*)</strong>`));
    assert.ok(tocMatch, `${id}: expected a #contents .toc entry`);
    assert.equal(tocMatch[1], item.title, `${id}: contents entry equals the manifest title exactly`);
  }

  // Presentation-specific web body checks.
  const adv027Article = extractArticle(indexHtml, "ADV-027");
  assert.ok(!/<img\b/i.test(adv027Article), "ADV-027: text-only card renders no <img>");
  assert.ok(adv027Article.includes('<p class="ad-text" data-testid="ad-text-ADV-027">Best Compliment from Sarc Epic</p>'), "ADV-027: exact sentence in .ad-text");
  assert.equal(countOccurrences(adv027Article, "Best Compliment from Sarc Epic"), 2, "ADV-027: sentence appears exactly twice in the card HTML source (the h2 heading once, the .ad-text content once — a data invariant, not invented duplicate text)");

  const adv028Article = extractArticle(indexHtml, "ADV-028");
  assert.ok(!/<img\b/i.test(adv028Article), "ADV-028: text-only card renders no <img>");
  assert.ok(adv028Article.includes('<p class="ad-text" data-testid="ad-text-ADV-028">We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate</p>'), "ADV-028: exact sentence in .ad-text");

  const adv029Article = extractArticle(indexHtml, "ADV-029");
  assert.ok(adv029Article.includes("Advertisements · In memoriam · ADV-029"), "ADV-029: memorial kicker present");
  assert.ok(adv029Article.includes('<img src="assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg" alt="Portrait of Late Shri Bhakta Mohon Mitra"'), "ADV-029: portrait image present with the manifest alt text");
  for (const line of adv029.text_lines) {
    assert.ok(adv029Article.includes(`<p>${line}</p>`) || adv029Article.includes(`<p class="ad-memorial__name">${line}</p>`), `ADV-029: line "${line}" present in .ad-memorial`);
  }

  // --- 4. PDF page text (pdftotext -layout) ---
  const pdfPath = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
  assert.ok(fs.existsSync(pdfPath), "run npm run pdf first");
  const pages = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 30_000_000 }).split("\f");

  // Contents pages: "45. Best Compliment from Sarc Epic ADV-027" etc.
  // Long titles wrap, so entries are re-joined by contentsEntries (ad-qa-checks-core).
  const contentsLines = pages.filter((page) => !/·\s*(?:MSG|ART|GAL|ADV)-\d{3}\b/.test(page)).flatMap((page) => page.split("\n"));
  const pdfContentsEntries = contentsEntries(contentsLines);
  for (const [id, item] of Object.entries(items)) {
    const contentsEntry = pdfContentsEntries.get(id);
    assert.ok(contentsEntry, `${id}: expected a PDF contents entry`);
    assert.equal(contentsEntry.title, item.title, `${id}: PDF contents entry equals the manifest title exactly`);
  }

  for (const id of NEW_ITEM_IDS) {
    const pageIndex = findPdfPageIndex(pages, id);
    assert.ok(pageIndex >= 0, `${id}: must be present in the PDF text`);
    const pageText = pages[pageIndex].replace(/\s+/g, " ").trim();
    assert.ok(!pageText.includes("With best compliments"), `${id}: PDF page must not carry artwork "With best compliments" wording`);
    // The kicker's plural "ADVERTISEMENTS" is expected chrome; the singular
    // word "Advertisement" (as a stray title suffix) must not appear anywhere.
    assert.ok(!/\bAdvertisement\b/.test(pageText), `${id}: nothing on the page reads "... Advertisement" as a title suffix`);
  }

  // ADV-027/028 (text-only): the approved sentence appears exactly once as
  // page content (excluding the heading, which restates it once more).
  for (const item of [adv027, adv028]) {
    const pageIndex = findPdfPageIndex(pages, item.id);
    const pageText = pages[pageIndex].replace(/\s+/g, " ").trim();
    const sentence = item.text_lines[0];
    const headingIdx = pageText.indexOf(sentence);
    assert.notEqual(headingIdx, -1, `${item.id}: sentence must appear on its PDF page (as the heading)`);
    const afterHeading = pageText.slice(headingIdx + sentence.length);
    assert.equal(countOccurrences(afterHeading, sentence), 1, `${item.id}: the approved sentence appears exactly once as page content beyond the heading`);
  }

  // ADV-029 (memorial): every line present on its PDF page, in order.
  {
    const pageIndex = findPdfPageIndex(pages, "ADV-029");
    const pageText = pages[pageIndex].replace(/\s+/g, " ").trim();
    let cursor = 0;
    for (const line of adv029.text_lines) {
      const idx = pageText.indexOf(line, cursor);
      assert.ok(idx !== -1, `ADV-029: PDF page must contain the line "${line}" in order`);
      cursor = idx + line.length;
    }
    assert.ok(pageText.includes("Subrata Mitra (son), Soma Mitra (daughter)") === false, "ADV-029: PDF page shows the two contributor lines separately, not the combined tracker/manifest contributor string");
  }

  // --- 5. Tracker row ---
  const workbook = openTracker();
  const { rows } = readSheetRows(workbook, SHEET_NAME);
  const trackerIds = rows.map((r) => String(r["Item ID"]).trim());
  assert.equal(new Set(trackerIds).size, trackerIds.length, "tracker IDs unique");
  for (const id of NEW_ITEM_IDS) assert.ok(trackerIds.includes(id), `${id} must have a tracker row`);

  const trow027 = rows.find((r) => String(r["Item ID"]).trim() === "ADV-027");
  assert.equal(trow027["Title / Item"], adv027.title);
  assert.equal(trow027["Contributor / Company"], adv027.contributor);
  assert.equal(trow027.Status, "Approved");
  assert.equal(trow027["Web Include"], "Yes");
  assert.equal(trow027["Print Include"], "Yes");

  const trow028 = rows.find((r) => String(r["Item ID"]).trim() === "ADV-028");
  assert.equal(trow028["Title / Item"], adv028.title);
  assert.equal(trow028["Contributor / Company"], adv028.contributor);
  assert.equal(trow028.Status, "Approved");
  assert.equal(trow028["Web Include"], "Yes");
  assert.equal(trow028["Print Include"], "Yes");

  const trow029 = rows.find((r) => String(r["Item ID"]).trim() === "ADV-029");
  assert.equal(trow029["Title / Item"], adv029.title);
  assert.equal(trow029["Contributor / Company"], adv029.contributor, "tracker memorial contributors exact");
  assert.equal(trow029.Status, "Approved");
  assert.equal(trow029["Web Include"], "Yes");
  assert.equal(trow029["Print Include"], "Yes");
  assert.equal(trow029["Source File Name"], "Supriyo.JPG");

  // --- npm run validate / tracker:validate: the live gates, not a re-implementation ---
  const validateOutput = execFileSync("node", ["scripts/validate.mjs"], { cwd: siteRoot, encoding: "utf8" });
  assert.match(validateOutput, /Validation passed with \d+ warning\(s\)\./, "npm run validate must be clean");
  const trackerValidateOutput = execFileSync("node", ["scripts/validate-tracker.mjs"], { cwd: siteRoot, encoding: "utf8" });
  assert.match(trackerValidateOutput, /Tracker validation passed: \d+ rows, \d+ sheets\./, "npm run tracker:validate must be clean");

  console.log(`PASS: ADV-027/028/029 wording consistent across manifest, web card, contents, PDF and tracker; IDs unique; validate + tracker:validate clean. (project: ${path.relative(projectRoot, siteRoot)})`);
}

await run();
