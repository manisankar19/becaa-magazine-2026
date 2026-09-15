// Sprint v3 Task 1 — the superseded originals archived under
// 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/ must be the exact bytes
// that V1/V2 were built from, and must differ from the revised live files.
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { projectRoot, sha256 } from "../../scripts/lib.mjs";

const archive = path.join(projectRoot, "04_MAGAZINE_WORKING", "SUPERSEDED_SOURCES", "2026-09-14");
const cases = [
  {
    archived: path.join(archive, "secretary desk.docx"),
    live: path.join(projectRoot, "02_INCOMING_CONTENT", "secretary desk.docx"),
    expectedArchived: "df446f4416fbf69a89cf654374f6965ceda9fb84708ed86850ef2cbf8dede687",
    expectedLive: "ed3fd766d55e7bad364f95e8d3777c7305b52aa57458fe636f1a21d988108885",
  },
  {
    archived: path.join(archive, "Siddhartha Mukhopadhyay story.docx"),
    live: path.join(projectRoot, "02_INCOMING_CONTENT", "v2-incoming", "Siddhartha Mukhopadhyay story.docx"),
    expectedArchived: "a13de2ba0199d8f791cd4d89a335fe26d41a1de92da657da41b42a2009fce4a4",
    expectedLive: "9bbe16d10ca51c310a61ca0936ee886b761eb45710a8c46d655473afebdb1c65",
  },
];

for (const c of cases) {
  assert.ok(fs.existsSync(c.archived), `archived copy missing: ${c.archived}`);
  assert.equal(sha256(c.archived), c.expectedArchived, `archived hash mismatch for ${path.basename(c.archived)}`);
  assert.equal(sha256(c.live), c.expectedLive, `live revised hash mismatch for ${path.basename(c.live)}`);
  assert.notEqual(sha256(c.archived), sha256(c.live), "archived and live files must differ");
}
const readme = fs.readFileSync(path.join(archive, "README.md"), "utf8");
for (const c of cases) {
  assert.ok(readme.includes(c.expectedArchived) && readme.includes(c.expectedLive), "README must list both hashes");
}
console.log("superseded-sources: OK");

// Sprint v4 Task 1 — the superseded DOCX archived under 2026-09-15/ must be the
// exact bytes that V3 was built from; the authoritative source is now the .md file.
const archive15 = path.join(projectRoot, "04_MAGAZINE_WORKING", "SUPERSEDED_SOURCES", "2026-09-15");
const archived15 = path.join(archive15, "Shubhra Basu.docx");
const liveSource15 = path.join(projectRoot, "02_INCOMING_CONTENT", "v2-incoming", "Shubhra Basu.md");
const ARCHIVED_DOCX_SHA = "83ae8311a1db9205946b5f7f207985eccace7dbf54d771fed3680a9a11d63af9";
const LIVE_MD_SHA = "0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2";

assert.ok(fs.existsSync(archived15), `archived copy missing: ${archived15}`);
assert.equal(sha256(archived15), ARCHIVED_DOCX_SHA, "archived DOCX hash mismatch");
assert.ok(fs.existsSync(liveSource15), `authoritative .md source missing: ${liveSource15}`);
assert.equal(sha256(liveSource15), LIVE_MD_SHA, "authoritative .md hash mismatch");

const readme15 = fs.readFileSync(path.join(archive15, "README.md"), "utf8");
assert.ok(readme15.includes(ARCHIVED_DOCX_SHA), "README.md must list the archived DOCX hash");
assert.ok(readme15.includes(LIVE_MD_SHA), "README.md must list the authoritative .md hash");
assert.ok(readme15.includes("ART-010"), "README.md must identify the published item");
assert.ok(readme15.includes("<w:br/>"), "README.md must describe the superseded break form");

console.log("superseded-sources 2026-09-15: OK");
