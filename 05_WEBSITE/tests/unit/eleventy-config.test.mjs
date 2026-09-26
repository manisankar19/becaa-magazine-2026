// Unit test for the Eleventy `byline` filter (eleventy.config.mjs) — Sprint v4 Task 26
// (PRD §4.7 item 5, §5, Decision R). Hermetic: filters are collected through a shim.
import assert from "node:assert/strict";
import eleventyConfig from "../../eleventy.config.mjs";
import { readManifest } from "../../scripts/lib.mjs";

const filters = {};
eleventyConfig({ addDataExtension() {}, addPassthroughCopy() {}, setLibrary() {}, addFilter(name, fn) { filters[name] = fn; } });
const { byline, markdown, adPageStyle, adInkClass } = filters;
assert.equal(typeof byline, "function", "byline filter registered");

// --- Without display_name: unchanged Sprint v1–v3 behaviour ------------------
assert.equal(byline({ contributor: "Biswajit Sengupta", branch: "Civil", passing_year: "1971" }), "Biswajit Sengupta, Civil, 1971 Batch");
assert.equal(byline({ contributor: "Manik Barman", branch: "Civil", passing_year: "1987", designation: "President" }), "Manik Barman, Civil, 1987 Batch — President");
assert.equal(byline({ contributor: "A", designation: "Memorial contribution" }), "A — Memorial contribution");
assert.equal(byline({ designation: "Editor" }), "Editor");
assert.equal(byline({}), "");

// --- display_name replaces only the primary name ------------------------------
{
  const item = { contributor: "Biswajit Sengupta", display_name: "Late Biswajit Sengupta", branch: "Civil", passing_year: "1971", designation: "" };
  assert.equal(byline(item), "Late Biswajit Sengupta, Civil, 1971 Batch", "display_name used; branch and batch unchanged");
  assert.equal(item.contributor, "Biswajit Sengupta", "the filter does not mutate the provenance field");
  assert.equal(byline({ ...item, designation: "Life Member" }), "Late Biswajit Sengupta, Civil, 1971 Batch — Life Member", "designation unchanged");
}

// --- empty or whitespace display_name falls back to contributor ----------------
assert.equal(byline({ contributor: "Biswajit Sengupta", display_name: "", branch: "Civil" }), "Biswajit Sengupta, Civil");
assert.equal(byline({ contributor: "Biswajit Sengupta", display_name: "   ", branch: "Civil" }), "Biswajit Sengupta, Civil");
assert.equal(byline({ contributor: "Biswajit Sengupta", display_name: null }), "Biswajit Sengupta");

// --- Sprint v5 Task 10 (Decision J): ART-011's byline in the real manifest ------------
{
  const art011 = readManifest().items.find((i) => i.id === "ART-011");
  assert.equal(byline(art011), "Palash Biswas, Mechanical, 2006 Batch", "ART-011 branch corrected Civil → Mechanical");
}

// --- Sprint v5 Task 25 (PRD §11): no inline styles from Markdown tables (the CSP refuses them) ----
{
  const html = markdown("| Item | Qty | Mid |\n|:-----|----:|:---:|\n| a | 1 | x |\n");
  assert.ok(!/\sstyle=/.test(html), `table alignment must not be an inline style: ${html}`);
  assert.match(html, /<th class="align-left">Item<\/th>/);
  assert.match(html, /<th class="align-right">Qty<\/th>/);
  assert.match(html, /<td class="align-center">x<\/td>/);
  assert.match(markdown("| A | B |\n|---|---|\n| 1 | 2 |\n"), /<th>A<\/th>/, "unaligned cells stay bare");
}
// The print template still uses the inline tint filters (the PDF is compiled without the CSP);
// their output is unchanged.
assert.equal(adPageStyle({ page_background: "#b6e2f2", page_background_mode: "auto", page_ink: "auto" }).startsWith("--ad-bg: #b6e2f2; --ad-ink: #"), true);
assert.equal(adPageStyle({ page_background: "#b6e2f2", page_background_mode: "none" }), "");
assert.match(adInkClass({ page_background: "#b6e2f2", page_background_mode: "auto", page_ink: "auto" }), /^ad-ink--(dark|light)$/);

console.log("eleventy-config (byline): all assertions passed");
