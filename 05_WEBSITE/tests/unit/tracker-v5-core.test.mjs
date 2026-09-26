// Unit test for scripts/tracker-v5-core.mjs — Sprint v5 Task 11 (PRD §4.5, Decisions I, J). Hermetic.
import assert from "node:assert/strict";
import { V5_DECISIONS, V5_TRACKER_IDS, MSG_001_REMARKS_NOTE, ART_011_REMARKS_NOTE, buildV5TrackerRows } from "../../scripts/tracker-v5-core.mjs";

const headers = ["Item ID", "Title / Item", "Contributor / Company", "Passing Year", "Branch", "Source File Name", "Received Date", "Remarks"];
const row = (id, fields) => ({ "Item ID": id, "Title / Item": "", "Contributor / Company": "", "Passing Year": "", Branch: "", "Source File Name": "", "Received Date": "", Remarks: "", ...fields });
const V4_REMARK = 'Sprint v4 committee correction (02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md): published wording "বেকান পরিচয়" → "BECAA-র পরিচয়" in MSG-001; the salutation and বেকানী unchanged; original source file unchanged.';
const fixture = () => [
  row("15", { "Title / Item": "Secretary Desk", Branch: "Civil", "Source File Name": "secretary desk.docx", "Received Date": "01.08.2026", Remarks: "Keep me." }),
  row("16", { "Title / Item": "President Desk", "Contributor / Company": "Manik Barman", "Passing Year": "1987", Branch: "Civil", "Source File Name": "President Desk.docx", "Received Date": "01.08.2026", Remarks: V4_REMARK }),
  row("22", { "Title / Item": "গোলাপ", Branch: "Civil", "Source File Name": "Shubhra Basu.md" }),
  row("23", { "Title / Item": "বেঁচে থাকার লড়াই ও স্বপ্নের পথ ", "Contributor / Company": "Palash Biswas", "Passing Year": "2006", Branch: "Civil", "Source File Name": "Palash Article.docx" }),
  row("ADV-027", { "Title / Item": "Best Compliment from Sarc Epic", Branch: "—" }),
];
const byId = (rows, id) => rows.find((r) => r["Item ID"] === id);

// --- decisions ------------------------------------------------------------------
assert.deepEqual(V5_TRACKER_IDS, { "MSG-001": "16", "ART-011": "23" });
assert.deepEqual(Object.keys(V5_DECISIONS).sort(), ["16", "23"]);
assert.deepEqual(V5_DECISIONS["16"].fields, { "Source File Name": "Souvenir President message 05-09-2026.docx", "Received Date": "26.09.2026" });
assert.deepEqual(V5_DECISIONS["23"].fields, { Branch: "Mechanical" });
assert.match(MSG_001_REMARKS_NOTE, /^Sprint v5 \(2026-09-26\):/);
assert.match(MSG_001_REMARKS_NOTE, /SUPERSEDED_SOURCES\/2026-09-26\//);
assert.match(MSG_001_REMARKS_NOTE, /President Desk\.docx/);
assert.match(MSG_001_REMARKS_NOTE, /Decision H/);
assert.match(ART_011_REMARKS_NOTE, /Civil → Mechanical/);
assert.match(ART_011_REMARKS_NOTE, /Palash Biswas, Mechanical, 2006 Batch/);
assert.match(ART_011_REMARKS_NOTE, /BECAA Owner Corrections 2026-09-26\.md/);

// --- first application --------------------------------------------------------
const before = fixture();
const after = buildV5TrackerRows(headers, before);
assert.deepEqual(before, fixture(), "input rows are not mutated");
assert.equal(after.length, before.length, "no rows added or removed");

// Row 16 (MSG-001): exactly Source File Name, Received Date and Remarks change.
const r16 = byId(after, "16");
assert.equal(r16["Source File Name"], "Souvenir President message 05-09-2026.docx");
assert.equal(r16["Received Date"], "26.09.2026", "Decision I: received date is the arrival date");
assert.equal(r16.Remarks, `${V4_REMARK} ${MSG_001_REMARKS_NOTE}`, "existing remark preserved, v5 note appended");
for (const column of headers) {
  if (["Source File Name", "Received Date", "Remarks"].includes(column)) continue;
  assert.equal(r16[column], byId(before, "16")[column], `row 16 ${column} unchanged`);
}

// Row 23 (ART-011): exactly Branch and Remarks change.
const r23 = byId(after, "23");
assert.equal(r23.Branch, "Mechanical", "Decision J");
assert.equal(r23.Remarks, ART_011_REMARKS_NOTE, "note written into the empty Remarks cell, no leading space");
for (const column of headers) {
  if (["Branch", "Remarks"].includes(column)) continue;
  assert.equal(r23[column], byId(before, "23")[column], `row 23 ${column} unchanged`);
}

// Every other row is untouched (including other Civil rows).
for (const id of ["15", "22", "ADV-027"]) assert.deepEqual(byId(after, id), byId(before, id), `row ${id} untouched`);
assert.deepEqual(after.map((r) => r["Item ID"]), before.map((r) => r["Item ID"]), "row order unchanged");

// --- idempotent ---------------------------------------------------------------
const again = buildV5TrackerRows(headers, after);
assert.deepEqual(again, after, "second application is a no-op");
assert.equal(byId(again, "16").Remarks.split(MSG_001_REMARKS_NOTE).length, 2, "row 16 note appended once");
assert.equal(byId(again, "23").Remarks.split(ART_011_REMARKS_NOTE).length, 2, "row 23 note appended once");

// --- unknown item → throws -----------------------------------------------------
assert.throws(() => buildV5TrackerRows(headers, fixture().filter((r) => r["Item ID"] !== "23")), /Item ID 23 not found/);
assert.throws(() => buildV5TrackerRows(headers, fixture().filter((r) => r["Item ID"] !== "16")), /Item ID 16 not found/);
// Unknown column (a tracker without the Branch column) → throws rather than inventing one.
assert.throws(() => buildV5TrackerRows(headers, fixture().map(({ Branch, ...rest }) => rest)), /unknown column "Branch"/);

console.log("tracker-v5-core: all assertions passed");
