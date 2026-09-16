import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot, sha256 } from "./lib.mjs";
import { mergeAddendumRows } from "./tracker-merge-core.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const addendumPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker addendum.xlsx");
const snapshotsDir = path.join(projectRoot, "04_MAGAZINE_WORKING", "TRACKER_SNAPSHOTS");
const newCoverPath = path.join(projectRoot, "02_INCOMING_CONTENT", "cover page new.png");

const SHEET_NAME = "Content Tracker";

function readSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false })[0];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return { sheet, headers, rows };
}

function writeSheetPreservingStyles(workbook, sheetName, headers, rows) {
  const sheet = workbook.Sheets[sheetName];
  const oldRange = xlsx.utils.decode_range(sheet["!ref"]);
  const replacement = xlsx.utils.aoa_to_sheet([headers, ...rows.map((row) => headers.map((h) => row[h] ?? ""))]);

  for (let r = 0; r <= oldRange.e.r; r++) {
    for (let c = 0; c <= oldRange.e.c; c++) {
      const address = xlsx.utils.encode_cell({ r, c });
      if (sheet[address]?.s && replacement[address]) replacement[address].s = sheet[address].s;
    }
  }
  // New rows beyond the original range inherit the last existing row's style
  // so the appended rows look consistent with the rest of the sheet.
  for (let newRow = oldRange.e.r + 1; newRow < 1 + rows.length; newRow++) {
    for (let c = 0; c <= oldRange.e.c; c++) {
      const sourceAddress = xlsx.utils.encode_cell({ r: oldRange.e.r, c });
      const targetAddress = xlsx.utils.encode_cell({ r: newRow, c });
      if (sheet[sourceAddress]?.s && replacement[targetAddress]) replacement[targetAddress].s = sheet[sourceAddress].s;
    }
  }

  replacement["!cols"] = sheet["!cols"];
  replacement["!rows"] = sheet["!rows"];
  replacement["!merges"] = sheet["!merges"];
  workbook.Sheets[sheetName] = replacement;
}

if (!fs.existsSync(addendumPath)) {
  console.error(`Addendum tracker not found: ${addendumPath}`);
  process.exit(1);
}
if (!fs.existsSync(newCoverPath)) {
  console.error(`Replacement cover not found: ${newCoverPath}`);
  process.exit(1);
}

fs.mkdirSync(snapshotsDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const snapshotPath = path.join(snapshotsDir, `BECAA_2026_Content_Tracker_${timestamp}_pre-v2-merge.xlsx`);
fs.copyFileSync(trackerPath, snapshotPath);
console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);

const mainWorkbook = xlsx.readFile(trackerPath, { cellDates: false, cellStyles: true, bookVBA: true });
const addendumWorkbook = xlsx.readFile(addendumPath, { cellDates: false, cellStyles: false });

const { headers: mainHeaders, rows: mainRows } = readSheetRows(mainWorkbook, SHEET_NAME);
const { rows: addendumRows } = readSheetRows(addendumWorkbook, SHEET_NAME);

const oldCoverRow = mainRows.find((row) => String(row["Item ID"]).trim() === "COV-001");
if (!oldCoverRow) {
  console.error("COV-001 row not found in the main tracker; refusing to proceed with the cover update.");
  process.exit(1);
}
const previousCoverFingerprint = sha256(path.join(projectRoot, "02_INCOMING_CONTENT", oldCoverRow["Source File Name"]));
const newCoverFingerprint = sha256(newCoverPath);

const mergedRows = mergeAddendumRows({
  headers: mainHeaders,
  mainRows,
  addendumRows,
  coverUpdate: {
    itemId: "COV-001",
    newSourceFileName: "cover page new.png",
    remarksNote: (previousSourceFileName) =>
      `Sprint v2: cover replaced with "cover page new.png" (SHA-256 ${newCoverFingerprint}). Previous source preserved unchanged as "${previousSourceFileName}" (SHA-256 ${previousCoverFingerprint}).`,
  },
});

writeSheetPreservingStyles(mainWorkbook, SHEET_NAME, mainHeaders, mergedRows);
xlsx.writeFile(mainWorkbook, trackerPath, { bookType: "xlsx", cellStyles: true });

console.log(`Merged ${addendumRows.length} addendum row(s) into the main tracker (${mainRows.length} -> ${mergedRows.length} rows).`);
console.log("Updated COV-001 Source File Name to \"cover page new.png\" and appended a Remarks note preserving the previous cover reference.");
