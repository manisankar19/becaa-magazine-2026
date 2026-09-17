import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config.mjs";
import { siteRoot, readManifest, pathInsideSite } from "./lib.mjs";
import { validateAdvertisementPresentation, resolveInk } from "./ad-presentation-core.mjs";
import { findControlCharacters } from "./content-encoding-core.mjs";

const report = { generated: new Date().toISOString(), errors: [], warnings: [], items: [] };
const manifest = readManifest();
const ids = new Set();

function err(message) { report.errors.push(message); }
function warn(message) { report.warnings.push(message); }

// Sprint v4 (sprints/v4/PRD.md §4.3, Decision E): text-only advertisements
// intentionally have no source artwork at all — the fact is recorded in
// `notes` rather than a real source_file/source_fingerprint/alt, so those
// three fields are not "missing", they are meaningless for this presentation
// kind and are exempted from the general required-field rule. `artwork` and
// `memorial` advertisements (which do have a real source photograph) keep
// the full requirement.
const TEXT_PRESENTATION_EXEMPT_FIELDS = new Set(["source_file", "source_fingerprint", "alt"]);

if (!manifest.items || !Array.isArray(manifest.items)) err("Manifest items must be an array.");

for (const item of manifest.items || []) {
  report.items.push({ id: item.id, type: item.type, title: item.title });
  const isTextAd = item.type === "advertisement" && item.presentation === "text";
  for (const field of config.requiredFields) {
    if (isTextAd && TEXT_PRESENTATION_EXEMPT_FIELDS.has(field)) continue;
    if (item[field] === undefined || item[field] === null || String(item[field]).trim() === "") err(`${item.id || "(missing id)"} missing required field: ${field}`);
  }
  if (ids.has(item.id)) err(`Duplicate manifest ID: ${item.id}`);
  ids.add(item.id);
  if (!config.allowedTypes.includes(item.type)) err(`${item.id} has unsupported type: ${item.type}`);
  if (!config.allowedLanguages.includes(item.language)) err(`${item.id} has unsupported language: ${item.language}`);
  if (item.verification !== "verified") warn(`${item.id} is ${item.verification}; allowed only as a labelled local prototype, not public release.`);
  if (/TBD|TODO|Needs verification/i.test(JSON.stringify(item))) warn(`${item.id} contains unresolved prototype/verification language.`);

  // Sprint v3: published advertisement title wording, page background fields, and text contrast.
  for (const message of validateAdvertisementPresentation(item)) err(message);
  if (item.type === "advertisement" && (item.web_include || item.print_include)) {
    const ink = resolveInk(item);
    Object.assign(report.items.at(-1), {
      page_background: item.page_background ?? null,
      page_background_mode: item.page_background_mode ?? "auto",
      page_ink: ink ? ink.ink : null,
      contrast_ratio: ink ? Number(ink.ratio.toFixed(2)) : null
    });
  }

  if (item.content_file) {
    const rel = path.join("src", "content", item.content_file);
    if (!pathInsideSite(rel)) err(`${item.id} content path escapes site: ${item.content_file}`);
    const abs = path.join(siteRoot, rel);
    if (!fs.existsSync(abs)) err(`${item.id} missing content file: ${item.content_file}`);
    else {
      const text = fs.readFileSync(abs, "utf8");
      if (/<!--\s*NEEDS VERIFICATION/i.test(text)) warn(`${item.id} content has extraction verification comment.`);
      // Sprint v4 Task 42: control characters print as missing-glyph boxes (release-blocking).
      for (const c of findControlCharacters(text)) err(`${item.id} content has control character ${c.codePoint} at line ${c.line}, column ${c.column}: ${item.content_file}`);
    }
  }
  for (const key of ["web_asset", "print_asset"]) {
    if (!item[key]) continue;
    const rel = item[key].replace(/^\//, "");
    const abs = path.join(siteRoot, "src", rel);
    if (!pathInsideSite(path.join("src", rel))) err(`${item.id} asset path escapes site: ${item[key]}`);
    if (!fs.existsSync(abs)) err(`${item.id} missing asset: ${item[key]}`);
    else {
      try {
        const meta = await sharp(abs).metadata();
        if (!meta.width || !meta.height) err(`${item.id} missing image dimensions: ${item[key]}`);
        if (key === "print_asset" && meta.width < config.print.a4WidthPxAt300Dpi * 0.45) warn(`${item.id} print asset may be low resolution for A4: ${meta.width} px wide.`);
      } catch (error) {
        err(`${item.id} cannot inspect image asset ${item[key]}: ${error.message}`);
      }
    }
  }
}

fs.writeFileSync(path.join(siteRoot, "validation-report.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(
  path.join(siteRoot, "validation-summary.md"),
  `# Validation Summary

Generated: ${report.generated}

- Errors: ${report.errors.length}
- Warnings: ${report.warnings.length}

## Errors

${report.errors.map((e) => `- ${e}`).join("\n") || "- None"}

## Warnings

${report.warnings.map((w) => `- ${w}`).join("\n") || "- None"}
`,
  "utf8"
);

if (report.errors.length) {
  console.error(report.errors.join("\n"));
  process.exit(1);
}
console.log(`Validation passed with ${report.warnings.length} warning(s).`);
