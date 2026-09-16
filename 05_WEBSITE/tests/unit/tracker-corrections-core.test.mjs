// Unit test for scripts/tracker-corrections-core.mjs — Sprint v4 Task 28 (PRD §4.7 item 7). Hermetic.
import assert from "node:assert/strict";
import { CORRECTION_DECISIONS, TRACKER_IDS, buildCorrectionTrackerRows } from "../../scripts/tracker-corrections-core.mjs";
import { V4_CORRECTIONS } from "../../scripts/v4-corrections.mjs";

const headers = ["Item ID", "Title / Item", "Type", "Contributor / Company", "Notes", "Remarks"];
const row = (id, title, contributor, remarks = "") => ({ "Item ID": id, "Title / Item": title, Type: "Article", "Contributor / Company": contributor, Notes: "", Remarks: remarks });
const fixture = () => [
  row("5", "স্মৃতির গলিতে", "বিশ্বজিৎ চক্রবর্তী"),
  row("6", "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "Biswajit Sengupta"),
  row("7", "A Reflection on Cancer, Ageing, and Helplessness in the Face of Science", "Biswajit Sengupta"),
  row("16", "President Desk", "Manik Barman"),
  row("17", "Vice Preseident Desk", "Debojit Dutta Biswas", "Existing remark."),
  row("18", "Secretary Desk", "Someone Else"),
  row("22", "গোলাপ", "Shubhra Basu", "Sprint v4: revised source …"),
];
const byId = (rows, id) => rows.find((r) => r["Item ID"] === id);

// --- mapping to tracker rows (manifest notes: "Tracker Item ID N") -------------
assert.deepEqual(TRACKER_IDS, { "MSG-001": "16", "MSG-002": "17", "ART-003": "5", "ART-004": "6", "ART-005": "7" });

// --- first application --------------------------------------------------------
const before = fixture();
const after = buildCorrectionTrackerRows(headers, before);
assert.deepEqual(before, fixture(), "input rows are not mutated");
assert.equal(after.length, before.length, "no rows added or removed");

// MSG-002: title field corrected, existing remark preserved, note appended once.
assert.equal(byId(after, "17")["Title / Item"], "Vice President Desk");
assert.ok(byId(after, "17").Remarks.startsWith("Existing remark. "), "existing remark preserved");
assert.match(byId(after, "17").Remarks, /Vice Preseident Desk.*Vice President Desk/);

// MSG-001 and ART-003: remarks record the exact old → new text from the corrections module.
for (const [trackerId, manifestId] of [["16", "MSG-001"], ["5", "ART-003"]]) {
  for (const c of V4_CORRECTIONS.filter((x) => x.id === manifestId)) {
    assert.ok(byId(after, trackerId).Remarks.includes(`"${c.find}" → "${c.replace}"`), `${manifestId}: remark records ${c.find} → ${c.replace}`);
  }
  assert.equal(byId(after, trackerId)["Title / Item"], byId(before, trackerId)["Title / Item"], `${manifestId}: title unchanged`);
}
assert.match(byId(after, "16").Remarks, /salutation/, "MSG-001 remark states the salutation is unchanged");

// ART-004 / ART-005: Late display name recorded; contributor field unchanged.
for (const id of ["6", "7"]) {
  assert.equal(byId(after, id)["Contributor / Company"], "Biswajit Sengupta", `row ${id}: contributor unchanged (provenance)`);
  assert.match(byId(after, id).Remarks, /Late Biswajit Sengupta/);
  assert.match(byId(after, id).Remarks, /display_name/);
}

// Every note names its source, and none records a date of death.
for (const id of Object.values(TRACKER_IDS)) {
  const remarks = byId(after, id).Remarks;
  assert.match(remarks, /BECAA Committee Corrections 2026-09-16\.md/, `row ${id}: source recorded`);
  assert.ok(!/September|passed away|died/i.test(remarks), `row ${id}: no date or circumstances of death`);
}

// Rows outside the five are untouched.
for (const id of ["18", "22"]) assert.deepEqual(byId(after, id), byId(before, id), `row ${id} untouched`);

// --- idempotent ---------------------------------------------------------------
assert.deepEqual(buildCorrectionTrackerRows(headers, after), after, "second application is a no-op");

// --- unknown row → throws -------------------------------------------------------
assert.throws(() => buildCorrectionTrackerRows(headers, fixture().filter((r) => r["Item ID"] !== "6")), /Item ID 6 not found/);
assert.ok(Object.keys(CORRECTION_DECISIONS).length === 5);

console.log("tracker-corrections-core: all assertions passed");
