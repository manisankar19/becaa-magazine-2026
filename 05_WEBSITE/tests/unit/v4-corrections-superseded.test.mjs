// Unit test for the retirement of the Sprint v4 MSG-001 correction — Sprint v5 Task 8
// (PRD §4.3, Decision H). Hermetic: the apply script runs against a temporary site root.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { activeCorrections, isSuperseded, MSG001_SUPERSEDED, V4_CORRECTIONS, V4_FILE_CORRECTIONS } from "../../scripts/v4-corrections.mjs";
import { applyV4FileCorrections } from "../../scripts/apply-v4-committee-corrections.mjs";

// --- data: MSG-001 kept as history, marked superseded; nothing else is ------------
assert.deepEqual(MSG001_SUPERSEDED, { date: "2026-09-26", reason: "MSG-001 replaced by the new President's message (Sprint v5, Decision H)" });
for (const [name, list] of [["V4_FILE_CORRECTIONS", V4_FILE_CORRECTIONS], ["V4_CORRECTIONS", V4_CORRECTIONS]]) {
  const msg001 = list.filter((c) => c.id === "MSG-001");
  assert.equal(msg001.length, 1, `${name}: the MSG-001 entry is kept (history is not deleted)`);
  assert.equal(msg001[0].find, "বেকান পরিচয়", `${name}: MSG-001 entry unchanged`);
  assert.equal(msg001[0].replace, "BECAA-র পরিচয়", `${name}: MSG-001 entry unchanged`);
  assert.deepEqual(msg001[0].superseded, MSG001_SUPERSEDED, `${name}: MSG-001 marked superseded with date and reason`);
  assert.ok(isSuperseded(msg001[0]));
  assert.deepEqual(list.filter(isSuperseded).map((c) => c.id), ["MSG-001"], `${name}: only MSG-001 is superseded`);
  assert.ok(!activeCorrections(list).some((c) => c.id === "MSG-001"), `${name}: MSG-001 not active`);
  assert.equal(activeCorrections(list).length, list.length - 1, `${name}: every other correction stays active`);
}
assert.ok(!isSuperseded({ id: "X", find: "a", replace: "b" }));

// --- apply script: superseded entries are skipped with a reason, others applied ---------
const root = fs.mkdtempSync(path.join(os.tmpdir(), "v4-superseded-"));
try {
  fs.writeFileSync(path.join(root, "a.md"), "Vice Preseident Desk\n", "utf8");
  // The superseded entry's file holds text the correction no longer matches (a replaced message):
  // applying it would throw "neither … nor … found", so a skip must not even read it.
  fs.writeFileSync(path.join(root, "old.md"), "From the President's Desk\n", "utf8");
  const corrections = [
    { id: "OLD-001", file: "old.md", find: "বেকান", replace: "BECAA-র", expectedCount: 1, superseded: { date: "2026-09-26", reason: "replaced" } },
    { id: "NEW-001", file: "a.md", find: "Vice Preseident Desk", replace: "Vice President Desk", expectedCount: 1 },
    { id: "GONE-001", file: "missing.md", find: "x", replace: "y", expectedCount: 1, superseded: { date: "2026-09-26", reason: "file removed" } },
  ];
  const first = applyV4FileCorrections({ root, corrections });
  assert.deepEqual(first.map((r) => [r.id, r.action]), [["OLD-001", "skipped (superseded)"], ["NEW-001", "applied"], ["GONE-001", "skipped (superseded)"]]);
  assert.equal(first[0].reason, "2026-09-26: replaced", "skip carries the date and reason");
  assert.equal(fs.readFileSync(path.join(root, "old.md"), "utf8"), "From the President's Desk\n", "superseded target untouched");
  assert.equal(fs.readFileSync(path.join(root, "a.md"), "utf8"), "Vice President Desk\n", "active correction applied");
  const second = applyV4FileCorrections({ root, corrections });
  assert.deepEqual(second.map((r) => r.action), ["skipped (superseded)", "already applied", "skipped (superseded)"], "re-run: skip again, others no-op");
  // --only a superseded id is not an error: it reports the skip.
  assert.deepEqual(applyV4FileCorrections({ root, corrections, only: ["OLD-001"] }).map((r) => r.action), ["skipped (superseded)"]);
  assert.throws(() => applyV4FileCorrections({ root, corrections, only: ["NONE"] }), /No corrections for: NONE/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("v4-corrections-superseded: all assertions passed");
