// Sprint v5 Task 9 (PRD §4.2 "Other live references", Decision G): `President Desk.docx` left
// 02_INCOMING_CONTENT/ in the intake commit and lives on only as the byte-exact archive in
// 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/. No live file under 05_WEBSITE/scripts,
// src or tests may still point at the removed intake copy.
//
// EXPECTED STATE: green only once Sprint v5 Tasks 4 and 7 have landed — they rewrite the
// MSG-001 front matter (src/content/messages/MSG-001-president-desk.md) and the MSG-001
// manifest entry (src/_data/publication.yaml), which name the old file until then. Those two
// files are deliberately NOT allow-listed: this test is how the merge proves they changed.
//
// Historical records outside these folders (04_MAGAZINE_WORKING reports, sprint documents,
// the 2026-09-16 correction record) keep naming the file and are not scanned.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { projectRoot, sha256, siteRoot } from "../../scripts/lib.mjs";

const FILE_NAME = ["President Desk", "docx"].join("."); // built so this file never spells the full path
const INCOMING = "02_INCOMING_CONTENT";
const ARCHIVE_DIR = "04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26";
const ARCHIVE_SHA256 = "c9f5d073f3b732ef6c30466b210db2622a7e9afc756bff070e537bce2db38ddb";

// Files (relative to 05_WEBSITE/) that may name the file without the archive path, and why.
// Even these may never contain the removed intake path itself.
const ALLOW_BARE_NAME = new Map([
  ["tests/integration/v5-source-references.test.mjs", "this test"],
  ["tests/integration/superseded-sources.test.mjs", "asserts the archived copy: path.join(archive26, <name>) under SUPERSEDED_SOURCES/2026-09-26"],
  // Sprint v5 Tasks 7 and 11 (added when merging): record the old name, never read the file.
  ["scripts/tracker-v5-core.mjs", "the row-16 Remarks note says the old source was archived (text written to the tracker)"],
  ["tests/unit/tracker-v5-core.test.mjs", "fixture row 16 holds the tracker's pre-v5 Source File Name value"],
  ["tests/integration/v5-manifest-msg001.test.mjs", "asserts publication.yaml no longer contains the old name"],
]);

const SCANNED_DIRS = ["scripts", "src", "tests"];
const TEXT_FILE = /\.(?:mjs|cjs|js|ts|tsx|json|ya?ml|md|njk|html|css|txt|csv|xml|svg)$/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "node_modules") walk(full, out); }
    else if (entry.isFile() && TEXT_FILE.test(entry.name)) out.push(full);
  }
  return out;
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The removed intake path, written directly or as path segments joined in code
// ("02_INCOMING_CONTENT", "President Desk.docx" — any quote style, any separator).
const DIRECT = new RegExp(`${INCOMING}[\\\\/]+${escape(FILE_NAME)}`);
const JOINED = new RegExp(`["'\`]${INCOMING}["'\`]\\s*,\\s*["'\`]${escape(FILE_NAME)}["'\`]`);
// Any mention of the file name that is not the archive path.
const ARCHIVED_MENTION = new RegExp(`${escape(ARCHIVE_DIR)}/${escape(FILE_NAME)}`, "g");

const self = path.relative(siteRoot, new URL(import.meta.url).pathname);
const files = SCANNED_DIRS.flatMap((d) => walk(path.join(siteRoot, d)));
assert.ok(files.length > 100, `scanned scripts/, src/ and tests/ (${files.length} text files)`);
assert.ok(files.some((f) => path.relative(siteRoot, f) === "scripts/import-content.mjs"), "the Sprint 1 importer is among the scanned files");

const problems = [];
for (const file of files) {
  const rel = path.relative(siteRoot, file);
  if (rel === self) continue;
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(FILE_NAME)) continue;
  if (DIRECT.test(text)) problems.push(`${rel}: names the removed ${INCOMING}/${FILE_NAME}`);
  else if (JOINED.test(text)) problems.push(`${rel}: joins ${INCOMING} and ${FILE_NAME} into the removed path`);
  else if (!ALLOW_BARE_NAME.has(rel) && text.replace(ARCHIVED_MENTION, "").includes(FILE_NAME)) {
    problems.push(`${rel}: names ${FILE_NAME} other than by its archive path ${ARCHIVE_DIR}/ (allow-list it here with a reason if it is a legitimate archive reference)`);
  }
}
assert.deepEqual(problems, [], `live references to the removed source:\n  ${problems.join("\n  ")}`);

// The removed file is gone from the intake folder and the archive copy is byte-exact.
assert.ok(!fs.existsSync(path.join(projectRoot, INCOMING, FILE_NAME)), `${INCOMING}/${FILE_NAME} has been removed`);
const archived = path.join(projectRoot, ARCHIVE_DIR, FILE_NAME);
assert.ok(fs.existsSync(archived), `archive copy present: ${ARCHIVE_DIR}/${FILE_NAME}`);
assert.equal(sha256(archived), ARCHIVE_SHA256, "archive copy SHA-256");

// The historical importer keeps working against the archive, and says why.
const importer = fs.readFileSync(path.join(siteRoot, "scripts", "import-content.mjs"), "utf8");
assert.match(importer.slice(0, 1500), /HISTORICAL/, "import-content.mjs carries a HISTORICAL header");
assert.ok(importer.includes(`source: "${ARCHIVE_DIR}/${FILE_NAME}"`), "import-content.mjs reads the archived copy");

console.log(`v5-source-references: no live reference to the removed ${FILE_NAME} (${files.length} files scanned); archive copy verified`);
