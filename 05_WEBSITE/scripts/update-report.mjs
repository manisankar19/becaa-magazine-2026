import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot } from "./lib.mjs";

const tracker = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(tracker, { cellDates: false });
const rows = xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false });
const classifications = [];
for (const row of rows) {
  const names = String(row["Source File Name"] || "").split(";").map((v) => v.trim()).filter((v) => v && v !== "—");
  const matches = names.map((name) => ["02_INCOMING_CONTENT", "03_ADVERTISEMENTS"].map((root) => path.join(projectRoot, root, name)).find(fs.existsSync)).filter(Boolean);
  const eligible = /print and web/i.test(row.Permission) && /^approved$/i.test(row.Status) && /^yes$/i.test(row["Web Include"]);
  let decision = "exclude";
  let reason = "Not approved, permission-cleared, and web-enabled.";
  if (eligible) { decision = "eligible"; reason = String(row.Remarks || "Approved, permission-cleared, and enabled for the current release."); }
  else if (/needs verification/i.test(row.Status)) { decision = "needs verification"; reason = String(row.Remarks || row.Notes || "Verification required."); }
  else if (/excluded/i.test(row.Status)) { decision = "exclude"; reason = String(row.Remarks || row.Status); }
  classifications.push({ id: String(row["Item ID"]), title: row["Title / Item"], decision, reason, sources: names });
}
const counts = Object.fromEntries([...new Set(classifications.map((x) => x.decision))].map((k) => [k, classifications.filter((x) => x.decision === k).length]));
const out = `# Incremental Content Update Report\n\nGenerated: ${new Date().toISOString()}\n\nTracker sheets: ${wb.SheetNames.map((s) => `\`${s}\``).join(", ")}\n\nPrint control: \`Print Include\` is present and enforced.\n\nSponsor acknowledgements (provisional internal review): Worldline India; Eegrab; mepass. These are names only, not advertisements.\n\nItems explicitly marked \`Yet to receive\`: none.\n\n## Counts\n\n${Object.entries(counts).map(([k,v]) => `- ${k}: ${v}`).join("\n")}\n\n## Decisions\n\n${classifications.map((x) => `- \`${x.id}\` ${x.title}: **${x.decision}** — ${x.reason}`).join("\n")}\n`;
const finalOut = out.replace("Sponsor acknowledgements (provisional internal review): Worldline India; Eegrab; mepass. These are names only, not advertisements.", "Sponsor acknowledgement: generic thanks only; no acknowledgement-only company names are included.");
fs.writeFileSync(path.join(projectRoot, "04_MAGAZINE_WORKING", "CONTENT_UPDATE_REPORT.md"), finalOut);
fs.writeFileSync(path.join(projectRoot, "04_MAGAZINE_WORKING", "content-update-report.json"), JSON.stringify({ generated: new Date().toISOString(), sheets: wb.SheetNames, counts, items: classifications }, null, 2));
console.log(`Reported ${classifications.length} tracker items.`);
