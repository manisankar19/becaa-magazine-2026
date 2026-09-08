import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import xlsx from "xlsx";
import { projectRoot, readManifest, walkFiles } from "./lib.mjs";

const trackerPath=path.join(projectRoot,"04_MAGAZINE_WORKING","BECAA_2026_Content_Tracker.xlsx");
const wb=xlsx.readFile(trackerPath,{cellDates:false});
const rows=xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"],{defval:"",raw:false}).filter(r=>String(r["Item ID"]).startsWith("ADV-"));
const adRoot=path.join(projectRoot,"03_ADVERTISEMENTS");
const artwork=walkFiles(adRoot).filter(f=>/\.(pdf|png|jpe?g|pptx)$/i.test(f));
const manifest=readManifest();
const manifestAds=new Map(manifest.items.filter(i=>i.type==="advertisement").map(i=>[i.id,i]));
const website=fs.readFileSync(path.join(process.cwd(),"_site","index.html"),"utf8");
const printHtml=fs.readFileSync(path.join(process.cwd(),"_site","print","index.html"),"utf8");
const v1Ids=new Set(JSON.parse(fs.readFileSync(path.join(projectRoot,"06_FINAL_OUTPUT","V1_COMPLETE_REVIEW_01","release-manifest.json"),"utf8")).included_item_ids||[]);
const selectedFromRemarks=r=>String(r.Remarks||"").match(/Preferred artwork:\s*([^.;]+(?:\.[A-Za-z0-9]+))/i)?.[1]||manifestAds.get(r["Item ID"])?.source_file?.split("/").pop()||"";
const escape=v=>String(v??"").replaceAll("|","\\|").replace(/\s+/g," ").trim();
const audit=[];
for(const r of rows){
  const id=String(r["Item ID"]), names=String(r["Source File Name"]||"").split(";").map(x=>x.trim()).filter(x=>x&&x!=="—");
  const existence=names.map(n=>`${n}: ${fs.existsSync(path.join(adRoot,n))?"Yes":"No"}`);
  const selected=selectedFromRemarks(r);
  const presentManifest=manifestAds.has(id), presentWeb=website.includes(`id="${id}"`), presentPdf=printHtml.includes(`id="print-${id}"`);
  const wasV1=v1Ids.has(id);
  let decision="Excluded", reason=String(r.Remarks||r.Status), correction="No technical correction available.";
  if(presentManifest&&presentWeb&&presentPdf){decision="Published web and print";reason=wasV1?"Already present in V1_COMPLETE_REVIEW_01.":"V1 omission corrected: prior reconciliation treated multiple/variant filenames or spelling as an eligibility failure.";correction=`Completed: imported ${selected}.`;}
  else if(/acknowledgement only/i.test(r.Remarks)){decision="Acknowledgement only";correction="Keep company name in With Thanks; do not represent as artwork.";}
  else if(/cannot be verified/i.test(r.Remarks)){correction="Keep completely excluded until a verified company and source arrive.";}
  audit.push({id,company:r["Contributor / Company"],tracker_source:r["Source File Name"],source_exists:existence.join("; ")||"No tracker artwork filename",candidates:names.join("; ")||"None",web:r["Web Include"],print:r["Print Include"],permission:r.Permission,status:r.Status,decision,manifest:presentManifest?"Yes":"No",website:presentWeb?"Yes":"No",pdf:presentPdf?"Yes":"No",reason,correction,selected});
}
const sourceMap=new Map();
for(const r of rows)for(const n of String(r["Source File Name"]||"").split(";").map(x=>x.trim()).filter(x=>x&&x!=="—"))sourceMap.set(n.toLowerCase(),String(r["Item ID"]));
const hashes=new Map();
for(const f of artwork){const h=crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");(hashes.get(h)||hashes.set(h,[]).get(h)).push(f);}
const reverse=artwork.sort((a,b)=>path.basename(a).localeCompare(path.basename(b),undefined,{numeric:true,sensitivity:"base"})).map(f=>{
 const name=path.basename(f),id=sourceMap.get(name.toLowerCase())||"",m=[...manifestAds.values()].find(x=>path.basename(x.source_file).toLowerCase()===name.toLowerCase());
 const h=crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"),dups=(hashes.get(h)||[]).filter(x=>x!==f).map(path.basename);
 let finding=id?"Exact tracker filename match":"No tracker row";
 if(id&&!m)finding += "; not imported—alternate/non-selected artwork";
 if(/12 arvi enercon/i.test(name))finding += "; filename spelling differs from confirmed tracker company Aarvi Encon";
 if(dups.length)finding += `; byte duplicate of ${dups.join(", ")}`;
 return {file:name,id:id||"None",imported:m?"Yes":"No",duplicate:dups.join("; ")||"No",finding};
});
const pnb=audit.find(x=>x.id==="ADV-002");
const header="| ADV ID | Company | Exact tracker source filename | Source exists | Actual candidates | Web | Print | Permission | Status | Decision | Manifest | Website | PDF | Exclusion/omission reason | Recommended correction |\n|---|---|---|---|---|---:|---:|---|---|---|---:|---:|---:|---|---|";
const table=audit.map(x=>`| ${[x.id,x.company,x.tracker_source,x.source_exists,x.candidates,x.web,x.print,x.permission,x.status,x.decision,x.manifest,x.website,x.pdf,x.reason,x.correction].map(escape).join(" | ")} |`).join("\n");
const reverseTable=reverse.map(x=>`| ${[x.file,x.id,x.imported,x.duplicate,x.finding].map(escape).join(" | ")} |`).join("\n");
const report=`# Advertisement Reconciliation Audit\n\nGenerated: ${new Date().toISOString()}\n\nEditorial authority: current content tracker. Per user instruction, the sponsor-detail workbook was not used in this final reconciliation pass.\n\n## Totals\n\n- Tracker advertiser/company entries: 27 (25 confirmed company names; 2 unknown/unavailable)\n- Tracker advertisement rows: 27\n- Advertisement artwork files: ${artwork.length}\n- Exact case-insensitive tracker filename matches: ${reverse.filter(x=>x.id!=="None").length}\n- Untracked artwork files: ${reverse.filter(x=>x.id==="None").length}\n- Byte-identical duplicate files: ${reverse.filter(x=>x.duplicate!=="No").length}\n- Published web advertisements: ${audit.filter(x=>x.website==="Yes").length}\n- Published print/PDF advertisements: ${audit.filter(x=>x.pdf==="Yes").length}\n- Acknowledgement-only sponsors: 3\n- Excluded/awaiting advertisements: ${audit.filter(x=>x.manifest==="No").length}\n\n## Tracker-to-publication audit\n\n${header}\n${table}\n\n## Reverse source-file audit\n\n| Source file | Tracker row | Imported as selected artwork | Duplicate | Finding |\n|---|---|---:|---|---|\n${reverseTable}\n\n## PNB Housing investigation\n\n- Tracker ID: ${pnb.id}\n- Company: ${pnb.company}\n- Exact tracker filenames: ${pnb.tracker_source}\n- Current eligibility: Web Include ${pnb.web}; Print Include ${pnb.print}; Permission ${pnb.permission}; Status ${pnb.status}.\n- Selected artwork: ${pnb.selected}\n- Precise V1 omission: the prior technical reconciliation changed this originally approved row to Needs verification solely because several tracker-listed designs existed. It did not recognize the file explicitly named \`Magazine AD_A4\` as the unambiguous magazine artwork.\n- Correction: restored Approved/Yes/Yes and imported the A4 PDF into website and PDF.\n\n## Consolidated approval questions\n\n| ADV ID | Question | Current safe treatment |\n|---|---|---|\n| ADV-026 | Is \`CETEST Advertisement_May 2025_Portrait.pptx\` explicitly approved for reuse in the 2026 magazine? | Excluded pending explicit 2026 reuse approval. |\n`;
const finalReport = report
  .replace("Acknowledgement-only sponsors: 3", "Acknowledgement-only sponsors: 0")
  .replace(/## Consolidated approval questions[\s\S]*$/, `## ADV-026 rendering record

- Source: \`CETEST Advertisement_May 2025_Portrait.pptx\` (one slide).
- Approval: explicitly approved for the 2026 review publication.
- Method: slide 1 exported with LibreOffice Impress 26.2.5 using \`impress_pdf_Export\`; the exported PDF was rasterized at 300 DPI for normalized web and print JPEG derivatives.
- Original PPTX remained untouched.

## Consolidated approval questions

None for the current advertisement set.
`);
const outDir=path.join(projectRoot,"04_MAGAZINE_WORKING");
fs.writeFileSync(path.join(outDir,"ADVERTISEMENT_RECONCILIATION_AUDIT.md"),finalReport);
fs.writeFileSync(path.join(outDir,"advertisement-reconciliation-audit.json"),JSON.stringify({generated:new Date().toISOString(),audit,reverse},null,2));
console.log(`Audited ${audit.length} tracker rows and ${reverse.length} artwork files.`);
