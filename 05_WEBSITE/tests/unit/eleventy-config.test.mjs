// Unit test for the Eleventy `byline` filter (eleventy.config.mjs) — Sprint v4 Task 26
// (PRD §4.7 item 5, §5, Decision R). Hermetic: filters are collected through a shim.
import assert from "node:assert/strict";
import eleventyConfig from "../../eleventy.config.mjs";

const filters = {};
eleventyConfig({ addDataExtension() {}, addPassthroughCopy() {}, setLibrary() {}, addFilter(name, fn) { filters[name] = fn; } });
const { byline } = filters;
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

console.log("eleventy-config (byline): all assertions passed");
