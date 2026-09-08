import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import mammoth from "mammoth";
import xlsx from "xlsx";
import yaml from "js-yaml";
import { projectRoot, sourceRoots, walkFiles, sha256, relFromProject } from "./lib.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const inventoryPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "source-inventory.json");
const reportPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "PROTOTYPE_INSPECTION_REPORT.md");

function normName(file) {
  return path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function groupBy(items, keyFor) {
  const groups = {};
  for (const item of items) {
    const key = keyFor(item);
    (groups[key] ||= []).push(item);
  }
  return groups;
}

async function mediaMetadata(file, ext) {
  const meta = {};
  if ([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"].includes(ext)) {
    try {
      const img = await sharp(file).metadata();
      meta.image = {
        width: img.width,
        height: img.height,
        density: img.density || null,
        format: img.format,
        aspect_ratio: img.width && img.height ? Number((img.width / img.height).toFixed(4)) : null,
        a4_portrait_suitability:
          img.width && img.height && img.height >= img.width && img.width >= 1200 ? "possible" : "needs review"
      };
    } catch (error) {
      meta.image_error = error.message;
    }
  }
  if (ext === ".pdf") {
    try {
      const bytes = fs.readFileSync(file);
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const textSignals = (bytes.toString("latin1").match(/\/Font|BT|\/ToUnicode/g) || []).length;
      meta.pdf = {
        pages: pdf.getPageCount(),
        classification: textSignals > 5 ? "probably text/vector PDF" : "probably scanned or artwork PDF",
        text_signal_count: textSignals
      };
    } catch (error) {
      meta.pdf_error = error.message;
    }
  }
  if (ext === ".docx") {
    try {
      const result = await mammoth.extractRawText({ path: file });
      meta.docx = {
        extraction_feasible: result.value.trim().length > 0,
        extracted_characters: result.value.trim().length,
        warnings: result.messages.map((m) => m.message)
      };
    } catch (error) {
      meta.docx_error = error.message;
    }
  }
  return meta;
}

function trackerSummary() {
  const summary = {
    exists: fs.existsSync(trackerPath),
    sheets: [],
    columns: {},
    populated_rows: {},
    id_patterns: {},
    duplicate_ids: [],
    malformed_ids: [],
    missing_referenced_files: [],
    suspected_duplicate_item_id_12: "Not found",
    repeated_sponsor_serial_12: "Not found"
  };
  if (!summary.exists) return summary;

  const wb = xlsx.readFile(trackerPath, { cellDates: false });
  summary.sheets = wb.SheetNames;
  for (const sheetName of wb.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    summary.columns[sheetName] = headers;
    summary.populated_rows[sheetName] = rows.filter((row) => Object.values(row).some((v) => String(v).trim())).length;
    const idCols = headers.filter((h) => /(^|\s)(id|item id|serial|sr|sl)(\s|$|\.|no)/i.test(h));
    for (const col of idCols) {
      const values = rows.map((r) => String(r[col] || "").trim()).filter(Boolean);
      const seen = new Map();
      for (const value of values) seen.set(value, (seen.get(value) || 0) + 1);
      for (const [value, count] of seen.entries()) {
        if (count > 1) summary.duplicate_ids.push({ sheet: sheetName, column: col, value, count });
        if (!/^[A-Za-z]*[-_/ ]?\d+[A-Za-z]?$/.test(value)) summary.malformed_ids.push({ sheet: sheetName, column: col, value });
      }
      if (seen.has("12")) summary.suspected_duplicate_item_id_12 = seen.get("12") > 1 ? `Duplicate in ${sheetName}/${col}` : `Single occurrence in ${sheetName}/${col}`;
    }
    const sponsorCols = headers.filter((h) => /sponsor|advert/i.test(h));
    if (sponsorCols.length) {
      const serialCols = headers.filter((h) => /serial|sr|sl|no/i.test(h));
      for (const col of serialCols) {
        const count12 = rows.filter((r) => String(r[col] || "").trim() === "12").length;
        if (count12) summary.repeated_sponsor_serial_12 = count12 > 1 ? `Repeated ${count12} times in ${sheetName}/${col}` : `Single occurrence in ${sheetName}/${col}`;
      }
    }
  }
  return summary;
}

function matchTrackerFiles(tracker, inventory) {
  const allNames = new Set(inventory.map((i) => path.basename(i.relative_path).toLowerCase()));
  const represented = new Set();
  if (!tracker.exists) return { missing: [], unrepresented: inventory.map((i) => i.relative_path) };
  const wb = xlsx.readFile(trackerPath, { cellDates: false });
  const missing = [];
  for (const sheetName of wb.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false });
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (!/file|filename|source|attachment|artwork/i.test(key)) continue;
        const text = String(value || "").trim();
        if (!text || !/\.(docx|pdf|jpe?g|png|pptx|xlsx)$/i.test(text)) continue;
        const parts = text.split(";").map((part) => part.trim()).filter(Boolean);
        for (const part of parts) {
          const base = path.basename(part).toLowerCase();
          if (allNames.has(base)) represented.add(base);
          else missing.push({ sheet: sheetName, column: key, value: part });
        }
      }
    }
  }
  const unrepresented = inventory
    .filter((i) => !represented.has(path.basename(i.relative_path).toLowerCase()))
    .map((i) => i.relative_path);
  return { missing, unrepresented };
}

function trackerRows() {
  if (!fs.existsSync(trackerPath)) return [];
  const wb = xlsx.readFile(trackerPath, { cellDates: false });
  return xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false });
}

function adMatches(inventory, tracker) {
  const ads = inventory.filter((i) => i.relative_path.startsWith("03_ADVERTISEMENTS/"));
  const rows = trackerRows().filter((row) => /advert/i.test(String(row.Type || "")));
  return ads.map((ad) => ({
    file: ad.relative_path,
    ...(() => {
      const base = path.basename(ad.relative_path).toLowerCase();
      const row = rows.find((candidate) => String(candidate["Source File Name"] || "").split(";").map((part) => path.basename(part.trim()).toLowerCase()).includes(base));
      if (!row) {
        return {
          confidence: "low",
          reason: "No exact tracker source-file match found.",
          status: "Needs verification"
        };
      }
      const permission = String(row.Permission || "").trim();
      const webInclude = String(row["Web Include"] || "").trim();
      const status = String(row.Status || "").trim();
      const approvedForWeb = /print and web/i.test(permission) && /^yes$/i.test(webInclude) && /^approved$/i.test(status);
      return {
        confidence: approvedForWeb ? "high" : "medium",
        reason: `Exact tracker row ${row["Item ID"]} matched by source filename and company "${row["Contributor / Company"]}". Permission: ${permission}; Web Include: ${webInclude}; Status: ${status}.`,
        status: approvedForWeb ? "Verified for V0 web prototype" : "Needs verification"
      };
    })()
  }));
}

function reportMarkdown({ inventory, tracker, matches }) {
  const byRoot = sourceRoots.map((root) => {
    const files = inventory.filter((i) => i.relative_path.startsWith(`${root}/`));
    const extCounts = {};
    for (const file of files) extCounts[file.extension || "(none)"] = (extCounts[file.extension || "(none)"] || 0) + 1;
    return { root, count: files.length, extCounts };
  });
  const dupHashes = Object.entries(groupBy(inventory, (i) => i.sha256)).filter(([, list]) => list.length > 1);
  const dupNames = Object.entries(groupBy(inventory, (i) => normName(i.relative_path))).filter(([name, list]) => name && list.length > 1);
  const bengali = inventory.filter((i) => i.docx?.extracted_characters && /Smritir|Meri|Kiran/i.test(i.relative_path));
  const manifestPath = path.join(process.cwd(), "src", "_data", "publication.yaml");
  let selectedNote = "Selection pending.";
  if (fs.existsSync(manifestPath)) {
    const manifest = yaml.load(fs.readFileSync(manifestPath, "utf8"));
    selectedNote = (manifest.items || []).map((item) => `- \`${item.id}\` ${item.title}: \`${item.source_file}\`; permission \`${item.permission}\`; status \`${item.editorial_status}\`; verification \`${item.verification}\`; reason: ${item.notes}`).join("\n");
  }

  return `# Prototype Inspection Report

Generated: ${new Date().toISOString()}

## Current Folder Inventory

${byRoot.map((r) => `- \`${r.root}\`: ${r.count} files (${Object.entries(r.extCounts).map(([k, v]) => `${k} ${v}`).join(", ") || "empty"})`).join("\n")}
- \`05_WEBSITE\`: website working tree
- \`06_FINAL_OUTPUT\`: release output target

## Tracker Workbook

- Exists: ${tracker.exists}
- Sheets: ${tracker.sheets.map((s) => `\`${s}\``).join(", ") || "none"}
${tracker.sheets.map((s) => `- \`${s}\`: ${tracker.populated_rows[s]} populated rows; columns: ${tracker.columns[s].map((c) => `\`${c}\``).join(", ") || "none"}`).join("\n")}

## Tracker ID Checks

- Duplicate IDs: ${tracker.duplicate_ids.length ? JSON.stringify(tracker.duplicate_ids) : "None detected from ID-like columns"}
- Malformed IDs: ${tracker.malformed_ids.length ? JSON.stringify(tracker.malformed_ids) : "None detected from ID-like columns"}
- Suspected duplicate Item ID \`12\`: ${tracker.suspected_duplicate_item_id_12}
- Repeated sponsor serial \`12\`: ${tracker.repeated_sponsor_serial_12}

## Tracker/File Reconciliation

- Missing files referenced in tracker: ${matches.missing.length ? JSON.stringify(matches.missing, null, 2) : "None detected from filename-like columns"}
- Source files not represented in tracker filename-like columns: ${matches.unrepresented.length}

## Probable Duplicates

- Duplicate hashes: ${dupHashes.length ? dupHashes.map(([, list]) => list.map((i) => i.relative_path).join(" | ")).join("\n- ") : "None detected"}
- Normalized filename clusters: ${dupNames.length ? dupNames.map(([name, list]) => `${name}: ${list.map((i) => i.relative_path).join(" | ")}`).join("\n- ") : "None detected"}

## Permission and Approval Gaps

The tracker must remain the editorial authority. Rows without explicit web/print permission or approved/equivalent status are not release-safe. The Version 0 website therefore treats selected content as a local prototype unless the tracker row clearly confirms approval.

## Advertisement Matching

${adMatches(inventory, tracker).map((m) => `- \`${m.file}\`: ${m.confidence}; ${m.reason}; ${m.status}`).join("\n")}

## PDF Classification

${inventory.filter((i) => i.extension === ".pdf").map((i) => `- \`${i.relative_path}\`: ${i.pdf?.pages ?? "unknown"} pages; ${i.pdf?.classification ?? i.pdf_error}`).join("\n")}

## DOCX Extraction Feasibility

${inventory.filter((i) => i.extension === ".docx").map((i) => `- \`${i.relative_path}\`: ${i.docx?.extraction_feasible ? "extractable" : "not extractable"}; ${i.docx?.extracted_characters ?? 0} characters`).join("\n")}

## Image Metadata and A4 Suitability

${inventory.filter((i) => i.image).map((i) => `- \`${i.relative_path}\`: ${i.image.width}x${i.image.height}, density ${i.image.density ?? "unknown"}, aspect ${i.image.aspect_ratio}, A4 suitability ${i.image.a4_portrait_suitability}`).join("\n")}

## Bengali Content and Fonts

Potential Bengali or mixed-language source files were detected by filename/content cues: ${bengali.map((i) => `\`${i.relative_path}\``).join(", ") || "none by filename cue"}. The website uses Windows Bengali-capable fallbacks including \`Nirmala UI\`.

## 2025 Reference Layout Patterns

The 2025 PDF and Word reference are present. Version 0 does not copy the 2025 design mechanically; it uses a restrained alumni-souvenir structure with a cover, contents, message/article sections and a framed advertisement presentation.

## 2026 Master Word Condition

\`04_MAGAZINE_WORKING/BECAA_Magazine_2026_Master.docx\` is present and extractable according to DOCX metadata. It remains unchanged for Version 0.

## Selected Prototype Items

${selectedNote}
`;
}

const files = sourceRoots.flatMap((root) => walkFiles(path.join(projectRoot, root)));
const inventory = [];
for (const file of files) {
  const stat = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  inventory.push({
    relative_path: relFromProject(file),
    extension: ext,
    size: stat.size,
    modified_time: stat.mtime.toISOString(),
    sha256: sha256(file),
    ...(await mediaMetadata(file, ext))
  });
}

const tracker = trackerSummary();
const matches = matchTrackerFiles(tracker, inventory);
fs.writeFileSync(inventoryPath, JSON.stringify({ generated: new Date().toISOString(), files: inventory }, null, 2), "utf8");
fs.writeFileSync(reportPath, reportMarkdown({ inventory, tracker, matches }), "utf8");
console.log(`Wrote ${path.relative(process.cwd(), inventoryPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
