import path from "node:path";
import { projectRoot } from "./lib.mjs";
import { applyTrackerFieldUpdates } from "./tracker-v3-core.mjs";
import { openTracker, readSheetRows, writeSheetPreservingStyles, saveTracker, snapshotTracker, SHEET_NAME } from "./tracker-io.mjs";

// Sprint v3 Task 8 (sprints/v3/PRD.md §4.1–4.2, Decisions A and D, approved
// 2026-09-14). Two tracker rows only:
//   18  — record that the Secretary's Desk source was revised (Remarks only).
//   24  — Siddhartha Mukhopadhyay story: approved and included, published as ART-012.
export const DECISIONS = {
  18: {
    remarksNote:
      "Sprint v3: revised source received 2026-09-14 (SHA-256 ed3fd766…) replaces the 01.08.2026 version (SHA-256 df446f44…), preserved in 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/ and git history.",
  },
  24: {
    fields: {
      "Title / Item": "প্যাঁড়া (Siddhartha Mukhopadhyay story)",
      Permission: "Print and web",
      Status: "Approved",
      "Web Include": "Yes",
      "Print Include": "Yes",
      "Received Date": "14.09.2026",
    },
    remarksNote: "Sprint v3: real content received and approval confirmed 2026-09-14; published as ART-012.",
  },
};

export function applyV3TrackerUpdates() {
  const workbook = openTracker();
  const { headers, rows } = readSheetRows(workbook, SHEET_NAME);
  const updatedRows = applyTrackerFieldUpdates(rows, DECISIONS);
  const changedIds = Object.keys(DECISIONS).filter((id) => {
    const i = rows.findIndex((r) => String(r["Item ID"]).trim() === id);
    return JSON.stringify(rows[i]) !== JSON.stringify(updatedRows[i]);
  });
  if (changedIds.length === 0) {
    console.log("Tracker rows 18 and 24 already carry the Sprint v3 updates; nothing to do.");
    return { changedIds };
  }
  const snapshotPath = snapshotTracker("pre-v3-content-updates");
  console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);
  writeSheetPreservingStyles(workbook, SHEET_NAME, headers, updatedRows);
  saveTracker(workbook);
  console.log(`Applied Sprint v3 updates to Item ID(s): ${changedIds.join(", ")}.`);
  return { changedIds };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyV3TrackerUpdates();
}
