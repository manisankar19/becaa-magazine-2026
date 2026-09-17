// HISTORICAL (Sprint v3 Task 5): one-shot manifest edit (MSG-003 fingerprint, ART-012 insertion)
// in publication.yaml. Already applied; kept for reproducibility and exercised by
// tests/integration/add-v3-manifest-items.test.mjs. Paths reflect the Sprint v4 layout: the
// files of the former Sprint v2 intake subfolder now live directly in 02_INCOMING_CONTENT/.
import fs from "node:fs";
import path from "node:path";
import { projectRoot, siteRoot, sha256, readManifest, stripFrontMatter } from "./lib.mjs";
import { buildManifestItemBlock } from "./manifest-item-yaml-core.mjs";

// Sprint v3 Task 5 (sprints/v3/PRD.md §4.1–4.2): two targeted manifest edits.
//   1. MSG-003 — replace only the source_fingerprint line (revised Secretary's Desk).
//   2. ART-012 — insert the approved Siddhartha Mukhopadhyay story directly after
//      ART-011 (i.e. before the `sponsor_acknowledgements:` anchor, the same
//      insertion point add-v2-manifest-items.mjs used).
// Targeted string edits, not a YAML round-trip, so the other ~1,000 lines of the
// hand-authored manifest are not reformatted.

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
const ANCHOR = "sponsor_acknowledgements:";

const secretarySource = path.join(projectRoot, "02_INCOMING_CONTENT", "secretary desk.docx");
const storySource = path.join(projectRoot, "02_INCOMING_CONTENT", "Siddhartha Mukhopadhyay story.docx");

export const MSG_003_OLD_FINGERPRINT = "df446f4416fbf69a89cf654374f6965ceda9fb84708ed86850ef2cbf8dede687";
export const MSG_003_NEW_FINGERPRINT = sha256(secretarySource);

// Same heuristic as import-approved.mjs / add-v2-manifest-items.mjs.
function detectLanguage(text) {
  const bengali = (text.match(/[ঀ-৿]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return bengali && latin ? "mixed" : bengali ? "bn" : "en";
}

function readExtractedBody(relContentFile) {
  const abs = path.join(siteRoot, "src", "content", relContentFile);
  return stripFrontMatter(fs.readFileSync(abs, "utf8"));
}

export const ART_012 = {
  id: "ART-012",
  type: "article",
  title: "প্যাঁড়া",
  language: detectLanguage(readExtractedBody("articles/ART-012-item.md")),
  contributor: "Siddhartha Mukhopadhyay",
  designation: "",
  passing_year: "1986",
  branch: "Electrical",
  section: "articles",
  order: 220,
  source_file: "02_INCOMING_CONTENT/Siddhartha Mukhopadhyay story.docx",
  source_fingerprint: sha256(storySource),
  content_file: "articles/ART-012-item.md",
  web_asset: "",
  print_asset: "",
  permission: "Print and web",
  editorial_status: "Approved",
  verification: "verified",
  web_include: true,
  print_include: true,
  caption: "",
  credit: "",
  alt: "প্যাঁড়া — Siddhartha Mukhopadhyay",
  notes: "Tracker Item ID 24. Exact approved source: Siddhartha Mukhopadhyay story.docx.",
};

export function applyV3ManifestUpdates() {
  const before = readManifest();
  if (before.items.some((item) => item.id === ART_012.id)) {
    console.error(`Refusing to proceed: ${ART_012.id} already present in the manifest.`);
    process.exit(1);
  }
  if (MSG_003_NEW_FINGERPRINT !== "ed3fd766d55e7bad364f95e8d3777c7305b52aa57458fe636f1a21d988108885") {
    console.error("Refusing to proceed: secretary desk.docx is not the revised file received on 2026-09-14.");
    process.exit(1);
  }

  let text = fs.readFileSync(manifestPath, "utf8");
  const oldLine = `    source_fingerprint: ${MSG_003_OLD_FINGERPRINT}`;
  if (text.split(oldLine).length !== 2) {
    console.error("Expected exactly one MSG-003 fingerprint line in publication.yaml (aborting, no changes written).");
    process.exit(1);
  }
  const anchorIndex = text.indexOf(`\n${ANCHOR}`);
  if (anchorIndex === -1) {
    console.error(`Anchor line not found in publication.yaml: ${ANCHOR}`);
    process.exit(1);
  }

  text = text.replace(oldLine, `    source_fingerprint: ${MSG_003_NEW_FINGERPRINT}`);
  const insertAt = text.indexOf(`\n${ANCHOR}`) + 1;
  text = text.slice(0, insertAt) + buildManifestItemBlock(ART_012) + text.slice(insertAt);
  fs.writeFileSync(manifestPath, text, "utf8");

  const after = readManifest(); // re-parse to confirm the file is still valid YAML
  console.log(`MSG-003 fingerprint: ${MSG_003_OLD_FINGERPRINT.slice(0, 8)}… -> ${MSG_003_NEW_FINGERPRINT.slice(0, 8)}…`);
  console.log(`Manifest items: ${before.items.length} -> ${after.items.length} (+ ${ART_012.id}, ${ART_012.section}, order ${ART_012.order}, language ${ART_012.language})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyV3ManifestUpdates();
}
