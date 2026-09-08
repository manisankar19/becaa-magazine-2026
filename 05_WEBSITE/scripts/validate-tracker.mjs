import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";

const p = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(p, { cellDates: false });
if (wb.SheetNames.join("|") !== "Content Tracker|Lists|Instructions") throw new Error(`Unexpected sheets: ${wb.SheetNames.join(", ")}`);
const rows = xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false });
if (rows.length !== 52) throw new Error(`Expected 52 tracker rows including COV-001 and the Sprint v2 addendum (Items 20-24), found ${rows.length}.`);
const ids = rows.map((r) => String(r["Item ID"]));
if (new Set(ids).size !== ids.length) throw new Error("Duplicate tracker IDs detected.");
const cover = rows.find((row) => String(row["Item ID"]) === "COV-001");
if (!cover || cover["Source File Name"] !== "cover page new.png" || cover.Status !== "Approved" || cover["Web Include"] !== "Yes" || cover["Print Include"] !== "Yes") throw new Error("COV-001 official cover approval fields are incomplete.");
for (const id of ["20", "24"]) {
  const row = rows.find((r) => String(r["Item ID"]) === id);
  if (!row || row["Web Include"] !== "No" || row["Print Include"] !== "No" || !/^Excluded/.test(row.Status)) {
    throw new Error(`Item ${id} must remain recorded but excluded (Web/Print Include: No) pending its missing source/permission.`);
  }
}
for (const row of rows.filter((r) => String(r["Item ID"]).startsWith("ADV-"))) {
  if (/^yes$/i.test(row["Web Include"]) && (!/^approved$/i.test(row.Status) || !String(row["Source File Name"]).trim() || row["Source File Name"] === "—")) throw new Error(`${row["Item ID"]} is web-enabled without approved available artwork.`);
  if (/^yes$/i.test(row["Print Include"]) && !/^yes$/i.test(row["Web Include"])) throw new Error(`${row["Item ID"]} print/web inclusion is inconsistent.`);
}
console.log(`Tracker validation passed: ${rows.length} rows, ${wb.SheetNames.length} sheets.`);
