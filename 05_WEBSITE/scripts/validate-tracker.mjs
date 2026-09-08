import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";

const p = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(p, { cellDates: false });
if (wb.SheetNames.join("|") !== "Content Tracker|Lists|Instructions") throw new Error(`Unexpected sheets: ${wb.SheetNames.join(", ")}`);
const rows = xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false });
if (rows.length !== 47) throw new Error(`Expected 47 tracker rows including COV-001, found ${rows.length}.`);
const ids = rows.map((r) => String(r["Item ID"]));
if (new Set(ids).size !== ids.length) throw new Error("Duplicate tracker IDs detected.");
const cover = rows.find((row) => String(row["Item ID"]) === "COV-001");
if (!cover || cover["Source File Name"] !== "Cover page.jpg" || cover.Status !== "Approved" || cover["Web Include"] !== "Yes" || cover["Print Include"] !== "Yes") throw new Error("COV-001 official cover approval fields are incomplete.");
for (const row of rows.filter((r) => String(r["Item ID"]).startsWith("ADV-"))) {
  if (/^yes$/i.test(row["Web Include"]) && (!/^approved$/i.test(row.Status) || !String(row["Source File Name"]).trim() || row["Source File Name"] === "—")) throw new Error(`${row["Item ID"]} is web-enabled without approved available artwork.`);
  if (/^yes$/i.test(row["Print Include"]) && !/^yes$/i.test(row["Web Include"])) throw new Error(`${row["Item ID"]} print/web inclusion is inconsistent.`);
}
console.log(`Tracker validation passed: ${rows.length} rows, ${wb.SheetNames.length} sheets.`);
