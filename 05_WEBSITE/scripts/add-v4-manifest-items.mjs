import fs from "node:fs";
import path from "node:path";
import { projectRoot, siteRoot, sha256, readManifest } from "./lib.mjs";
import { buildManifestItemBlock } from "./manifest-item-yaml-core.mjs";

// Sprint v4 Task 13 (sprints/v4/PRD.md §4.3-4.4, Decisions C, D, E, F): append
// three advertisement entries to publication.yaml, immediately before the
// `sponsor_acknowledgements:` anchor — the same insertion point
// add-v2-manifest-items.mjs / add-v3-manifest-items.mjs used. Targeted string
// surgery via buildManifestItemBlock(), never a writeManifest() round-trip,
// so the rest of the hand-authored manifest is left byte-for-byte alone.
//
//   ADV-027 (Sarc Epic, order 770, presentation: text)     — conceptually an
//     *update* to the existing excluded tracker row of the same ID (company
//     name now confirmed), but ADV-027 does not exist at all in
//     publication.yaml today (confirmed by grep) — so on the manifest side
//     this is a plain new insertion, exactly like ADV-028/029. The tracker
//     row itself is updated separately, by Task 14.
//   ADV-028 (M/s Balajee Infrate, order 780, presentation: text) — new.
//   ADV-029 (memorial — Late Shri Bhakta Mohon Mitra, order 790,
//     presentation: memorial) — new; the web/print derivatives were already
//     produced by Task 12 (normalize-v4-memorial-image.mjs).

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
const ANCHOR = "sponsor_acknowledgements:";

const memorialSource = path.join(projectRoot, "02_INCOMING_CONTENT", "Supriyo.JPG");
const ADV_029_FINGERPRINT = sha256(memorialSource);
const EXPECTED_ADV_029_FINGERPRINT = "d15810866b6bf28578b8a897de55e89820a426ee088a2c0be970803e55eb16e8";

export const ADV_027 = {
  id: "ADV-027",
  type: "advertisement",
  title: "Best Compliment from Sarc Epic",
  language: "en",
  contributor: "Sarc Epic",
  designation: "",
  passing_year: "",
  branch: "",
  section: "advertisements",
  order: 770,
  source_file: "",
  source_fingerprint: "",
  content_file: "",
  web_asset: "",
  print_asset: "",
  permission: "Print and web",
  editorial_status: "Approved",
  verification: "verified",
  web_include: true,
  print_include: true,
  caption: "",
  credit: "",
  alt: "",
  presentation: "text",
  text_lines: ["Best Compliment from Sarc Epic"],
  notes:
    'Text-only advertisement; no source artwork supplied. Source: AniketPal (Debojit da). ADV-027 row updated: company name confirmed as Sarc Epic (same sponsor as the excluded "Aniket Pal" entry, source via Debojit da); tracker status changed from Excluded to Approved.',
  page_background: "#f3efe6",
  page_background_mode: "manual",
  page_ink: "auto",
};

export const ADV_028 = {
  id: "ADV-028",
  type: "advertisement",
  title: "Best Compliment from M/s Balajee Infrate",
  language: "en",
  contributor: "M/s Balajee Infrate",
  designation: "",
  passing_year: "",
  branch: "",
  section: "advertisements",
  order: 780,
  source_file: "",
  source_fingerprint: "",
  content_file: "",
  web_asset: "",
  print_asset: "",
  permission: "Print and web",
  editorial_status: "Approved",
  verification: "verified",
  web_include: true,
  print_include: true,
  caption: "",
  credit: "",
  alt: "",
  presentation: "text",
  text_lines: ["Best Compliment from M/s Balajee Infrate"],
  notes: "Text-only advertisement; no source artwork supplied. Source: Keya Mukhopadhya. Intended for magazine printing.",
  page_background: "#f3efe6",
  page_background_mode: "manual",
  page_ink: "auto",
};

export const ADV_029 = {
  id: "ADV-029",
  type: "advertisement",
  title: "In fond memory of Late Shri Bhakta Mohon Mitra",
  language: "en",
  contributor: "Subrata Mitra (son), Soma Mitra (daughter)",
  designation: "Memorial contribution",
  passing_year: "",
  branch: "",
  section: "advertisements",
  order: 790,
  source_file: "02_INCOMING_CONTENT/Supriyo.JPG",
  source_fingerprint: ADV_029_FINGERPRINT,
  content_file: "",
  web_asset: "assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg",
  print_asset: "assets/normalized/advertisements/print/ADV-029-late-shri-bhakta-mohon-mitra-print.jpg",
  permission: "Print and web",
  editorial_status: "Approved",
  verification: "verified",
  web_include: true,
  print_include: true,
  caption: "",
  credit: "",
  alt: "Portrait of Late Shri Bhakta Mohon Mitra",
  presentation: "memorial",
  text_lines: [
    "In fond memory of",
    "Late Shri Bhakta Mohon Mitra",
    "B E (Mechanical) April 1951",
    "Bengal Engineering College, Shibpur, Howrah.",
    "With Love from",
    "Subrata Mitra (son)",
    "Soma Mitra (daughter)",
  ],
  notes: "Memorial contribution sponsored by the son and daughter; not a company advertisement. Source: SUPRIO CHOUDHURY.",
  page_background: "#f3efe6",
  page_background_mode: "manual",
  page_ink: "auto",
};

export const NEW_ITEMS = [ADV_027, ADV_028, ADV_029];

export function applyV4ManifestUpdates() {
  if (ADV_029_FINGERPRINT !== EXPECTED_ADV_029_FINGERPRINT) {
    console.error(`Refusing to proceed: 02_INCOMING_CONTENT/Supriyo.JPG fingerprint ${ADV_029_FINGERPRINT} does not match the expected ${EXPECTED_ADV_029_FINGERPRINT}.`);
    process.exit(1);
  }

  const before = readManifest();
  const existingIds = new Set(before.items.map((item) => item.id));
  const already = NEW_ITEMS.every((item) => existingIds.has(item.id));
  if (already) {
    console.log("ADV-027, ADV-028 and ADV-029 already present in the manifest; nothing to do.");
    return { changed: false, before: before.items.length, after: before.items.length };
  }
  const colliding = NEW_ITEMS.filter((item) => existingIds.has(item.id));
  if (colliding.length) {
    console.error(`Refusing to proceed: inconsistent state — only some of ADV-027/028/029 already present in the manifest (${colliding.map((i) => i.id).join(", ")}).`);
    process.exit(1);
  }

  let text = fs.readFileSync(manifestPath, "utf8");
  const anchorIndex = text.indexOf(`\n${ANCHOR}`);
  if (anchorIndex === -1) {
    console.error(`Anchor line not found in publication.yaml: ${ANCHOR}`);
    process.exit(1);
  }

  const insertion = NEW_ITEMS.map(buildManifestItemBlock).join("");
  text = text.slice(0, anchorIndex + 1) + insertion + text.slice(anchorIndex + 1);
  fs.writeFileSync(manifestPath, text, "utf8");

  const after = readManifest(); // re-parse to confirm the file is still valid YAML
  console.log(`Manifest items: ${before.items.length} -> ${after.items.length}.`);
  for (const item of NEW_ITEMS) console.log(`  + ${item.id} (${item.section}, order ${item.order}, presentation ${item.presentation})`);
  return { changed: true, before: before.items.length, after: after.items.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyV4ManifestUpdates();
}
