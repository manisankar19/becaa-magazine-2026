// Integration test for scripts/retitle-advertisements.mjs — Sprint v3 Task 7.
// Runs the real retitle against the real publication.yaml and tracker
// (idempotent: once applied, re-running the script is a no-op).
//
// Sprint v4 Task 15 (sprints/v4/PRD.md §4.3-4.4, Decision E, K): ADV-027
// (Sarc Epic) is no longer excluded — it is a published text-only
// advertisement, removed from EXCLUDED. Counts are derived from the
// manifest, and the "With best compliments from ..." retitling checks are
// scoped to artwork-presentation advertisements only (text/memorial carry
// their own approved wording and are never retitled or touched in the
// tracker — see advertisement-title-core.mjs's isArtworkPresentation guard).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { projectRoot, readManifest } from "../../scripts/lib.mjs";
import { COMPLIMENTS_PREFIX } from "../../scripts/advertisement-title-core.mjs";
import { retitleAdvertisementsOnDisk, TRACKER_NOTE } from "../../scripts/retitle-advertisements.mjs";
import { EXPECTED_ROW_COUNT } from "../../scripts/validate-tracker-core.mjs";

const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const snapshotsDir = path.join(projectRoot, "04_MAGAZINE_WORKING", "TRACKER_SNAPSHOTS");
const EXCLUDED = ["ADV-009", "ADV-016", "ADV-024", "ADV-025"];
const isArtworkAd = (item) => item.type === "advertisement" && (item.web_include || item.print_include) && (item.presentation ?? "artwork") === "artwork";

function readTracker() {
  const wb = xlsx.readFile(trackerPath, { cellDates: false });
  return {
    sheets: wb.SheetNames,
    rows: xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false }),
    lists: xlsx.utils.sheet_to_json(wb.Sheets.Lists, { header: 1, defval: "" }),
    instructions: xlsx.utils.sheet_to_json(wb.Sheets.Instructions, { header: 1, defval: "" }),
  };
}

async function run() {
  const manifestBefore = readManifest();
  const trackerBefore = readTracker();
  const publishedAds = manifestBefore.items.filter((i) => i.type === "advertisement" && (i.web_include || i.print_include));
  const artworkAds = publishedAds.filter(isArtworkAd);
  assert.equal(publishedAds.length, 25, "precondition: 25 published advertisements (22 artwork + 2 text-only + 1 memorial)");
  assert.equal(artworkAds.length, 22, "precondition: 22 artwork-presentation advertisements");
  const alreadyApplied = artworkAds.every((i) => i.title.startsWith(COMPLIMENTS_PREFIX));
  const snapshotsBefore = fs.readdirSync(snapshotsDir).filter((f) => f.includes("pre-v3-ad-retitle"));

  const result = retitleAdvertisementsOnDisk();

  const manifestAfter = readManifest();
  const trackerAfter = readTracker();

  // --- manifest ---
  assert.equal(manifestAfter.items.length, manifestBefore.items.length, "no item added or removed");
  let changed = 0;
  for (const before of manifestBefore.items) {
    const after = manifestAfter.items.find((i) => i.id === before.id);
    assert.ok(after, `${before.id} still present`);
    if (isArtworkAd(before)) {
      assert.equal(after.title, `${COMPLIMENTS_PREFIX}${before.contributor}`, `${before.id} title`);
      assert.ok(!/Advertisement$/.test(after.title), `${before.id} title must not end with "Advertisement"`);
      if (after.title !== before.title) changed += 1;
      assert.deepEqual({ ...after, title: before.title }, before, `${before.id}: only the title may change`);
    } else {
      // Non-advertisements, and text/memorial-presentation advertisements
      // (Sprint v4): never touched by the compliments retitling.
      assert.deepEqual(after, before, `${before.id} (non-artwork-advertisement) must be unchanged`);
    }
  }
  assert.equal(changed, alreadyApplied ? 0 : artworkAds.length, `exactly ${artworkAds.length} manifest titles change on first run, 0 afterwards`);
  assert.equal(result.changes.length, changed);
  assert.deepEqual(manifestAfter.cover, manifestBefore.cover);
  assert.equal(manifestAfter.items.find((i) => i.id === "ADV-018").title, "With best compliments from Eframe");
  assert.equal(manifestAfter.items.find((i) => i.id === "ADV-005").title, "With best compliments from Tata Capital Ltd. (Retail Finance)");
  assert.equal(manifestAfter.items.find((i) => i.id === "ADV-008").title, "With best compliments from Roofs & Ceilings");
  assert.equal(manifestAfter.items.find((i) => i.id === "ADV-018").alt, "Eframe advertisement artwork", "alt text unchanged");
  assert.ok(manifestAfter.items.find((i) => i.id === "ADV-018").web_asset.includes("ADV-018-eframe-advertisement-web"), "normalized filenames unchanged");

  // --- tracker ---
  assert.deepEqual(trackerAfter.sheets, ["Content Tracker", "Lists", "Instructions"]);
  assert.equal(trackerAfter.rows.length, EXPECTED_ROW_COUNT);
  assert.deepEqual(trackerAfter.lists, trackerBefore.lists, "Lists sheet untouched");
  assert.deepEqual(trackerAfter.instructions, trackerBefore.instructions, "Instructions sheet untouched");
  // Only artwork-presentation published ads are retitled to the compliments
  // pattern in the tracker; text/memorial rows (ADV-027/028/029) keep their
  // own Sprint v4 wording and are never touched by this script.
  const artworkPublishedIds = new Set(artworkAds.map((i) => i.id));
  for (const before of trackerBefore.rows) {
    const id = String(before["Item ID"]);
    const after = trackerAfter.rows.find((r) => String(r["Item ID"]) === id);
    assert.ok(after, `tracker row ${id} still present`);
    if (artworkPublishedIds.has(id)) {
      assert.equal(after["Title / Item"], `${COMPLIMENTS_PREFIX}${before["Contributor / Company"]}`, `tracker ${id} display title`);
      assert.ok(after.Remarks.includes(TRACKER_NOTE), `tracker ${id} remarks carry the v3 note`);
      assert.equal(after.Remarks.split(TRACKER_NOTE).length, 2, `tracker ${id} note appended exactly once (idempotent)`);
      assert.ok(after.Remarks.startsWith(before.Remarks.split(TRACKER_NOTE)[0].trim()), `tracker ${id} earlier remarks preserved`);
      assert.deepEqual({ ...after, "Title / Item": before["Title / Item"], Remarks: before.Remarks }, before, `tracker ${id}: only title and remarks may change`);
    } else {
      assert.deepEqual(after, before, `tracker row ${id} must be unchanged`);
    }
  }
  for (const id of EXCLUDED) {
    const row = trackerAfter.rows.find((r) => String(r["Item ID"]) === id);
    assert.ok(row && /^Excluded/.test(row.Status) && /Advertisement$/.test(row["Title / Item"]), `${id} stays excluded and untitled`);
    assert.ok(!manifestAfter.items.some((i) => i.id === id), `${id} not in the manifest`);
  }

  // --- snapshot ---
  const snapshotsAfter = fs.readdirSync(snapshotsDir).filter((f) => f.includes("pre-v3-ad-retitle"));
  if (!alreadyApplied) assert.equal(snapshotsAfter.length, snapshotsBefore.length + 1, "a pre-edit tracker snapshot is created on the mutating run");
  else assert.equal(snapshotsAfter.length, snapshotsBefore.length, "a no-op run creates no snapshot");
  assert.ok(snapshotsAfter.length >= 1);

  console.log(`PASS: ${changed} advertisement titles retitled in manifest + tracker; excluded rows untouched; Lists/Instructions untouched.`);
}

await run();
