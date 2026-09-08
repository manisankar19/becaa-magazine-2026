import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(trackerPath, { cellDates: false, cellStyles: true, bookVBA: true });
const sheet = wb.Sheets["Content Tracker"];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
const originalRange = xlsx.utils.decode_range(sheet["!ref"]);
const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false, defval: "" })[0];
for (const column of ["Print Include", "Remarks"]) if (!headers.includes(column)) headers.push(column);

const exactArtwork = {
  "ADV-001": "1 Skylark.png", "ADV-003": "3 Vistaar Finance.jpg", "ADV-007": "7 OnShore Construction Pvt Ltd .png",
  "ADV-008": "8 Roofs & Ceilings.png", "ADV-011": "11 Axelon.jpg", "ADV-013": "13a Anand Rathi.jpeg",
  "ADV-015": "15 Swaraj Shoes.jpeg", "ADV-018": "18 Eframe.jpeg", "ADV-022": "22 pratap caterer.png",
  "ADV-023": "23 Clover Blakefield Reality LLP.png"
};
const missingConfirmed = new Set(["ADV-009", "ADV-024", "ADV-025"]);
const missingUnknown = new Set(["ADV-016", "ADV-027"]);
const multiple = new Set(["ADV-002", "ADV-004", "ADV-005", "ADV-006", "ADV-010", "ADV-014", "ADV-017", "ADV-019", "ADV-020"]);

for (const row of rows) {
  const id = String(row["Item ID"] || "").trim();
  const names = String(row["Source File Name"] || "").split(";").map((v) => v.trim()).filter((v) => v && v !== "—");
  const aliasAvailable = id === "1" && fs.existsSync(path.join(projectRoot, "02_INCOMING_CONTENT", "1. Artical Sudip Mazumdar .pdf"));
  const available = aliasAvailable || names.some((name) => fs.existsSync(path.join(projectRoot, "02_INCOMING_CONTENT", name)) || fs.existsSync(path.join(projectRoot, "03_ADVERTISEMENTS", name)));
  if (!id.startsWith("ADV-")) {
    const eligible = /print and web/i.test(row.Permission) && /^approved$/i.test(row.Status) && available;
    row["Print Include"] = eligible ? "Yes" : "No";
    if (id === "1" && aliasAvailable) row.Remarks = "Unambiguous normalized filename match: 1. Artical Sudip Mazumdar .pdf";
    if (!eligible && !row.Remarks) row.Remarks = "Excluded from current print release: approval or available source requirement not met.";
    continue;
  }
  if (exactArtwork[id]) {
    if (id === "ADV-011") row["Source File Name"] = "11 Axelon.jpg; LOGO - Axelon Industries.pdf";
    if (id === "ADV-013") row["Source File Name"] = "13. anand rathi logo.png; 13a Anand Rathi.jpeg";
    row["Web Include"] = "Yes";
    row["Print Include"] = "Yes";
    row.Status = "Approved";
    row.Remarks = id === "ADV-011" ? `Preferred artwork: ${exactArtwork[id]}; separate logo file excluded.`
      : id === "ADV-013" ? `Preferred artwork: ${exactArtwork[id]}; separate logo file excluded.` : "Exact artwork available and unambiguous.";
  } else if (missingConfirmed.has(id)) {
    row["Web Include"] = "No"; row["Print Include"] = "No";
    row.Status = "Excluded – Source artwork not available";
    row.Remarks = "Sponsor acknowledgement only; confirmed company name may appear in With Thanks section.";
  } else if (missingUnknown.has(id)) {
    row["Web Include"] = "No"; row["Print Include"] = "No";
    row.Status = "Excluded – Source artwork not available";
    row.Remarks = "Excluded completely; advertiser/company name cannot be verified.";
  } else if (multiple.has(id)) {
    row["Web Include"] = "No"; row["Print Include"] = "No";
    row.Status = "Needs verification";
    row.Remarks = `Multiple distinct artwork candidates; preferred occurrence must be approved: ${names.join("; ")}`;
  } else if (id === "ADV-012") {
    row["Web Include"] = "No"; row["Print Include"] = "No"; row.Status = "Needs verification";
    row.Remarks = "Company/source spelling mismatch (Aarvi/Arvi); source match requires verification.";
  } else if (id === "ADV-021") {
    row["Web Include"] = "No"; row["Print Include"] = "No"; row.Status = "Needs verification";
    row.Remarks = "Company spelling mismatch (Bhabik/Bhavik); exclude until verified.";
  } else if (id === "ADV-026") {
    row["Web Include"] = "No"; row["Print Include"] = "No"; row.Status = "Needs verification";
    row.Remarks = "Previous-year (May 2025) artwork; explicit approval for reuse in 2026 is required.";
  } else {
    row["Web Include"] = "No"; row["Print Include"] = "No";
    row.Status = "Excluded – Source artwork not available";
    row.Remarks = "No exact unambiguous source artwork available.";
  }
}

const data = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))];
const replacement = xlsx.utils.aoa_to_sheet(data);
for (let row = 0; row <= originalRange.e.r; row++) for (let col = 0; col <= originalRange.e.c; col++) {
  const addr = xlsx.utils.encode_cell({ r: row, c: col });
  if (sheet[addr]?.s && replacement[addr]) replacement[addr].s = sheet[addr].s;
}
replacement["!cols"] = sheet["!cols"];
replacement["!rows"] = sheet["!rows"];
replacement["!merges"] = sheet["!merges"];
wb.Sheets["Content Tracker"] = replacement;
xlsx.writeFile(wb, trackerPath, { bookType: "xlsx", cellStyles: true });
console.log(`Updated ${rows.length} tracker rows; preserved sheets: ${wb.SheetNames.join(", ")}`);
