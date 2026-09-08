// Integration test for scripts/add-v2-manifest-items.mjs — Sprint v2 Task 8.
// Runs the real insertion against the real publication.yaml.
import assert from "node:assert/strict";
import { readManifest } from "../../scripts/lib.mjs";
import { addManifestItems, NEW_ITEMS } from "../../scripts/add-v2-manifest-items.mjs";

async function run() {
  const before = readManifest();
  const alreadyApplied = NEW_ITEMS.every((item) => before.items.some((existing) => existing.id === item.id));
  const beforeCount = alreadyApplied ? before.items.length - NEW_ITEMS.length : before.items.length;

  if (!alreadyApplied) addManifestItems(); // safe to re-run this test: skips the mutation once already applied

  const after = readManifest();
  assert.equal(after.items.length, beforeCount + 3, "exactly 3 new items must be added");

  for (const expected of NEW_ITEMS) {
    const actual = after.items.find((item) => item.id === expected.id);
    assert.ok(actual, `${expected.id} must be present in the manifest`);
    assert.deepEqual(actual, expected, `${expected.id} fields must match exactly`);
    assert.equal(actual.web_include, true, `${expected.id} must be web-included`);
    assert.equal(actual.print_include, true, `${expected.id} must be print-included`);
  }

  const excludedIds = after.items.filter((item) => ["20", "24"].includes(String(item.id)));
  assert.equal(excludedIds.length, 0, "Item 20 and Item 24 (excluded per Task 2) must never appear in the manifest");

  const ids = after.items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate manifest IDs");

  // Sanity check that other, unrelated items were not disturbed.
  const untouched = after.items.find((item) => item.id === "ART-009");
  assert.deepEqual(untouched, before.items.find((item) => item.id === "ART-009"), "pre-existing items must be byte-for-byte unchanged");

  console.log(`PASS: manifest grew from ${beforeCount} to ${after.items.length} items; GAL-007/ART-010/ART-011 present and correct; Items 20/24 absent.`);
}

await run();
