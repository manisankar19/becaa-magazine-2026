// Integration test for scripts/apply-v4-corrections-tracker-updates.mjs — Sprint v4 Task 28.
// Runs the real update against the real tracker workbook (snapshot first on the run that
// changes it; later runs are byte-identical no-ops) and re-validates with tracker:validate.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { siteRoot } from "../../scripts/lib.mjs";
import { openTracker, readSheetRows, SHEET_NAME, snapshotsDir, trackerPath } from "../../scripts/tracker-io.mjs";
import { applyV4CorrectionsTrackerUpdates } from "../../scripts/apply-v4-corrections-tracker-updates.mjs";
import { CORRECTION_DECISIONS, TRACKER_IDS } from "../../scripts/tracker-corrections-core.mjs";
import { EXPECTED_ROW_COUNT } from "../../scripts/validate-tracker-core.mjs";

const read = () => readSheetRows(openTracker(), SHEET_NAME);
const byId = (rows, id) => rows.find((r) => String(r["Item ID"]).trim() === id);
const LABEL = "pre-v4-corrections-tracker-updates";
const snapshots = () => fs.readdirSync(snapshotsDir).filter((f) => f.includes(LABEL));

const before = read();
const alreadyApplied = byId(before.rows, TRACKER_IDS["MSG-002"])["Title / Item"] === "Vice President Desk";
const snapshotsBefore = snapshots();

if (!alreadyApplied) {
  const result = applyV4CorrectionsTrackerUpdates();
  assert.equal(result.changed, true, "first run reports a change");
  assert.equal(snapshots().length, snapshotsBefore.length + 1, "a snapshot is taken before the first write");
} else {
  const bytes = fs.readFileSync(trackerPath);
  const result = applyV4CorrectionsTrackerUpdates();
  assert.equal(result.changed, false, "re-run is a no-op");
  assert.deepEqual(fs.readFileSync(trackerPath), bytes, "a no-op run does not rewrite the workbook");
  assert.equal(snapshots().length, snapshotsBefore.length, "a no-op run takes no snapshot");
  assert.ok(snapshotsBefore.length >= 1, "the snapshot from the applying run exists");
}

const after = read();
assert.equal(after.rows.length, EXPECTED_ROW_COUNT, `tracker still has ${EXPECTED_ROW_COUNT} rows`);
assert.deepEqual(openTracker().SheetNames, ["Content Tracker", "Lists", "Instructions"], "sheets unchanged");

assert.equal(byId(after.rows, "17")["Title / Item"], "Vice President Desk", "MSG-002 tracker title corrected");
for (const [manifestId, trackerId] of Object.entries(TRACKER_IDS)) {
  const remarks = byId(after.rows, trackerId).Remarks;
  const note = CORRECTION_DECISIONS[trackerId].remarksNote;
  assert.equal(remarks.split(note).length, 2, `${manifestId} (row ${trackerId}): correction note present exactly once`);
}
for (const id of ["6", "7"]) assert.equal(byId(after.rows, id)["Contributor / Company"], "Biswajit Sengupta", `row ${id}: contributor unchanged`);

// Only the five rows changed, and only in Title / Item (row 17) and Remarks.
if (!alreadyApplied) {
  const changedIds = new Set(Object.values(TRACKER_IDS));
  for (const [i, row] of after.rows.entries()) {
    const prev = before.rows[i];
    const id = String(row["Item ID"]).trim();
    if (!changedIds.has(id)) { assert.deepEqual(row, prev, `row ${id} untouched`); continue; }
    for (const column of after.headers) {
      if (column === "Remarks" || (id === "17" && column === "Title / Item")) continue;
      assert.equal(row[column], prev[column], `row ${id} ${column} unchanged`);
    }
  }
}

execFileSync("node", ["scripts/validate-tracker.mjs"], { cwd: siteRoot, encoding: "utf8" });
console.log(`PASS: committee corrections recorded on tracker rows ${Object.values(TRACKER_IDS).join(", ")}; MSG-002 title corrected; tracker:validate clean.`);
