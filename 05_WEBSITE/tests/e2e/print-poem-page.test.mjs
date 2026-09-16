// Sprint v4 Task 8 (sprints/v4/PRD.md §4.2) — PDF poem-page test. Builds
// nothing itself: requires `npm run build && npm run pdf` first. Locates
// the ART-010 page with `pdftotext -layout` (house pattern, e.g.
// tests/e2e/print-cover-page.test.mjs, and findPdfPageIndex from
// scripts/ad-qa-checks-core.mjs, which generalises to any item's kicker
// text "· <ID>") and asserts the 17 poem lines appear in source order,
// each on its own text line, with the four-line example as four
// consecutive lines, and no line split or merged.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "../../scripts/lib.mjs";
import { findPdfPageIndex } from "../../scripts/ad-qa-checks-core.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
assert.ok(fs.existsSync(pdf), "run npm run build && npm run pdf first");

// Expected poem lines derived from the committed ART-010-item.md itself
// (not retyped), so this test stays correct if the poem is ever re-extracted.
const contentPath = path.join(siteRoot, "src", "content", "articles", "ART-010-item.md");
const expectedLines = fs
  .readFileSync(contentPath, "utf8")
  .split("\n")
  .filter((line) => line.endsWith("<br>"))
  .map((line) => line.slice(0, -"<br>".length));
assert.equal(expectedLines.length, 17, "fixture precondition: ART-010-item.md must have 17 <br>-terminated lines");

// pdftotext's Bengali complex-script shaping occasionally inserts an
// incidental space around a conjunct/matra (seen on this exact PDF, e.g.
// "কুঁ ড়ি" for "কুঁড়ি", "ফু লের" for "ফুলের") — a font-shaping artifact,
// not a line split or merge. Compare with all whitespace stripped so this
// known artifact cannot mask (or fake) a real split/merge: a genuine split
// or merge changes the number of lines and/or their character content well
// beyond an incidental space, which this comparison still catches.
const normalize = (s) => s.replace(/\s+/g, "");

const pagesText = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 30_000_000 }).split("\f");
const pageIndex = findPdfPageIndex(pagesText, "ART-010");
assert.notEqual(pageIndex, -1, 'no PDF page found with kicker text "· ART-010"');

const pageLines = pagesText[pageIndex].split("\n").map((line) => line.trim());

// Locate the first poem line (anchor), then require the next 16 raw lines
// (17 total) to match the expected lines, in order, with no blank line
// among them (no stanza gaps, no page break splitting the block).
const anchorIndex = pageLines.findIndex((line) => normalize(line) === normalize(expectedLines[0]));
assert.notEqual(anchorIndex, -1, `first poem line not found verbatim on the ART-010 page: ${JSON.stringify(expectedLines[0])}`);

const poemBlock = pageLines.slice(anchorIndex, anchorIndex + 17);
assert.equal(poemBlock.length, 17, "17 consecutive lines must be available on the page starting at the poem's first line");
assert.ok(poemBlock.every((line) => line !== ""), "no blank line may appear among the poem's 17 lines (no stanza gaps, no line split across a page break)");

const normalizedBlock = poemBlock.map(normalize);
const normalizedExpected = expectedLines.map(normalize);
assert.deepEqual(
  normalizedBlock,
  normalizedExpected,
  "the 17 extracted PDF lines must match the source poem lines, in order, each on its own text line (no line split or merged)"
);

// The line immediately after the 17th poem line must not itself be a
// continuation of poem text (i.e. the block is exactly 17 lines, not 18+).
const lineAfterBlock = (pageLines[anchorIndex + 17] ?? "").trim();
assert.ok(
  lineAfterBlock === "" || /^\d+$/.test(lineAfterBlock),
  `line after the poem's 17th line must be blank or the page number, found: ${JSON.stringify(lineAfterBlock)}`
);

// The four-line example (Changev4.md §3.2) as four consecutive lines.
const fourLineExample = expectedLines.slice(0, 4);
assert.deepEqual(poemBlock.slice(0, 4).map(normalize), fourLineExample.map(normalize), "the four-line example must appear as four consecutive lines");

console.log(`PASS: ART-010 poem page (PDF page ${pageIndex + 1}) — all 17 lines present in source order, each on its own line, four-line example verbatim and consecutive, no split or merged line.`);
