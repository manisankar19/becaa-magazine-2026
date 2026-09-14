import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config.mjs";
import { siteRoot, readManifest } from "./lib.mjs";
import { edgeRegions, edgeColourFromStats, manifestFieldsFor, insertAdvertisementFields } from "./ad-background-core.mjs";

// Sprint v3 Task 11 (sprints/v3/PRD.md §4.4, Decision F): for every published
// advertisement whose page_background_mode is absent or "auto", sample the
// dominant edge colour of its print asset and record page_background /
// page_background_mode / page_ink in publication.yaml. Items marked "manual"
// or "none" are never touched. Idempotent: unchanged values write nothing.
// The artwork itself is only read, never modified.

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");

export async function sampleEdgeColour(assetAbsPath) {
  const image = sharp(assetAbsPath);
  const { width, height } = await image.metadata();
  const stats = [];
  for (const region of edgeRegions(width, height, config.advertisementPage.edgeSampleFraction)) {
    stats.push(await sharp(assetAbsPath).extract(region).stats());
  }
  return edgeColourFromStats(stats);
}

export async function sampleAdvertisementBackgrounds() {
  const manifest = readManifest();
  let text = fs.readFileSync(manifestPath, "utf8");
  const written = [];
  const skipped = [];
  for (const item of manifest.items) {
    if (item.type !== "advertisement" || !(item.web_include || item.print_include)) continue;
    const mode = item.page_background_mode ?? "auto";
    if (mode !== "auto") { skipped.push(`${item.id} (${mode})`); continue; }
    const asset = path.join(siteRoot, "src", item.print_asset.replace(/^\//, ""));
    const hex = await sampleEdgeColour(asset);
    const fields = manifestFieldsFor(hex);
    const unchanged = item.page_background === fields.page_background && item.page_background_mode === "auto" && item.page_ink === fields.page_ink;
    if (unchanged) continue;
    text = insertAdvertisementFields(text, item.id, fields);
    written.push({ id: item.id, ...fields });
  }
  if (written.length) {
    fs.writeFileSync(manifestPath, text, "utf8");
    readManifest(); // re-parse: still valid YAML
  }
  return { written, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { written, skipped } = await sampleAdvertisementBackgrounds();
  for (const w of written) console.log(`  ${w.id}: ${w.page_background} (ink ${w.page_ink})`);
  if (skipped.length) console.log(`Left untouched (manual/none): ${skipped.join(", ")}`);
  console.log(written.length ? `Wrote ${written.length} advertisement background(s) to publication.yaml.` : "All auto advertisement backgrounds already up to date.");
}
