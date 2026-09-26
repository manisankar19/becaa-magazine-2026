// Unit test for scripts/v5-corrections.mjs — Sprint v5 Task 5 (PRD §4.2, §4.4; Decisions C, D, J).
// Hermetic except for one read-only check of the real manifest (src/_data/publication.yaml),
// which proves the ART-011 find string is unique there. No file is written.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyCorrection, correctionState, countOccurrences } from "../../scripts/text-correction-core.mjs";
import { V5_FILE_CORRECTIONS, V5_CORRECTIONS } from "../../scripts/v5-corrections.mjs";

const websiteDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const opts = (c) => ({ find: c.find, replace: c.replace, expectedCount: c.expectedCount, wholeWord: c.wholeWord ?? true });

// --- shape of the data --------------------------------------------------------
assert.equal(V5_FILE_CORRECTIONS.length, 2, "two file corrections: MSG-001 signature, ART-011 branch");
for (const c of V5_FILE_CORRECTIONS) {
  assert.ok(c.id && c.file && typeof c.find === "string" && typeof c.replace === "string", `entry ${c.id} complete`);
  assert.ok(Number.isInteger(c.expectedCount) && c.expectedCount >= 1);
}
const msg = V5_FILE_CORRECTIONS.find((c) => c.id === "MSG-001");
const art = V5_FILE_CORRECTIONS.find((c) => c.id === "ART-011");
assert.ok(msg && art);

// --- MSG-001 signature (Decision D): exact code points --------------------------
assert.equal(msg.file, "src/content/messages/MSG-001-president-desk.md");
assert.deepEqual([...msg.find].map((ch) => ch.codePointAt(0)), [0x43, 0x45, 0x20, 0x20, 0x38, 0x37], "old: C E space space 8 7");
assert.deepEqual([...msg.replace].map((ch) => ch.codePointAt(0)), [0x43, 0x45, 0x20, 0x2019, 0x38, 0x37], "new: C E space U+2019 8 7");
assert.equal(msg.expectedCount, 1);

{
  // Fixture: the signature as extracted from the new source (three lines, Markdown hard breaks).
  const before = [
    "On behalf of my entire Managing Committee and its members I sincerely thank you all.",
    "",
    "Manik Barman  ",
    "CE  87  ",
    "President, BECAA Maharashtra",
    "",
  ].join("\n");
  assert.equal(correctionState(before, opts(msg)), "pending");
  const after = applyCorrection(before, opts(msg));
  assert.equal(correctionState(after, opts(msg)), "applied");
  assert.ok(after.includes("Manik Barman  \nCE ’87  \nPresident, BECAA Maharashtra"), "only the signature line changes");
  assert.equal(after.replace("CE ’87", "CE  87"), before, "no other character changes");
  assert.throws(() => applyCorrection(after, opts(msg)), /found 0/, "a second application is refused");
  // The previously approved message's form is already correct, never double-applied.
  assert.equal(correctionState("Manik Barman\nCE ’87\n", opts(msg)), "applied");
}

// --- ART-011 branch (Decision J) -------------------------------------------------
assert.equal(art.file, "src/_data/publication.yaml");
assert.equal(art.expectedCount, 1);
assert.ok(art.find.includes("    branch: Civil\n") && art.replace.includes("    branch: Mechanical\n"));
assert.equal(art.replace, art.find.replace("    branch: Civil\n", "    branch: Mechanical\n"), "only the branch value differs");

{
  // Fixture: ART-011 and a neighbouring Civil item (ART-010-like) that must not change.
  const before = [
    "  - id: ART-010",
    "    type: article",
    "    contributor: Someone Else",
    "    designation: ''",
    "    passing_year: '2006'",
    "    branch: Civil",
    "    section: articles",
    "  - id: ART-011",
    "    type: article",
    "    title: বেঁচে থাকার লড়াই ও স্বপ্নের পথ",
    "    language: mixed",
    "    contributor: Palash Biswas",
    "    designation: ''",
    "    passing_year: '2006'",
    "    branch: Civil",
    "    section: articles",
    "",
  ].join("\n");
  assert.equal(correctionState(before, opts(art)), "pending");
  const after = applyCorrection(before, opts(art));
  assert.equal(correctionState(after, opts(art)), "applied");
  assert.equal(countOccurrences(after, "branch: Civil"), 1, "the other Civil item is untouched");
  assert.equal(countOccurrences(after, "branch: Mechanical"), 1);
  assert.ok(after.includes("    contributor: Palash Biswas\n    designation: ''\n    passing_year: '2006'\n    branch: Mechanical\n"));
}

// --- the real manifest (read-only): the ART-011 edit is anchored on ART-011 alone ----------
// Before Task 10 the find is present once; after it, the replacement is. Either way exactly one
// of the two occurs, only inside the ART-011 block, and the state is never ambiguous.
{
  const manifest = readFileSync(join(websiteDir, art.file), "utf8");
  const state = correctionState(manifest, opts(art));
  assert.ok(["pending", "applied"].includes(state));
  const present = state === "pending" ? art.find : art.replace;
  assert.equal(countOccurrences(manifest, present, { wholeWord: false }), 1, `ART-011 ${state} form occurs exactly once in publication.yaml`);
  const blocks = manifest.split(/\n(?=  - id: )/);
  const hits = blocks.filter((b) => b.includes(present.trimEnd()));
  assert.equal(hits.length, 1);
  assert.match(hits[0], /^ {2}- id: ART-011\n/, "the matching block is ART-011");
  assert.ok(countOccurrences(manifest, "branch: Civil") > 1, "a bare `branch: Civil` would not be unique — hence the anchored find");
}

// --- rendered-text view (V5_CORRECTIONS) matches the record -----------------------
assert.deepEqual(V5_CORRECTIONS, [
  { id: "MSG-001", find: "CE  87", replace: "CE ’87" },
  { id: "ART-011", find: "Palash Biswas, Civil, 2006 Batch", replace: "Palash Biswas, Mechanical, 2006 Batch" },
]);
assert.equal(V5_CORRECTIONS[0].find, msg.find);
assert.equal(V5_CORRECTIONS[0].replace, msg.replace);

// --- the correction record states the same strings ----------------------------------
{
  const record = readFileSync(join(websiteDir, "..", "02_INCOMING_CONTENT", "BECAA Owner Corrections 2026-09-26.md"), "utf8");
  assert.ok(record.includes("`CE  87`") && record.includes("`CE ’87`"), "record states the signature old/new");
  assert.ok(record.includes("`Palash Biswas, Civil, 2006 Batch`") && record.includes("`Palash Biswas, Mechanical, 2006 Batch`"), "record states the byline old/new");
  assert.ok(record.includes(art.find) && record.includes(art.replace), "record contains the exact manifest find/replace");
  assert.match(record, /Published as supplied \(Decision C\)/);
}

console.log("v5-corrections: all assertions passed");
