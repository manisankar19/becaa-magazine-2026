// Integration test for scripts/add-v4-manifest-items.mjs — Sprint v4 Task 13.
// Runs the real update against the real publication.yaml (idempotent: skips
// the mutation once already applied, so it is safe to re-run) and cross-checks
// against the live `npm run validate` gate (scripts/validate.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { validateAdvertisementPresentation } from "../../scripts/ad-presentation-core.mjs";
import { applyV4ManifestUpdates, ADV_027, ADV_028, ADV_029, NEW_ITEMS } from "../../scripts/add-v4-manifest-items.mjs";

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");

async function run() {
  const before = readManifest();
  const alreadyApplied = NEW_ITEMS.every((item) => before.items.some((i) => i.id === item.id));
  const beforeCount = alreadyApplied ? before.items.length - NEW_ITEMS.length : before.items.length;
  const beforeText = fs.readFileSync(manifestPath, "utf8");

  if (!alreadyApplied) {
    applyV4ManifestUpdates();
  } else {
    // Re-run anyway to prove the no-op path (second run is a no-op).
    const result = applyV4ManifestUpdates();
    assert.equal(result.changed, false, "a second run of applyV4ManifestUpdates() must be a no-op");
    const afterText = fs.readFileSync(manifestPath, "utf8");
    assert.equal(afterText, beforeText, "re-running the script must not rewrite the manifest");
  }

  const after = readManifest();
  const text = fs.readFileSync(manifestPath, "utf8");

  assert.equal(after.items.length, beforeCount + 3, "exactly three new items");
  assert.equal(after.items.length, 47, "manifest has 47 items (44 + ADV-027/028/029)");

  // --- ADV-027 (Sarc Epic, text) ---
  const adv027 = after.items.find((i) => i.id === "ADV-027");
  assert.ok(adv027, "ADV-027 must be present");
  assert.deepEqual(adv027, ADV_027, "ADV-027 fields must match the approved entry exactly");
  assert.equal(adv027.title, "Best Compliment from Sarc Epic");
  assert.equal(adv027.title, adv027.text_lines[0], "text presentation: title === text_lines[0]");
  assert.equal(adv027.contributor, "Sarc Epic");
  assert.equal(adv027.order, 770);
  assert.equal(adv027.presentation, "text");
  assert.deepEqual(adv027.text_lines, ["Best Compliment from Sarc Epic"]);
  assert.equal(adv027.page_background, "#f3efe6");
  assert.equal(adv027.page_background_mode, "manual");
  assert.equal(adv027.page_ink, "auto");
  assert.equal(adv027.web_asset, "");
  assert.equal(adv027.print_asset, "");
  assert.equal(adv027.source_file, "");
  assert.equal(adv027.source_fingerprint, "");
  assert.equal(adv027.alt, "");
  assert.ok(/Text-only advertisement/.test(adv027.notes) && /no source artwork supplied/.test(adv027.notes), "notes record 'text-only; no source artwork supplied'");
  assert.equal(adv027.web_include, true);
  assert.equal(adv027.print_include, true);
  assert.equal(adv027.editorial_status, "Approved");
  assert.equal(adv027.verification, "verified");

  // --- ADV-028 (Balajee, text) ---
  const adv028 = after.items.find((i) => i.id === "ADV-028");
  assert.ok(adv028, "ADV-028 must be present");
  assert.deepEqual(adv028, ADV_028, "ADV-028 fields must match the approved entry exactly");
  assert.equal(adv028.title, "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate");
  assert.equal(adv028.title, adv028.text_lines[0]);
  assert.equal(adv028.contributor, "M/s Balajee Infrate");
  assert.equal(adv028.order, 780);
  assert.equal(adv028.presentation, "text");
  assert.deepEqual(adv028.text_lines, ["We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate"]);
  assert.equal(adv028.page_background, "#f3efe6");
  assert.equal(adv028.page_background_mode, "manual");
  assert.equal(adv028.page_ink, "auto");
  assert.equal(adv028.web_asset, "");
  assert.equal(adv028.print_asset, "");
  assert.ok(/no source artwork supplied/.test(adv028.notes));

  // --- ADV-029 (memorial) ---
  const adv029 = after.items.find((i) => i.id === "ADV-029");
  assert.ok(adv029, "ADV-029 must be present");
  assert.deepEqual(adv029, ADV_029, "ADV-029 fields must match the approved entry exactly");
  assert.equal(adv029.title, "In fond memory of Late Shri Bhakta Mohon Mitra");
  assert.equal(adv029.title, `${adv029.text_lines[0]} ${adv029.text_lines[1]}`, "memorial presentation: title === text_lines[0] + ' ' + text_lines[1]");
  assert.equal(adv029.contributor, "Subrata Mitra (son), Soma Mitra (daughter)");
  assert.equal(adv029.designation, "Memorial contribution");
  assert.equal(adv029.order, 790);
  assert.equal(adv029.presentation, "memorial");
  assert.deepEqual(adv029.text_lines, [
    "In fond memory of",
    "Late Shri Bhakta Mohon Mitra",
    "B E (Mechanical) April 1951",
    "Bengal Engineering College, Shibpur, Howrah.",
    "With Love from",
    "Subrata Mitra (son)",
    "Soma Mitra (daughter)",
  ]);
  assert.equal(adv029.source_file, "02_INCOMING_CONTENT/Supriyo.JPG");
  assert.equal(adv029.source_fingerprint, "d15810866b6bf28578b8a897de55e89820a426ee088a2c0be970803e55eb16e8");
  assert.equal(adv029.web_asset, "assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg");
  assert.equal(adv029.print_asset, "assets/normalized/advertisements/print/ADV-029-late-shri-bhakta-mohon-mitra-print.jpg");
  assert.equal(adv029.alt, "Portrait of Late Shri Bhakta Mohon Mitra");
  assert.ok(fs.existsSync(path.join(siteRoot, "src", adv029.web_asset)), "ADV-029 web_asset must exist on disk");
  assert.ok(fs.existsSync(path.join(siteRoot, "src", adv029.print_asset)), "ADV-029 print_asset must exist on disk");
  assert.ok(/Memorial contribution/.test(adv029.notes) && /not a company advertisement/.test(adv029.notes));

  // --- validator: every new item satisfies Task 9's presentation rules exactly ---
  for (const item of [adv027, adv028, adv029]) {
    assert.deepEqual(validateAdvertisementPresentation(item), [], `${item.id} must satisfy validateAdvertisementPresentation with no errors`);
  }

  // --- position: appended in order, directly before sponsor_acknowledgements ---
  const idx027 = after.items.findIndex((i) => i.id === "ADV-027");
  const idx028 = after.items.findIndex((i) => i.id === "ADV-028");
  const idx029 = after.items.findIndex((i) => i.id === "ADV-029");
  assert.equal(idx028, idx027 + 1, "ADV-028 directly follows ADV-027");
  assert.equal(idx029, idx028 + 1, "ADV-029 directly follows ADV-028");
  assert.equal(idx029, after.items.length - 1, "ADV-029 is the last manifest item");

  // --- uniqueness ---
  const ids = after.items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate manifest IDs");

  // --- nothing else disturbed: spot-check a representative sample across sections ---
  for (const id of ["MSG-001", "ART-010", "ART-011", "ART-012", "ADV-018", "ADV-026", "GAL-007"]) {
    assert.deepEqual(after.items.find((i) => i.id === id), before.items.find((i) => i.id === id), `${id} must be unchanged`);
  }
  // Every pre-existing item, not just the sample above, must be byte-for-byte unchanged.
  for (const item of before.items) {
    assert.deepEqual(after.items.find((i) => i.id === item.id), item, `${item.id} must be unchanged`);
  }
  assert.deepEqual(after.cover, before.cover, "cover block unchanged");
  assert.equal(after.sponsor_acknowledgement_message, before.sponsor_acknowledgement_message);
  assert.deepEqual(after.sponsor_acknowledgements, before.sponsor_acknowledgements, "sponsor_acknowledgements anchor block unchanged");

  // --- npm run validate: 0 errors, 47 items, IDs unique (the live gate, not a re-implementation) ---
  const validateOutput = execFileSync("node", ["scripts/validate.mjs"], { cwd: siteRoot, encoding: "utf8" });
  assert.match(validateOutput, /Validation passed with \d+ warning\(s\)\./, "npm run validate must pass with 0 errors");
  const report = JSON.parse(fs.readFileSync(path.join(siteRoot, "validation-report.json"), "utf8"));
  assert.equal(report.errors.length, 0, "validation-report.json must have 0 errors");
  assert.equal(report.items.length, 47, "validation report covers all 47 manifest items");

  console.log(`PASS: ADV-027/028/029 inserted before sponsor_acknowledgements; manifest now ${after.items.length} items; npm run validate clean.`);
}

await run();
