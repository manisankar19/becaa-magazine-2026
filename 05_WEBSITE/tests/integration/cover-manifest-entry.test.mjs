// Integration test for the COV-001 manifest entry — Sprint v2 Task 4.
// Reads the real publication.yaml (must remain valid YAML) and checks the
// cover block points at the new v2 cover with a matching fingerprint.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readManifest, sha256, projectRoot } from "../../scripts/lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const manifest = readManifest(); // throws if publication.yaml is not valid YAML
  const cover = manifest.cover;
  assert.ok(cover, "manifest must have a cover block");
  assert.equal(cover.id, "COV-001", "cover id must not be renumbered");
  assert.equal(cover.title, "একই শিকড়", "cover title must be unchanged");
  assert.equal(cover.source_file, "02_INCOMING_CONTENT/cover page new.png");
  assert.equal(cover.asset, "assets/normalized/cover/cover page new.png");

  const expectedFingerprint = sha256(path.join(projectRoot, cover.source_file));
  assert.equal(cover.source_fingerprint, expectedFingerprint, "fingerprint must match the actual source file (consolidated into 02_INCOMING_CONTENT, Sprint v4 Task 4)");

  console.log("PASS: COV-001 manifest entry points at the new v2 cover with a matching fingerprint.");
}

await run();
