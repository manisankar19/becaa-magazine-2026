// Integration test for scripts/apply-v3-ad-overrides.mjs — Sprint v3 Task 12 (Decision F).
// Idempotent: applies the two manual overrides, then verifies the sampler leaves them alone.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { OVERRIDES, applyAdOverrides } from "../../scripts/apply-v3-ad-overrides.mjs";
import { sampleAdvertisementBackgrounds } from "../../scripts/sample-ad-backgrounds.mjs";
import { contrastRatio, INK_LIGHT, INK_DARK } from "../../scripts/contrast-core.mjs";

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
const before = readManifest();
applyAdOverrides();
const textAfter = fs.readFileSync(manifestPath, "utf8");
applyAdOverrides();
assert.equal(fs.readFileSync(manifestPath, "utf8"), textAfter, "re-applying is a no-op");

const after = readManifest();
assert.deepEqual(Object.keys(OVERRIDES).sort(), ["ADV-019", "ADV-023"], "exactly the two approved overrides");

const a23 = after.items.find((i) => i.id === "ADV-023");
assert.equal(a23.page_background_mode, "manual");
assert.equal(a23.page_background, "#baecec", "ADV-023: cyan #58d6db mixed 60 % toward --paper (#fbfaf7)");
assert.equal(a23.page_ink, "dark");
assert.ok(contrastRatio(a23.page_background, INK_DARK) >= 4.5);
assert.ok(a23.notes.includes("Sprint v3") && a23.notes.includes("manual background"), "override documented in notes");

const a19 = after.items.find((i) => i.id === "ADV-019");
assert.equal(a19.page_background_mode, "manual");
assert.equal(a19.page_background, "#2b2f31", "ADV-019: deep neutral charcoal rather than the sampled near-black");
assert.equal(a19.page_ink, "light");
assert.ok(contrastRatio(a19.page_background, INK_LIGHT) >= 4.5);
assert.ok(a19.notes.includes("Sprint v3") && a19.notes.includes("manual background"));

for (const id of ["ADV-019", "ADV-023"]) {
  const b = before.items.find((i) => i.id === id);
  const a = after.items.find((i) => i.id === id);
  const strip = ({ page_background, page_background_mode, page_ink, notes, ...rest }) => rest;
  assert.deepEqual(strip(a), strip(b), `${id}: only presentation fields and notes change`);
  assert.equal(a.title, `With best compliments from ${a.contributor}`);
}
for (const item of after.items.filter((i) => !["ADV-019", "ADV-023"].includes(i.id))) {
  assert.deepEqual(item, before.items.find((i) => i.id === item.id), `${item.id} untouched`);
}

// The sampler must skip manual items.
const result = await sampleAdvertisementBackgrounds();
assert.equal(result.written.length, 0, "sampler writes nothing after overrides");
assert.ok(result.skipped.includes("ADV-019 (manual)") && result.skipped.includes("ADV-023 (manual)"));
assert.equal(fs.readFileSync(manifestPath, "utf8"), textAfter, "sampler leaves the file byte-identical");
console.log("PASS: ADV-019 and ADV-023 manual backgrounds applied, documented, and respected by the sampler.");
