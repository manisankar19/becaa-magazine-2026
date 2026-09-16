// Integration test for scripts/sample-ad-backgrounds.mjs — Sprint v3 Task 11.
// Samples the real print assets and writes into the real publication.yaml
// (idempotent: a second run must produce no change).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { sampleAdvertisementBackgrounds } from "../../scripts/sample-ad-backgrounds.mjs";
import { chooseInk } from "../../scripts/contrast-core.mjs";

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
// Expected edge colours from the PRD §4.4 survey (RGB), tolerance ±2 per channel.
const EXPECTED = {
  "ADV-001": [182, 226, 242], "ADV-002": [135, 63, 62], "ADV-003": [40, 76, 121], "ADV-004": [192, 170, 116],
  "ADV-005": [159, 191, 209], "ADV-006": [161, 181, 201], "ADV-007": [205, 203, 203], "ADV-008": [139, 140, 138],
  "ADV-010": [194, 186, 181], "ADV-011": [234, 217, 218], "ADV-012": [207, 216, 218], "ADV-013": [209, 182, 170],
  "ADV-014": [104, 127, 154], "ADV-015": [158, 160, 161], "ADV-017": [101, 90, 96], "ADV-018": [209, 205, 28],
  "ADV-019": [18, 21, 22], "ADV-020": [172, 158, 97], "ADV-021": [209, 207, 206], "ADV-022": [208, 211, 209],
  "ADV-023": [88, 214, 219], "ADV-026": [200, 187, 159],
};
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const before = readManifest();
const beforeText = fs.readFileSync(manifestPath, "utf8");
const first = await sampleAdvertisementBackgrounds();
const afterText = fs.readFileSync(manifestPath, "utf8");
const second = await sampleAdvertisementBackgrounds();
assert.equal(fs.readFileSync(manifestPath, "utf8"), afterText, "second run is a no-op (idempotent)");
assert.equal(second.written.length, 0, "second run writes nothing");

const after = readManifest();
assert.equal(after.items.length, before.items.length);
const ads = after.items.filter((i) => i.type === "advertisement" && (i.web_include || i.print_include));
// Sprint v4 Task 15 (Decision K): 22 artwork ads + 2 text-only + 1 memorial.
// All three Sprint v4 additions are `page_background_mode: "manual"`, so the
// loop below already skips them (untouched by the sampler), same as the two
// pre-existing Sprint v3 manual overrides (ADV-019, ADV-023).
assert.equal(ads.length, 25, "25 published advertisements (22 artwork + 2 text-only + 1 memorial)");
// 20 = 22 artwork ads minus the two pre-existing Sprint v3 manual overrides (ADV-019, ADV-023).
assert.equal(ads.filter((ad) => (ad.page_background_mode ?? "auto") === "auto").length, 20, "20 advertisements sampled automatically");
for (const ad of ads) {
  if (ad.page_background_mode === "manual" || ad.page_background_mode === "none") continue; // untouched by the sampler
  assert.equal(ad.page_background_mode, "auto", `${ad.id} mode`);
  assert.match(ad.page_background, /^#[0-9a-f]{6}$/, `${ad.id} hex`);
  const rgb = hexToRgb(ad.page_background);
  EXPECTED[ad.id].forEach((v, i) => assert.ok(Math.abs(rgb[i] - v) <= 2, `${ad.id} channel ${i}: ${rgb[i]} vs expected ${v}`));
  assert.equal(ad.page_ink, chooseInk(ad.page_background).ink, `${ad.id} ink follows chooseInk`);
  const prior = before.items.find((i) => i.id === ad.id);
  const { page_background, page_background_mode, page_ink, ...rest } = ad;
  const { page_background: pb, page_background_mode: pm, page_ink: pi, ...priorRest } = prior;
  assert.deepEqual(rest, priorRest, `${ad.id}: only the three presentation fields change`);
}
for (const item of after.items.filter((i) => i.type !== "advertisement")) {
  assert.deepEqual(item, before.items.find((i) => i.id === item.id), `${item.id} untouched`);
}
assert.deepEqual(after.cover, before.cover);
assert.equal(after.items.find((i) => i.id === "ADV-018").page_background, "#d1cd1c", "Eframe yellow");
assert.equal(after.items.find((i) => i.id === "ADV-018").page_ink, "dark");
assert.equal(after.items.find((i) => i.id === "ADV-019").page_ink, "light");
console.log(`PASS: sampled ${first.written.length} advertisement backgrounds on first run, 0 on second; values within ±2 of the survey.`);
