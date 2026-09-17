import path from "node:path";
import { projectRoot } from "./lib.mjs";
import { buildCorrectionTrackerRows } from "./tracker-corrections-core.mjs";
import { openTracker, readSheetRows, writeSheetPreservingStyles, saveTracker, snapshotTracker, SHEET_NAME } from "./tracker-io.mjs";

// Sprint v4 Task 28 (PRD §4.7 item 7): record the committee corrections on the tracker.
// Snapshot-first, style-preserving, idempotent — the pattern of apply-v4-tracker-updates.mjs.
export function applyV4CorrectionsTrackerUpdates() {
  const workbook = openTracker();
  const { headers, rows } = readSheetRows(workbook, SHEET_NAME);
  const updatedRows = buildCorrectionTrackerRows(headers, rows);
  if (JSON.stringify(rows) === JSON.stringify(updatedRows)) {
    console.log("Tracker already records the Sprint v4 committee corrections; nothing to do.");
    return { changed: false };
  }
  const snapshotPath = snapshotTracker("pre-v4-corrections-tracker-updates");
  console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);
  writeSheetPreservingStyles(workbook, SHEET_NAME, headers, updatedRows);
  saveTracker(workbook);
  console.log("Applied Sprint v4 committee corrections and 2026-09-17 approvals to the tracker (MSG-002 and ADV-028 titles; remarks appended).");
  return { changed: true, snapshotPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyV4CorrectionsTrackerUpdates();
}
