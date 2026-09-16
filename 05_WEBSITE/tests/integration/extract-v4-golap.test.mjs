// Integration test for scripts/extract-v4-golap.mjs — Sprint v4 Task 6
// (sprints/v4/PRD.md §4.2, Decisions A, B). Runs the real extraction against
// the real authoritative Markdown source and checks the committed
// ART-010-item.md: 17 <br>-terminated lines, the four-line example
// verbatim, correct front matter, and the fingerprint matching the .md's
// own SHA-256.
import assert from "node:assert/strict";
import fs from "node:fs";
import { sha256 } from "../../scripts/lib.mjs";
import { extractGolap, outputPath, sourcePath, EXPECTED_FINGERPRINT } from "../../scripts/extract-v4-golap.mjs";

// The four-line example from Changev4.md §3.2 — the first four poem lines,
// verbatim (Bengali text retyped here only once, cross-checked against the
// committed source file below rather than trusted blindly).
const FOUR_LINE_EXAMPLE = [
  "এনেছি এক গোলাপের চারা—",
  "রেখেছি তার ভার ভার মাটি ভরা টবে,",
  "জল দিই তারে, রোদ্দুরেও রাখি তারে।",
  "ধীরে ধীরে বেড়ে ওঠে, গোলাপের চারা—",
];

async function run() {
  assert.ok(fs.existsSync(sourcePath), "authoritative source Shubhra Basu.md must exist");
  const actualFingerprint = sha256(sourcePath);
  assert.equal(actualFingerprint, EXPECTED_FINGERPRINT, "Shubhra Basu.md must match the verified SHA-256");

  extractGolap();

  assert.ok(fs.existsSync(outputPath), "output Markdown file must exist");
  const written = fs.readFileSync(outputPath, "utf8");

  assert.match(written, /^---\nid: ART-010\n/);
  assert.match(written, /\ntitle: "গোলাপ"\n/);
  assert.match(written, /\nsource_file: "02_INCOMING_CONTENT\/Shubhra Basu\.md"\n/);
  assert.match(written, new RegExp(`\\nsource_fingerprint: ${actualFingerprint}\\n`));
  assert.match(written, /\nverification: verified\n/);

  const body = written.split("---\n").slice(2).join("---\n");
  const brLines = body.split("\n").filter((line) => line.endsWith("<br>"));
  assert.equal(brLines.length, 17, "body must contain exactly 17 <br>-terminated lines");

  const strippedLines = brLines.map((line) => line.slice(0, -"<br>".length));
  assert.deepEqual(
    strippedLines.slice(0, 4),
    FOUR_LINE_EXAMPLE,
    "the first four <br>-terminated lines must be the four-line example, verbatim"
  );

  // No stanza gaps: the 17 <br> lines are consecutive, non-blank lines in the body.
  const bodyLines = body.split("\n");
  const firstBrIndex = bodyLines.findIndex((line) => line.endsWith("<br>"));
  const poemBlock = bodyLines.slice(firstBrIndex, firstBrIndex + 17);
  assert.equal(poemBlock.length, 17);
  assert.ok(
    poemBlock.every((line) => line.trim() !== "" && line.endsWith("<br>")),
    "no blank stanza-gap lines may appear between the 17 poem lines"
  );

  console.log("PASS: ART-010 (গোলাপ) re-extracted from the authoritative .md — 17 <br>-terminated lines, four-line example verbatim, correct front matter.");
}

await run();
