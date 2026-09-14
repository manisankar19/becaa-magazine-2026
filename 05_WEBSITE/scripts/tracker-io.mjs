import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";

// Shared tracker workbook I/O (Sprint v3). Factored out of apply-v2-exclusions.mjs
// so every tracker-editing script shares the same snapshot-first, style-preserving
// write path. INSTRUCTION.md rule 2: tracker edits only with explicit approval —
// callers must be approved sprint tasks.
export const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
export const snapshotsDir = path.join(projectRoot, "04_MAGAZINE_WORKING", "TRACKER_SNAPSHOTS");
export const SHEET_NAME = "Content Tracker";

export function snapshotTracker(label) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(snapshotsDir, `BECAA_2026_Content_Tracker_${timestamp}_${label}.xlsx`);
  fs.copyFileSync(trackerPath, snapshotPath);
  return snapshotPath;
}

export function openTracker() {
  return xlsx.readFile(trackerPath, { cellDates: false, cellStyles: true, bookVBA: true });
}

export function readSheetRows(workbook, sheetName = SHEET_NAME) {
  const sheet = workbook.Sheets[sheetName];
  const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false })[0];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return { sheet, headers, rows };
}

export function writeSheetPreservingStyles(workbook, sheetName, headers, rows) {
  const sheet = workbook.Sheets[sheetName];
  const oldRange = xlsx.utils.decode_range(sheet["!ref"]);
  const replacement = xlsx.utils.aoa_to_sheet([headers, ...rows.map((row) => headers.map((h) => row[h] ?? ""))]);
  for (let r = 0; r <= oldRange.e.r; r++) {
    for (let c = 0; c <= oldRange.e.c; c++) {
      const address = xlsx.utils.encode_cell({ r, c });
      if (sheet[address]?.s && replacement[address]) replacement[address].s = sheet[address].s;
    }
  }
  replacement["!cols"] = sheet["!cols"];
  replacement["!rows"] = sheet["!rows"];
  replacement["!merges"] = sheet["!merges"];
  workbook.Sheets[sheetName] = replacement;
}

export function saveTracker(workbook) {
  xlsx.writeFile(workbook, trackerPath, { bookType: "xlsx", cellStyles: true });
}
