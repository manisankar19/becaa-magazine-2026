// Integration test for scripts/apply-v4-tracker-updates.mjs — Sprint v4 Task 14.
// Runs the real update against the real tracker workbook (idempotent: a
// second run makes no change and takes no snapshot) and re-reads it with the
// live `npm run tracker:validate` gate (scripts/validate-tracker.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { projectRoot } from "../../scripts/lib.mjs";
import { openTracker, readSheetRows, SHEET_NAME, snapshotsDir } from "../../scripts/tracker-io.mjs";
import { applyV4TrackerUpdates } from "../../scripts/apply-v4-tracker-updates.mjs";
import { EXPECTED_ROW_COUNT } from "../../scripts/validate-tracker-core.mjs";

function readRows() {
  const workbook = openTracker();
  return { workbook, ...readSheetRows(workbook, SHEET_NAME) };
}

async function run() {
  const before = readRows();
  const alreadyApplied = before.rows.some((r) => String(r["Item ID"]).trim() === "ADV-028");
  const snapshotsBefore = fs.readdirSync(snapshotsDir).filter((f) => f.includes("pre-v4-tracker-updates"));

  if (!alreadyApplied) {
    const result = applyV4TrackerUpdates();
    assert.equal(result.changed, true, "first run must report a change");
  } else {
    // Idempotency: re-running once already applied must be a true no-op — no
    // snapshot taken, workbook bytes unchanged.
    const beforeBytes = fs.readFileSync(path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx"));
    const result = applyV4TrackerUpdates();
    assert.equal(result.changed, false, "a second run must be a no-op");
    const afterBytes = fs.readFileSync(path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx"));
    assert.deepEqual(beforeBytes, afterBytes, "a no-op run must not rewrite the workbook");
  }

  const after = readRows();

  // --- row count and sheets ---
  assert.equal(after.rows.length, EXPECTED_ROW_COUNT, "tracker has 54 rows (52 + ADV-028 + ADV-029)");
  assert.deepEqual(after.workbook.SheetNames, ["Content Tracker", "Lists", "Instructions"], "sheets unchanged");

  // --- ADV-027: revised in place, Item ID unchanged, old remark preserved ---
  const adv027 = after.rows.find((r) => String(r["Item ID"]).trim() === "ADV-027");
  assert.ok(adv027, "ADV-027 row must still be present");
  assert.equal(adv027["Title / Item"], "Best Compliment from Sarc Epic");
  assert.equal(adv027["Contributor / Company"], "Sarc Epic");
  assert.equal(adv027.Status, "Approved");
  assert.equal(adv027["Web Include"], "Yes");
  assert.equal(adv027["Print Include"], "Yes");
  assert.equal(adv027["Received Date"], "15.09.2026");
  assert.equal(adv027.Permission, "Print and web");
  assert.equal(adv027["Print Section"], "Advertisements");
  assert.match(adv027.Notes, /Sarc Epic/);
  assert.ok(adv027.Remarks.startsWith("Confirmed excluded from website, print and Sponsor Acknowledgements: company name incomplete or unavailable."), "old remark preserved verbatim");
  assert.ok(adv027.Remarks.includes("Sprint v4: re-included as ADV-027, Approved, Sarc Epic — see Notes."));
  assert.equal(adv027.Remarks.split("Sprint v4: re-included as ADV-027").length, 2, "note appended exactly once");

  // --- ADV-028: new row, positioned directly after ADV-027 ---
  const idx027 = after.rows.findIndex((r) => String(r["Item ID"]).trim() === "ADV-027");
  const idx028 = after.rows.findIndex((r) => String(r["Item ID"]).trim() === "ADV-028");
  const idx029 = after.rows.findIndex((r) => String(r["Item ID"]).trim() === "ADV-029");
  assert.equal(idx028, idx027 + 1, "ADV-028 appended directly after ADV-027");
  assert.equal(idx029, idx028 + 1, "ADV-029 appended directly after ADV-028");

  const adv028 = after.rows[idx028];
  assert.equal(adv028["Title / Item"], "Best Compliment from M/s Balajee Infrate");
  assert.equal(adv028["Contributor / Company"], "M/s Balajee Infrate");
  assert.equal(adv028["Source File Name"], "—");
  assert.equal(adv028["Received Date"], "15.09.2026");
  assert.equal(adv028.Permission, "Print and web");
  assert.equal(adv028.Status, "Approved");
  assert.equal(adv028["Print Section"], "Advertisements");
  assert.equal(adv028["Web Include"], "Yes");
  assert.equal(adv028["Print Include"], "Yes");
  assert.equal(adv028.Notes, "Text-only advertisement; no source artwork supplied. Source: Keya Mukhopadhya. Intended for magazine printing.");
  assert.equal(adv028.Remarks, "Sprint v4: new text-only advertisement, published as ADV-028.");

  // --- ADV-029: new row (memorial) ---
  const adv029 = after.rows[idx029];
  assert.equal(adv029["Title / Item"], "In fond memory of Late Shri Bhakta Mohon Mitra");
  assert.equal(adv029["Contributor / Company"], "Subrata Mitra (son), Soma Mitra (daughter)");
  assert.equal(adv029["Source File Name"], "Supriyo.JPG");
  assert.equal(adv029["Received Date"], "15.09.2026");
  assert.equal(adv029.Permission, "Print and web");
  assert.equal(adv029.Status, "Approved");
  assert.equal(adv029["Print Section"], "Advertisements");
  assert.equal(adv029["Web Include"], "Yes");
  assert.equal(adv029["Print Include"], "Yes");
  assert.equal(adv029.Notes, "Memorial contribution sponsored by the son and daughter; not a company advertisement. Source: SUPRIO CHOUDHURY.");
  assert.equal(adv029.Remarks, "Sprint v4: new memorial contribution, published as ADV-029.");

  // --- row 22 (the poem, ART-010's tracker row) ---
  const row22 = after.rows.find((r) => String(r["Item ID"]).trim() === "22");
  assert.ok(row22, "row 22 must still be present");
  assert.match(row22.Remarks, /Sprint v4: revised source received 15\.09\.2026/);
  assert.match(row22.Remarks, /SHA-256 0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2/);
  assert.match(row22.Remarks, /SHA-256 83ae8311a1db9205946b5f7f207985eccace7dbf54d771fed3680a9a11d63af9/);
  assert.match(row22.Remarks, /04_MAGAZINE_WORKING\/SUPERSEDED_SOURCES\/2026-09-15\//);
  assert.equal(row22["Title / Item"], "গোলাপ", "row 22 title untouched");
  assert.equal(row22.Remarks.split("Sprint v4: revised source received 15.09.2026").length, 2, "row 22 note appended exactly once");

  // --- IDs unique ---
  const ids = after.rows.map((r) => String(r["Item ID"]).trim());
  assert.equal(new Set(ids).size, ids.length, "no duplicate tracker IDs");

  // --- unrelated rows untouched ---
  for (const id of ["1", "20", "24", "COV-001", "ADV-001", "ADV-018", "ADV-026"]) {
    const beforeRow = before.rows.find((r) => String(r["Item ID"]).trim() === id) ?? after.rows.find((r) => String(r["Item ID"]).trim() === id);
    const afterRow = after.rows.find((r) => String(r["Item ID"]).trim() === id);
    if (alreadyApplied) {
      assert.deepEqual(afterRow, beforeRow, `${id} must be unchanged by the idempotent re-run`);
    } else {
      assert.deepEqual(afterRow, before.rows.find((r) => String(r["Item ID"]).trim() === id), `${id} must be unchanged`);
    }
  }

  // --- snapshot taken only on a real change ---
  const snapshotsAfter = fs.readdirSync(snapshotsDir).filter((f) => f.includes("pre-v4-tracker-updates"));
  if (!alreadyApplied) assert.equal(snapshotsAfter.length, snapshotsBefore.length + 1, "a pre-edit snapshot is created on the mutating run");
  else assert.equal(snapshotsAfter.length, snapshotsBefore.length, "a no-op run creates no snapshot");
  assert.ok(snapshotsAfter.length >= 1);

  // --- npm run tracker:validate: the live gate, not a re-implementation ---
  const output = execFileSync("node", ["scripts/validate-tracker.mjs"], { cwd: path.join(projectRoot, "05_WEBSITE"), encoding: "utf8" });
  assert.match(output, /Tracker validation passed: 54 rows, 3 sheets\./, "npm run tracker:validate must pass");

  console.log(`PASS: ADV-027 revised (Sarc Epic, Approved); ADV-028/ADV-029 appended after it; row 22 carries the revised-source remark; tracker:validate clean (${after.rows.length} rows).`);
}

await run();
