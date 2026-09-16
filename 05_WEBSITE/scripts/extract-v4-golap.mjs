import fs from "node:fs";
import path from "node:path";
import { projectRoot, siteRoot, sha256, readManifest, ensureDir } from "./lib.mjs";
import { readVerseSource, buildArticleMarkdown } from "./article-markdown-core.mjs";

// Sprint v4 Task 6 (sprints/v4/PRD.md §4.2, Decisions A, B): ART-010 ("গোলাপ")
// is re-extracted from the authoritative Markdown source (not the superseded
// .docx — see 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-15/README.md).
// Shubhra Basu.md is already in the correct verse Markdown form, so no DOCX
// parsing is needed here; readVerseSource() (Task 5) validates its 17-line
// structure and strips the "<br>" markers it finds either way. This script
// re-appends "<br>" to every one of the 17 returned lines when writing
// ART-010-item.md (Decision A): the published form always carries a
// trailing break after every line, even though the real source's own 17th
// line happens to lack one.
//
// extract-v2-golap.mjs (the DOCX-based extractor for the superseded source)
// is retired by this task — see CHANGELOG.md.
export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "Shubhra Basu.md");
export const outputPath = path.join(siteRoot, "src", "content", "articles", "ART-010-item.md");
export const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");

// Verified 2026-09-16 against the real file with `sha256sum` (PRD §4.2, Decision B).
export const EXPECTED_FINGERPRINT = "0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2";

const OLD_MANIFEST_SOURCE_FILE_LINE = "    source_file: 02_INCOMING_CONTENT/Shubhra Basu.docx";
const NEW_MANIFEST_SOURCE_FILE_LINE = "    source_file: 02_INCOMING_CONTENT/Shubhra Basu.md";
const OLD_MANIFEST_FINGERPRINT_LINE = "    source_fingerprint: 83ae8311a1db9205946b5f7f207985eccace7dbf54d771fed3680a9a11d63af9";
const NEW_MANIFEST_FINGERPRINT_LINE = `    source_fingerprint: ${EXPECTED_FINGERPRINT}`;

// Builds the body exactly as specified: title line, author line, blank
// line, then the 17 poem lines each re-appended with "<br>", no stanza
// gaps between any of the 17 lines.
export function buildGolapBody({ heading, author, lines }) {
  return [heading, author, "", ...lines.map((line) => `${line}<br>`)].join("\n");
}

export function extractGolap() {
  const fingerprint = sha256(sourcePath);
  if (fingerprint !== EXPECTED_FINGERPRINT) {
    console.error(
      `Refusing to proceed: Shubhra Basu.md fingerprint ${fingerprint} does not match the verified authoritative source (${EXPECTED_FINGERPRINT}).`
    );
    process.exit(1);
  }

  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const { heading, author, lines } = readVerseSource(sourceText, { expectedCount: 17 });

  const markdown = buildArticleMarkdown({
    id: "ART-010",
    title: heading,
    sourceFile: "02_INCOMING_CONTENT/Shubhra Basu.md",
    fingerprint,
    bodyText: buildGolapBody({ heading, author, lines }),
  });

  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

// Targeted manifest string surgery (pattern of add-v3-manifest-items.mjs):
// find-replace the exact old lines, guard with a count check, re-parse with
// readManifest() after writing to confirm valid YAML.
export function updateManifestSourceFields() {
  let text = fs.readFileSync(manifestPath, "utf8");

  if (text.split(OLD_MANIFEST_SOURCE_FILE_LINE).length !== 2) {
    console.error("Expected exactly one ART-010 source_file line in publication.yaml (aborting, no changes written).");
    process.exit(1);
  }
  if (text.split(OLD_MANIFEST_FINGERPRINT_LINE).length !== 2) {
    console.error("Expected exactly one ART-010 source_fingerprint line in publication.yaml (aborting, no changes written).");
    process.exit(1);
  }

  text = text.replace(OLD_MANIFEST_SOURCE_FILE_LINE, NEW_MANIFEST_SOURCE_FILE_LINE);
  text = text.replace(OLD_MANIFEST_FINGERPRINT_LINE, NEW_MANIFEST_FINGERPRINT_LINE);
  fs.writeFileSync(manifestPath, text, "utf8");

  const after = readManifest(); // re-parse to confirm the file is still valid YAML
  const art010 = after.items.find((item) => item.id === "ART-010");
  console.log(`ART-010 source_file -> ${art010.source_file}`);
  console.log(`ART-010 source_fingerprint -> ${art010.source_fingerprint}`);
  return after;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  extractGolap();
  console.log(`Extracted: ${path.relative(projectRoot, outputPath)}`);
  updateManifestSourceFields();
}
