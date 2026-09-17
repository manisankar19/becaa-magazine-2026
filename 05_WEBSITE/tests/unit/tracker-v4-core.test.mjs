// Unit test for scripts/tracker-v4-core.mjs — Sprint v4 Task 14. Hermetic:
// pure row logic over in-memory fixtures, no xlsx, no file I/O.
import assert from "node:assert/strict";
import { buildV4TrackerRows, insertRowsAfter, DECISIONS, ADV_028_ROW, ADV_029_ROW, NEW_ROWS } from "../../scripts/tracker-v4-core.mjs";

const HEADERS = ["Item ID", "Title / Item", "Type", "Contributor / Company", "Passing Year", "Branch", "Source File Name", "Received Date", "Permission", "Status", "Print Section", "Proposed Page", "Web Include", "Credit / Caption", "Notes", "Print Include", "Remarks"];

function baseRows() {
  return [
    { "Item ID": "20", "Title / Item": "Climate Change", Type: "Article", "Contributor / Company": "Sudipta Chakraborty", "Passing Year": "—", Branch: "—", "Source File Name": "x.pdf", "Received Date": "—", Permission: "—", Status: "Excluded – Source file not received", "Print Section": "—", "Proposed Page": "—", "Web Include": "No", "Credit / Caption": "—", Notes: "", "Print Include": "No", Remarks: "" },
    { "Item ID": "22", "Title / Item": "গোলাপ", Type: "Poem", "Contributor / Company": "Shubhra Basu (wife of Pranab Basu)", "Passing Year": "1978", Branch: "Civil", "Source File Name": "Shubhra Basu.docx", "Received Date": "", Permission: "Print and web", Status: "Approved", "Print Section": "Stories / Literature", "Proposed Page": "", "Web Include": "Yes", "Credit / Caption": "", Notes: "", "Print Include": "", Remarks: "" },
    { "Item ID": "ADV-026", "Title / Item": "With best compliments from CETEST", Type: "Advertisement", "Contributor / Company": "CETEST", "Passing Year": "—", Branch: "—", "Source File Name": "CETEST Advertisement_May 2025_Portrait.pptx", "Received Date": "—", Permission: "Print and web", Status: "Approved", "Print Section": "Advertisements", "Proposed Page": "—", "Web Include": "Yes", "Credit / Caption": "—", Notes: "", "Print Include": "Yes", Remarks: "" },
    { "Item ID": "ADV-027", "Title / Item": "Aniket Pal Advertisement", Type: "Advertisement", "Contributor / Company": "Aniket Pal (company name unavailable)", "Passing Year": "—", Branch: "—", "Source File Name": "—", "Received Date": "—", Permission: "Print and web", Status: "Excluded – Source artwork not available", "Print Section": "Advertisements", "Proposed Page": "—", "Web Include": "No", "Credit / Caption": "—", Notes: "Source: Debojit Dutta Biswas. Sponsor sheet states that the company name is unavailable. No matching file is visible in the screenshots.", "Print Include": "No", Remarks: "Confirmed excluded from website, print and Sponsor Acknowledgements: company name incomplete or unavailable." },
    { "Item ID": "COV-001", "Title / Item": "একই শিকড় — Official Cover", Type: "Cover", "Contributor / Company": "BECAA", "Passing Year": "—", Branch: "—", "Source File Name": "cover page new.png", "Received Date": "—", Permission: "Print and web", Status: "Approved", "Print Section": "—", "Proposed Page": "—", "Web Include": "Yes", "Credit / Caption": "—", Notes: "", "Print Include": "Yes", Remarks: "" },
  ];
}

function runADV027Override() {
  const rows = baseRows();
  const updated = buildV4TrackerRows(HEADERS, rows);
  const adv027 = updated.find((r) => r["Item ID"] === "ADV-027");
  assert.equal(adv027["Title / Item"], "Best Compliment from Sarc Epic");
  assert.equal(adv027["Contributor / Company"], "Sarc Epic");
  assert.equal(adv027.Status, "Approved");
  assert.equal(adv027["Web Include"], "Yes");
  assert.equal(adv027["Print Include"], "Yes");
  assert.equal(adv027["Received Date"], "15.09.2026");
  assert.equal(adv027.Notes, DECISIONS["ADV-027"].fields.Notes);
  assert.match(adv027.Notes, /Sarc Epic/);
  assert.match(adv027.Notes, /AniketPal \(Debojit da\)/);
  // Old remark preserved, new one appended (not erased, not duplicated).
  assert.ok(adv027.Remarks.startsWith("Confirmed excluded from website, print and Sponsor Acknowledgements: company name incomplete or unavailable."), "old remark preserved");
  assert.ok(adv027.Remarks.includes("Sprint v4: re-included as ADV-027, Approved, Sarc Epic — see Notes."), "new remark appended");
  // Item ID itself must never change.
  assert.equal(adv027["Item ID"], "ADV-027");
  console.log("PASS: ADV-027 field overrides applied, old remark preserved, new remark appended.");
}

function runNewRowsAppended() {
  const rows = baseRows();
  const updated = buildV4TrackerRows(HEADERS, rows);
  assert.equal(updated.length, rows.length + 2, "exactly two new rows added");
  const idx027 = updated.findIndex((r) => r["Item ID"] === "ADV-027");
  const idx028 = updated.findIndex((r) => r["Item ID"] === "ADV-028");
  const idx029 = updated.findIndex((r) => r["Item ID"] === "ADV-029");
  assert.equal(idx028, idx027 + 1, "ADV-028 appended directly after ADV-027");
  assert.equal(idx029, idx028 + 1, "ADV-029 appended directly after ADV-028");

  const adv028 = updated[idx028];
  assert.equal(adv028["Title / Item"], "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate");
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
  assert.deepEqual(Object.keys(adv028), HEADERS, "row is normalized to the full header set, in header order");

  const adv029 = updated[idx029];
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
  assert.deepEqual(Object.keys(adv029), HEADERS);

  // Rows unrelated to ADV-027/028/029/22 are byte-for-byte untouched.
  assert.deepEqual(updated.find((r) => r["Item ID"] === "ADV-026"), rows.find((r) => r["Item ID"] === "ADV-026"));
  assert.deepEqual(updated.find((r) => r["Item ID"] === "COV-001"), rows.find((r) => r["Item ID"] === "COV-001"));
  console.log("PASS: ADV-028 and ADV-029 appended directly after ADV-027 with the full column shape.");
}

function runRow22Remark() {
  const rows = baseRows();
  const updated = buildV4TrackerRows(HEADERS, rows);
  const row22 = updated.find((r) => r["Item ID"] === "22");
  assert.match(row22.Remarks, /Sprint v4: revised source received 15\.09\.2026/);
  assert.match(row22.Remarks, /SHA-256 0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2/);
  assert.match(row22.Remarks, /SHA-256 83ae8311a1db9205946b5f7f207985eccace7dbf54d771fed3680a9a11d63af9/);
  assert.match(row22.Remarks, /04_MAGAZINE_WORKING\/SUPERSEDED_SOURCES\/2026-09-15\//);
  // Nothing else on row 22 changes.
  const { Remarks, ...rest } = row22;
  const { Remarks: oldRemarks, ...oldRest } = rows.find((r) => r["Item ID"] === "22");
  assert.deepEqual(rest, oldRest, "row 22: only Remarks changes");
  console.log("PASS: row 22 (the poem) carries the revised-source remark, verbatim hash.");
}

function runIdempotent() {
  const rows = baseRows();
  const once = buildV4TrackerRows(HEADERS, rows);
  const twice = buildV4TrackerRows(HEADERS, once);
  assert.deepEqual(twice, once, "a second application over already-updated rows is a no-op");
  assert.equal(twice.length, once.length);
  // The remark is not duplicated on a second application.
  const row22 = twice.find((r) => r["Item ID"] === "22");
  assert.equal(row22.Remarks.split("Sprint v4: revised source received 15.09.2026").length, 2, "row 22 remark appended exactly once");
  const adv027 = twice.find((r) => r["Item ID"] === "ADV-027");
  assert.equal(adv027.Remarks.split("Sprint v4: re-included as ADV-027").length, 2, "ADV-027 remark appended exactly once");
  console.log("PASS: buildV4TrackerRows is idempotent.");
}

function runInconsistentStateThrows() {
  const rows = baseRows();
  const partial = insertRowsAfter(rows, "ADV-027", [Object.fromEntries(HEADERS.map((h) => [h, ADV_028_ROW[h] ?? ""]))]);
  assert.throws(() => buildV4TrackerRows(HEADERS, partial), /Inconsistent tracker state/, "only ADV-028 present (no ADV-029) must throw, never silently proceed");
  console.log("PASS: a partially-applied state is refused, not silently patched.");
}

function runNewRowsExportShape() {
  assert.deepEqual(NEW_ROWS, [ADV_028_ROW, ADV_029_ROW]);
  console.log("PASS: NEW_ROWS exports ADV-028 then ADV-029, in order.");
}

runADV027Override();
runNewRowsAppended();
runRow22Remark();
runIdempotent();
runInconsistentStateThrows();
runNewRowsExportShape();
console.log("All tracker-v4-core unit tests passed.");
