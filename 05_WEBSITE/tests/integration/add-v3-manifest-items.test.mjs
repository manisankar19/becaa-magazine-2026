// Integration test for scripts/add-v3-manifest-items.mjs — Sprint v3 Task 5.
// Runs the real update against the real publication.yaml (idempotent: skips
// the mutation once already applied, so it is safe to re-run).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { applyV3ManifestUpdates, ART_012, MSG_003_NEW_FINGERPRINT, MSG_003_OLD_FINGERPRINT } from "../../scripts/add-v3-manifest-items.mjs";

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");

async function run() {
  const before = readManifest();
  const alreadyApplied = before.items.some((item) => item.id === "ART-012");
  const beforeCount = alreadyApplied ? before.items.length - 1 : before.items.length;
  const msg003Before = before.items.find((item) => item.id === "MSG-003");

  if (!alreadyApplied) {
    assert.equal(msg003Before.source_fingerprint, MSG_003_OLD_FINGERPRINT, "precondition: MSG-003 still carries the V1/V2 fingerprint");
    applyV3ManifestUpdates();
  }

  const after = readManifest();
  const text = fs.readFileSync(manifestPath, "utf8");

  // MSG-003: exactly one field changed.
  const msg003 = after.items.find((item) => item.id === "MSG-003");
  assert.equal(msg003.source_fingerprint, MSG_003_NEW_FINGERPRINT, "MSG-003 fingerprint must be the revised DOCX hash");
  assert.deepEqual({ ...msg003, source_fingerprint: MSG_003_OLD_FINGERPRINT }, { ...msg003Before, source_fingerprint: MSG_003_OLD_FINGERPRINT }, "every other MSG-003 field is unchanged");
  assert.equal(msg003.title, "Secretary Desk");
  assert.equal(msg003.order, 30);
  assert.ok(!text.includes(MSG_003_OLD_FINGERPRINT), "old fingerprint must not linger anywhere in the manifest");

  // ART-012: present, exact, positioned after ART-011.
  assert.equal(after.items.length, beforeCount + 1, "exactly one new item");
  const art012 = after.items.find((item) => item.id === "ART-012");
  assert.ok(art012, "ART-012 must be present");
  assert.deepEqual(art012, ART_012, "ART-012 fields must match the approved entry exactly");
  assert.equal(art012.language, "bn");
  assert.equal(art012.order, 220);
  assert.equal(art012.section, "articles");
  assert.equal(art012.title, "প্যাঁড়া");
  assert.equal(art012.source_fingerprint, "9bbe16d10ca51c310a61ca0936ee886b761eb45710a8c46d655473afebdb1c65");
  assert.equal(after.items.indexOf(art012), after.items.findIndex((i) => i.id === "ART-011") + 1, "ART-012 is inserted directly after ART-011");
  assert.ok(fs.existsSync(path.join(siteRoot, "src", "content", art012.content_file)), "content file referenced by ART-012 must exist");
  assert.equal(after.items.length, 44, "manifest has 44 items (43 + ART-012)");

  const ids = after.items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate manifest IDs");
  assert.equal(after.items.filter((i) => ["20", "24"].includes(String(i.id))).length, 0, "no bare tracker IDs leak into the manifest");

  // Nothing else disturbed.
  for (const id of ["MSG-001", "ART-011", "ADV-018", "GAL-007"]) {
    assert.deepEqual(after.items.find((i) => i.id === id), before.items.find((i) => i.id === id), `${id} must be unchanged`);
  }
  assert.deepEqual(after.cover, before.cover, "cover block unchanged");
  assert.equal(after.sponsor_acknowledgement_message, before.sponsor_acknowledgement_message);

  console.log(`PASS: MSG-003 fingerprint updated; ART-012 inserted after ART-011; manifest now ${after.items.length} items.`);
}

await run();
