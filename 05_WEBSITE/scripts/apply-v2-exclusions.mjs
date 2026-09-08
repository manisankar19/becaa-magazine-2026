import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";
import { applyExclusionDecisions } from "./tracker-exclusion-core.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const snapshotsDir = path.join(projectRoot, "04_MAGAZINE_WORKING", "TRACKER_SNAPSHOTS");
const SHEET_NAME = "Content Tracker";

// Sprint v2 Task 2 (sprints/v2/MATERIAL_CHANGE_REGISTER.md) — these two
// addendum items are recorded in the tracker but must not reach the
// manifest, website, or PDF.
const DECISIONS = {
  20: {
    webInclude: "No",
    printInclude: "No",
    status: "Excluded – Source file not received",
    remarksNote:
      'Sprint v2: named source file "Article for BECAA Maharashtra Souveneir.pdf" was not found in v2-incoming or anywhere else in the project. Distinct from the already-published ART-006 source ("Article for BECAA Maharashtra Souvenir.docx", a different author). Excluded pending the correct file or an editorial correction of this row. See sprints/v2/MATERIAL_CHANGE_REGISTER.md.',
  },
  24: {
    webInclude: "No",
    printInclude: "No",
    status: "Excluded – Content and permission pending",
    remarksNote:
      'Sprint v2: source docx contains only placeholder text ("Story upcoming.") and Permission is still Pending. Excluded until real content and permission are both received. See sprints/v2/MATERIAL_CHANGE_REGISTER.md.',
  },
};

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

  replacement["!cols"] = sheet["!cols"];
  replacement["!rows"] = sheet["!rows"];
  replacement["!merges"] = sheet["!merges"];
  workbook.Sheets[sheetName] = replacement;
}

fs.mkdirSync(snapshotsDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const snapshotPath = path.join(snapshotsDir, `BECAA_2026_Content_Tracker_${timestamp}_pre-v2-exclusions.xlsx`);
fs.copyFileSync(trackerPath, snapshotPath);
console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);

const workbook = xlsx.readFile(trackerPath, { cellDates: false, cellStyles: true, bookVBA: true });
const { headers, rows } = readSheetRows(workbook, SHEET_NAME);

for (const id of Object.keys(DECISIONS)) {
  if (!rows.some((row) => String(row["Item ID"]).trim() === id)) {
    console.error(`Expected Item ID ${id} not found in the tracker; refusing to proceed.`);
    process.exit(1);
  }
}

const updatedRows = applyExclusionDecisions(rows, DECISIONS);
writeSheetPreservingStyles(workbook, SHEET_NAME, headers, updatedRows);
xlsx.writeFile(workbook, trackerPath, { bookType: "xlsx", cellStyles: true });

console.log(`Applied exclusion decisions to Item ID(s): ${Object.keys(DECISIONS).join(", ")}.`);
