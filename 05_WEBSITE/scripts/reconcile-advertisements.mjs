import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const selected = {
  "ADV-001":"1 Skylark.png", "ADV-002":"2 d PNB FD Magazine AD_A4-01.pdf", "ADV-003":"3 Vistaar Finance.jpg",
  "ADV-004":"4 Gainwell Technologies.jpg", "ADV-005":"5a Tata Capital ltd. (Retail Finance).jpg", "ADV-006":"6 d tata capital.pdf",
  "ADV-007":"7 OnShore Construction Pvt Ltd .png", "ADV-008":"8 Roofs & Ceilings.png", "ADV-010":"10 Indus Grand.jpeg",
  "ADV-011":"11 Axelon.jpg", "ADV-012":"12 arvi enercon.jpeg", "ADV-013":"13a Anand Rathi.jpeg",
  "ADV-014":"14 a future netwings.pdf", "ADV-015":"15 Swaraj Shoes.jpeg", "ADV-017":"17 UREDCONNECT.jpeg",
  "ADV-018":"18 Eframe.jpeg", "ADV-019":"19 Network Techlabs.png", "ADV-020":"20 b Schnelltech Global.pdf",
  "ADV-021":"21 Bhavik.jpeg", "ADV-022":"22 pratap caterer.png", "ADV-023":"23 Clover Blakefield Reality LLP.png"
};
const reasons = {
  "ADV-002":"Selected full-page A4 file explicitly named Magazine AD; other PNB files are alternate designs/logo.",
  "ADV-004":"Selected primary company artwork; CAT image is supplemental alternate artwork.",
  "ADV-005":"Selected full-page retail-finance artwork; base file is logo-only.",
  "ADV-006":"Selected full portrait PDF advertisement; JPG files are alternate banners/placements.",
  "ADV-010":"Selected full advertisement; 10a is logo-only.",
  "ADV-012":"Exact tracker file exists; artwork and sponsor workbook confirm Aarvi Encon despite filename spelling.",
  "ADV-014":"Selected full-page PDF; PNG files are logo/raster derivative alternatives.",
  "ADV-017":"Selected primary numbered advertisement; 17a is an alternate design.",
  "ADV-019":"Selected primary numbered artwork; 19A is an alternate banner.",
  "ADV-020":"Selected full magazine PDF; base file is logo-only and 20a is a raster derivative."
  ,"ADV-021":"Company name corrected to Bhavik from the name displayed in the approved artwork, per user authorization."
};
const wb = xlsx.readFile(trackerPath, { cellDates: false, cellStyles: true, bookVBA: true });
const sheet = wb.Sheets["Content Tracker"];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
const headers = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false, defval: "" })[0];
for (const row of rows) {
  const id = String(row["Item ID"] || "");
  if (!selected[id]) continue;
  const abs = path.join(projectRoot, "03_ADVERTISEMENTS", selected[id]);
  if (!fs.existsSync(abs)) throw new Error(`${id} selected artwork is missing: ${selected[id]}`);
  row.Status = "Approved"; row["Web Include"] = "Yes"; row["Print Include"] = "Yes";
  if (id === "ADV-021") { row["Title / Item"] = "Bhavik Advertisement"; row["Contributor / Company"] = "Bhavik"; }
  row.Remarks = `Preferred artwork: ${selected[id]}. ${reasons[id] || "Exact available artwork matched to tracker row."}`;
}
const oldRange = xlsx.utils.decode_range(sheet["!ref"]);
const replacement = xlsx.utils.aoa_to_sheet([headers, ...rows.map((row) => headers.map((h) => row[h] ?? ""))]);
for (let r=0;r<=oldRange.e.r;r++) for(let c=0;c<=oldRange.e.c;c++){const a=xlsx.utils.encode_cell({r,c});if(sheet[a]?.s&&replacement[a])replacement[a].s=sheet[a].s;}
replacement["!cols"]=sheet["!cols"]; replacement["!rows"]=sheet["!rows"]; replacement["!merges"]=sheet["!merges"];
wb.Sheets["Content Tracker"] = replacement;
xlsx.writeFile(wb, trackerPath, { bookType:"xlsx", cellStyles:true });
console.log(`Reconciled ${Object.keys(selected).length} approved advertisements.`);
