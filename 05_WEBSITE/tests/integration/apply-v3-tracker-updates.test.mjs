// Integration test for scripts/apply-v3-tracker-updates.mjs — Sprint v3 Task 8.
// Idempotent: applies once, then verifies the live tracker's post-state.
import assert from "node:assert/strict";
import fs from "node:fs";
import xlsx from "xlsx";
import { trackerPath, snapshotsDir } from "../../scripts/tracker-io.mjs";
import { applyV3TrackerUpdates, DECISIONS } from "../../scripts/apply-v3-tracker-updates.mjs";

function readRows() {
  const wb = xlsx.readFile(trackerPath, { cellDates: false });
  return { sheets: wb.SheetNames, rows: xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false }), lists: xlsx.utils.sheet_to_json(wb.Sheets.Lists, { header: 1, defval: "" }) };
}

const before = readRows();
const snapsBefore = fs.readdirSync(snapshotsDir).filter((f) => f.includes("pre-v3-content-updates")).length;
const { changedIds } = applyV3TrackerUpdates();
const after = readRows();
const snapsAfter = fs.readdirSync(snapshotsDir).filter((f) => f.includes("pre-v3-content-updates")).length;

assert.deepEqual(after.sheets, ["Content Tracker", "Lists", "Instructions"]);
assert.equal(after.rows.length, 52);
assert.deepEqual(after.lists, before.lists, "Lists untouched");
assert.equal(snapsAfter, changedIds.length ? snapsBefore + 1 : snapsBefore, "snapshot only on a mutating run");

const r18 = after.rows.find((r) => String(r["Item ID"]) === "18");
const r24 = after.rows.find((r) => String(r["Item ID"]) === "24");
assert.ok(r18.Remarks.includes(DECISIONS[18].remarksNote) && r18.Remarks.split(DECISIONS[18].remarksNote).length === 2);
assert.equal(r18["Title / Item"], "Secretary Desk");
assert.equal(r18.Status, "Approved");
for (const [k, v] of Object.entries(DECISIONS[24].fields)) assert.equal(r24[k], v, `Item 24 ${k}`);
assert.ok(r24.Remarks.startsWith("Sprint v2:"), "Item 24's earlier v2 remark is preserved");
assert.ok(r24.Remarks.includes(DECISIONS[24].remarksNote) && r24.Remarks.split(DECISIONS[24].remarksNote).length === 2);
assert.equal(r24.Branch, "Electrical");
assert.equal(r24["Passing Year"], "1986");

for (const b of before.rows) {
  const id = String(b["Item ID"]);
  if (id === "18" || id === "24") continue;
  assert.deepEqual(after.rows.find((r) => String(r["Item ID"]) === id), b, `row ${id} unchanged`);
}
const r20 = after.rows.find((r) => String(r["Item ID"]) === "20");
assert.ok(/^Excluded/.test(r20.Status) && r20["Web Include"] === "No", "Item 20 stays excluded");
console.log(`PASS: tracker Items 18 and 24 updated (changed this run: ${changedIds.join(", ") || "none"}); all other rows unchanged.`);
