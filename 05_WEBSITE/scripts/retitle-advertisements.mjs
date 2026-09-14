import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { projectRoot, siteRoot, readManifest } from "./lib.mjs";
import { retitleAdvertisements } from "./advertisement-title-core.mjs";
import { openTracker, readSheetRows, writeSheetPreservingStyles, saveTracker, snapshotTracker, SHEET_NAME } from "./tracker-io.mjs";

// Sprint v3 Task 7 (sprints/v3/PRD.md §4.3, approved 2026-09-14): retitle every
// published advertisement to "With best compliments from [Company Name]" in
// publication.yaml (targeted title-line replacement) and in the tracker's
// "Title / Item" column (snapshot first, styles preserved). IDs, alt text,
// source artwork, normalized filenames and excluded rows are never touched.

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
export const TRACKER_NOTE = 'Sprint v3 (2026-09-14): public display title changed to "With best compliments from [Company]" per sprints/v3/PRD.md §4.3; artwork, source file and normalized files unchanged.';

function yamlTitleLine(title) {
  // Use js-yaml's own scalar quoting so the replacement matches the file's conventions.
  return `    ${yaml.dump({ title }, { lineWidth: 120 }).trimEnd()}`;
}

export function retitleAdvertisementsOnDisk() {
  const manifest = readManifest();
  const workbook = openTracker();
  const { headers, rows } = readSheetRows(workbook, SHEET_NAME);

  const { items, changes } = retitleAdvertisements(manifest.items, rows);
  if (changes.length === 0) {
    console.log("All published advertisement titles already use the compliments wording; nothing to do.");
    return { changes };
  }

  // --- manifest: replace exactly one title line per change ---
  let text = fs.readFileSync(manifestPath, "utf8");
  for (const change of changes) {
    const oldLine = yamlTitleLine(change.from);
    const newLine = yamlTitleLine(change.to);
    if (text.split(`\n${oldLine}\n`).length !== 2) {
      throw new Error(`${change.id}: expected exactly one manifest line "${oldLine.trim()}" (aborting, nothing written)`);
    }
    text = text.replace(`\n${oldLine}\n`, `\n${newLine}\n`);
  }

  // --- tracker: same IDs only, snapshot first ---
  const changeById = new Map(changes.map((c) => [c.id, c]));
  const updatedRows = rows.map((row) => {
    const change = changeById.get(String(row["Item ID"]).trim());
    if (!change) return row;
    const updated = { ...row, "Title / Item": change.to };
    updated.Remarks = [row.Remarks, TRACKER_NOTE].filter(Boolean).join(" ").trim();
    return updated;
  });

  const snapshotPath = snapshotTracker("pre-v3-ad-retitle");
  console.log(`Backup created: ${path.relative(projectRoot, snapshotPath)}`);
  fs.writeFileSync(manifestPath, text, "utf8");
  readManifest(); // re-parse: still valid YAML
  writeSheetPreservingStyles(workbook, SHEET_NAME, headers, updatedRows);
  saveTracker(workbook);

  for (const c of changes) console.log(`  ${c.id}: "${c.from}" -> "${c.to}"`);
  console.log(`Retitled ${changes.length} advertisement(s) in publication.yaml and the tracker.`);
  return { changes, items };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  retitleAdvertisementsOnDisk();
}
