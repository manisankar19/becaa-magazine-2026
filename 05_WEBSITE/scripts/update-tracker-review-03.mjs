import xlsx from "xlsx";
import path from "node:path";
import { projectRoot } from "./lib.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(trackerPath, { cellDates: false, cellStyles: true, bookVBA: true });
const sheet = wb.Sheets["Content Tracker"];
const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false })[0];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
const decisions = {
  "ADV-009": "Confirmed excluded from website, print and Sponsor Acknowledgements: source artwork unavailable.",
  "ADV-016": "Confirmed excluded from website, print and Sponsor Acknowledgements: advertiser/company identity unavailable.",
  "ADV-024": "Confirmed excluded from website, print and Sponsor Acknowledgements: source artwork unavailable.",
  "ADV-025": "Confirmed excluded from website, print and Sponsor Acknowledgements: source artwork unavailable.",
  "ADV-027": "Confirmed excluded from website, print and Sponsor Acknowledgements: company name incomplete or unavailable."
};
for (const row of rows) {
  const id = String(row["Item ID"] || "").trim();
  if (decisions[id]) {
    row["Web Include"] = "No";
    row["Print Include"] = "No";
    row.Status = "Excluded – Source artwork not available";
    row.Remarks = decisions[id];
  }
  if (id === "ADV-026") {
    row.Status = "Approved";
    row["Web Include"] = "Yes";
    row["Print Include"] = "Yes";
    row.Remarks = "Explicitly approved for 2026 review publication. Render slide 1 from the original PPTX with LibreOffice Impress PDF export, then rasterize at 300 DPI; preserve original PPTX untouched.";
  }
  if (id === "10") {
    row["Passing Year"] = "1978";
    row.Branch = "";
    row.Remarks = "Contributor year confirmed: Subhasish Banerjee, 1978 Batch. Branch unavailable and intentionally omitted.";
  }
}
if (!rows.some((row) => String(row["Item ID"]).trim() === "COV-001")) {
  rows.push(Object.fromEntries(headers.map((header) => [header, ({
    "Item ID": "COV-001",
    "Title / Item": "একই শিকড় — Official Cover",
    "Type": "Cover",
    "Contributor / Company": "BECAA Maharashtra",
    "Passing Year": "—",
    "Branch": "—",
    "Source File Name": "Cover page.jpg",
    "Received Date": "02.08.2026",
    "Permission": "Print and web",
    "Status": "Approved",
    "Print Section": "Front Cover",
    "Proposed Page": "1",
    "Web Include": "Yes",
    "Credit / Caption": "—",
    "Notes": "Official 2026 magazine cover supplied in incoming content. Preserve exactly; do not edit, crop, regenerate or alter the Bengali title.",
    "Print Include": "Yes",
    "Remarks": "Confirmed official magazine title: একই শিকড়. Source SHA-256: d8dfb14bf8aeb93bedd74fabdd884ab51e1a433cda37c2210125a0b5f315d8e7."
  })[header] ?? ""])));
}
const oldRange = xlsx.utils.decode_range(sheet["!ref"]);
const replacement = xlsx.utils.aoa_to_sheet([headers, ...rows.map((row) => headers.map((h) => row[h] ?? ""))]);
for (let r = 0; r <= oldRange.e.r; r++) for (let c = 0; c <= oldRange.e.c; c++) {
  const address = xlsx.utils.encode_cell({ r, c });
  if (sheet[address]?.s && replacement[address]) replacement[address].s = sheet[address].s;
}
if (rows.length > oldRange.e.r) {
  const newRow = rows.length;
  for (let c = 0; c <= oldRange.e.c; c++) {
    const sourceAddress = xlsx.utils.encode_cell({ r: oldRange.e.r, c });
    const targetAddress = xlsx.utils.encode_cell({ r: newRow, c });
    if (sheet[sourceAddress]?.s && replacement[targetAddress]) replacement[targetAddress].s = sheet[sourceAddress].s;
  }
}
replacement["!cols"] = sheet["!cols"];
replacement["!rows"] = sheet["!rows"];
replacement["!merges"] = sheet["!merges"];
wb.Sheets["Content Tracker"] = replacement;
xlsx.writeFile(wb, trackerPath, { bookType: "xlsx", cellStyles: true });
console.log("Applied review-03 decisions and ensured the approved COV-001 cover row.");
