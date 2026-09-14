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
