import path from "node:path";
import { projectRoot } from "./lib.mjs";
import { buildV4TrackerRows } from "./tracker-v4-core.mjs";
import { openTracker, readSheetRows, writeSheetPreservingStyles, saveTracker, snapshotTracker, SHEET_NAME } from "./tracker-io.mjs";

// Sprint v4 Task 14 (sprints/v4/PRD.md §4.3-4.4, Decisions C, M). Snapshot-first,
// style-preserving tracker edit, following the pattern of
// apply-v3-tracker-updates.mjs (field overrides) extended with row-appending
// (modelled on tracker-merge-core.mjs's mergeAddendumRows) for the two brand
// new rows. Idempotent: a second run makes no change and takes no snapshot.
export function applyV4TrackerUpdates() {
  const workbook = openTracker();
  const { headers, rows } = readSheetRows(workbook, SHEET_NAME);

  const updatedRows = buildV4TrackerRows(headers, rows);
  const changed = JSON.stringify(rows) !== JSON.stringify(updatedRows);
  if (!changed) {
    console.log("Tracker already carries the Sprint v4 updates (ADV-027 revised, ADV-028/029 appended, row 22 remark added); nothing to do.");
    return { changed: false, rowCountBefore: rows.length, rowCountAfter: updatedRows.length };
  }

  const snapshotPath = snapshotTracker("pre-v4-tracker-updates");
  console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);
  writeSheetPreservingStyles(workbook, SHEET_NAME, headers, updatedRows);
  saveTracker(workbook);
  console.log(`Applied Sprint v4 tracker updates: ADV-027 revised (Sarc Epic, Approved), ADV-028 and ADV-029 appended after it, row 22 remark added.`);
  console.log(`Tracker rows: ${rows.length} -> ${updatedRows.length}.`);
  return { changed: true, rowCountBefore: rows.length, rowCountAfter: updatedRows.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyV4TrackerUpdates();
}
