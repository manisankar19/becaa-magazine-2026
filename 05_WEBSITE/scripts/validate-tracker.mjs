import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";
import { validateTrackerRows } from "./validate-tracker-core.mjs";

const p = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(p, { cellDates: false });
const rows = xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"] ?? {}, { defval: "", raw: false });
const errors = validateTrackerRows(rows, wb.SheetNames);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Tracker validation passed: ${rows.length} rows, ${wb.SheetNames.length} sheets.`);
