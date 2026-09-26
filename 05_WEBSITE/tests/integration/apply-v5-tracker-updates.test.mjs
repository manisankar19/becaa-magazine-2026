// Integration test for scripts/apply-v5-tracker-updates.mjs — Sprint v5 Task 11 (PRD §4.5).
// Runs the real update against the real tracker workbook (snapshot first on the run that
// changes it; later runs are byte-identical no-ops) and re-validates with tracker:validate.
// The "only these cells changed" check compares against the pre-v5 snapshot, so it holds on
// every run, not only the applying one.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { siteRoot } from "../../scripts/lib.mjs";
import { openTracker, readSheetRows, SHEET_NAME, snapshotsDir, trackerPath } from "../../scripts/tracker-io.mjs";
import { applyV5TrackerUpdates, SNAPSHOT_LABEL } from "../../scripts/apply-v5-tracker-updates.mjs";
import { V5_DECISIONS, V5_TRACKER_IDS } from "../../scripts/tracker-v5-core.mjs";
import { EXPECTED_ROW_COUNT } from "../../scripts/validate-tracker-core.mjs";

const read = () => readSheetRows(openTracker(), SHEET_NAME);
const byId = (rows, id) => rows.find((r) => String(r["Item ID"]).trim() === id);
const snapshots = () => fs.readdirSync(snapshotsDir).filter((f) => f.includes(SNAPSHOT_LABEL)).sort();

const before = read();
const alreadyApplied = byId(before.rows, "16")["Source File Name"] === V5_DECISIONS["16"].fields["Source File Name"] && byId(before.rows, "23").Branch === "Mechanical";
const snapshotsBefore = snapshots();

if (!alreadyApplied) {
  const result = applyV5TrackerUpdates();
  assert.equal(result.changed, true, "first run reports a change");
  assert.equal(snapshots().length, snapshotsBefore.length + 1, "a snapshot is taken before the first write");
}

// Re-run (every time): byte-identical no-op, no new snapshot.
{
  const bytes = fs.readFileSync(trackerPath);
  const count = snapshots().length;
  const result = applyV5TrackerUpdates();
  assert.equal(result.changed, false, "re-run is a no-op");
  assert.deepEqual(fs.readFileSync(trackerPath), bytes, "a no-op run does not rewrite the workbook");
  assert.equal(snapshots().length, count, "a no-op run takes no snapshot");
}

const all = snapshots();
assert.ok(all.length >= 1, "the pre-v5 snapshot exists");
const snapshotWorkbook = xlsx.readFile(path.join(snapshotsDir, all[all.length - 1]), { cellDates: false, cellStyles: true });
const pre = readSheetRows(snapshotWorkbook, SHEET_NAME);
assert.notEqual(byId(pre.rows, "23").Branch, "Mechanical", "the snapshot holds the pre-v5 state");

const current = openTracker();
const after = read();
assert.equal(after.rows.length, EXPECTED_ROW_COUNT, `tracker still has ${EXPECTED_ROW_COUNT} rows`);
assert.equal(pre.rows.length, EXPECTED_ROW_COUNT, `snapshot has ${EXPECTED_ROW_COUNT} rows`);
assert.deepEqual(current.SheetNames, ["Content Tracker", "Lists", "Instructions"], "sheets unchanged");
assert.deepEqual(after.headers, pre.headers, "headers unchanged");
for (const name of ["Lists", "Instructions"]) {
  const aoa = (wb) => xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
  assert.deepEqual(aoa(current), aoa(snapshotWorkbook), `sheet ${name} unchanged`);
}

// Row 16 (MSG-001) and row 23 (ART-011) carry the v5 values; notes present exactly once.
assert.equal(byId(after.rows, "16")["Source File Name"], "Souvenir President message 05-09-2026.docx");
assert.equal(byId(after.rows, "16")["Received Date"], "26.09.2026", "Decision I");
assert.equal(byId(after.rows, "23").Branch, "Mechanical", "Decision J");
for (const [manifestId, trackerId] of Object.entries(V5_TRACKER_IDS)) {
  const remarks = byId(after.rows, trackerId).Remarks;
  assert.equal(remarks.split(V5_DECISIONS[trackerId].remarksNote).length, 2, `${manifestId} (row ${trackerId}): v5 note present exactly once`);
  assert.ok(remarks.startsWith(byId(pre.rows, trackerId).Remarks), `${manifestId}: earlier remarks preserved`);
}

// Only these cells changed relative to the pre-v5 snapshot.
const allowed = { 16: ["Source File Name", "Received Date", "Remarks"], 23: ["Branch", "Remarks"] };
for (const [i, row] of after.rows.entries()) {
  const prev = pre.rows[i];
  const id = String(row["Item ID"]).trim();
  assert.equal(id, String(prev["Item ID"]).trim(), `row order unchanged at ${i}`);
  for (const column of after.headers) {
    if ((allowed[id] ?? []).includes(column)) continue;
    assert.equal(row[column], prev[column], `row ${id} ${column} unchanged`);
  }
}

execFileSync("node", ["scripts/validate-tracker.mjs"], { cwd: siteRoot, encoding: "utf8" });
console.log(`PASS: Sprint v5 tracker updates recorded (row 16 source/date, row 23 branch); ${EXPECTED_ROW_COUNT} rows, 3 sheets; re-run a byte-identical no-op; tracker:validate clean.`);
