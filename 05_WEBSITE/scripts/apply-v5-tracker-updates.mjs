import path from "node:path";
import { projectRoot } from "./lib.mjs";
import { buildV5TrackerRows } from "./tracker-v5-core.mjs";
import { openTracker, readSheetRows, writeSheetPreservingStyles, saveTracker, snapshotTracker, SHEET_NAME } from "./tracker-io.mjs";

export const SNAPSHOT_LABEL = "pre-v5-tracker-updates";

// Sprint v5 Task 11 (sprints/v5/PRD.md §4.5, Decisions I, J): record the replaced
// President's message (row 16) and ART-011's corrected branch (row 23) on the tracker.
// Snapshot-first, style-preserving, idempotent — the pattern of apply-v4-tracker-updates.mjs.
export function applyV5TrackerUpdates() {
  const workbook = openTracker();
  const { headers, rows } = readSheetRows(workbook, SHEET_NAME);
  const updatedRows = buildV5TrackerRows(headers, rows);
  if (JSON.stringify(rows) === JSON.stringify(updatedRows)) {
    console.log("Tracker already carries the Sprint v5 updates (row 16 new source and date, row 23 branch Mechanical); nothing to do.");
    return { changed: false };
  }
  const snapshotPath = snapshotTracker(SNAPSHOT_LABEL);
  console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);
  writeSheetPreservingStyles(workbook, SHEET_NAME, headers, updatedRows);
  saveTracker(workbook);
  console.log("Applied Sprint v5 tracker updates: row 16 (MSG-001) Source File Name and Received Date, row 23 (ART-011) Branch → Mechanical; remarks appended.");
  return { changed: true, snapshotPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyV5TrackerUpdates();
}
