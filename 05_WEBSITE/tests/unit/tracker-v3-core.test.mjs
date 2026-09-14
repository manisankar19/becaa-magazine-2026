// Unit test for scripts/tracker-v3-core.mjs — Sprint v3 Task 8.
// Hermetic: no file I/O, no xlsx.
import assert from "node:assert/strict";
import { applyTrackerFieldUpdates } from "../../scripts/tracker-v3-core.mjs";

function makeRows() {
  return [
    { "Item ID": "18", "Title / Item": "Secretary Desk", Permission: "Print and web", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes", "Received Date": "01.08.2026", Remarks: "" },
    { "Item ID": "19", "Title / Item": "Saraswati Devi", Permission: "Print and web", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes", "Received Date": "", Remarks: "" },
    { "Item ID": "24", "Title / Item": "Siddhartha Mukhopadhyay story", Permission: "Pending", Status: "Excluded – Content and permission pending", "Web Include": "No", "Print Include": "No", "Received Date": "", Remarks: "Sprint v2: placeholder text." },
  ];
}

function runAppliesFieldsAndAppendsRemarks() {
  const rows = makeRows();
  const result = applyTrackerFieldUpdates(rows, {
    18: { remarksNote: "Sprint v3: revised source received." },
    24: { fields: { "Title / Item": "প্যাঁড়া (Siddhartha Mukhopadhyay story)", Permission: "Print and web", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes", "Received Date": "14.09.2026" }, remarksNote: "Sprint v3: approved; published as ART-012." },
  });
  assert.notEqual(result, rows, "returns a new array");
  assert.deepEqual(rows[2].Status, "Excluded – Content and permission pending", "input rows are not mutated");
  assert.deepEqual(result[1], rows[1], "a row with no decision passes through unchanged");

  const r18 = result[0];
  assert.deepEqual({ ...r18, Remarks: "" }, { ...rows[0], Remarks: "" }, "Item 18: only Remarks changes");
  assert.equal(r18.Remarks, "Sprint v3: revised source received.");

  const r24 = result[2];
  assert.equal(r24["Title / Item"], "প্যাঁড়া (Siddhartha Mukhopadhyay story)");
  assert.equal(r24.Permission, "Print and web");
  assert.equal(r24.Status, "Approved");
  assert.equal(r24["Web Include"], "Yes");
  assert.equal(r24["Print Include"], "Yes");
  assert.equal(r24["Received Date"], "14.09.2026");
  assert.equal(r24.Remarks, "Sprint v2: placeholder text. Sprint v3: approved; published as ART-012.", "remarks are appended after existing text, not overwritten");
  console.log("PASS: applies fields and appends remarks to targeted rows only.");
}

function runIdempotentRemarks() {
  const once = applyTrackerFieldUpdates(makeRows(), { 18: { remarksNote: "Note A." } });
  const twice = applyTrackerFieldUpdates(once, { 18: { remarksNote: "Note A." } });
  assert.equal(twice[0].Remarks, "Note A.", "the same note is never appended twice");
  console.log("PASS: remarks note is idempotent.");
}

function runRejectsUnknownColumnsAndMissingIds() {
  assert.throws(() => applyTrackerFieldUpdates(makeRows(), { 24: { fields: { "Nonexistent Column": "x" } } }), /unknown column/i, "cannot invent tracker columns");
  assert.throws(() => applyTrackerFieldUpdates(makeRows(), { 99: { remarksNote: "x" } }), /not found/i, "every targeted Item ID must exist");
  assert.deepEqual(applyTrackerFieldUpdates(makeRows(), {}), makeRows(), "empty decisions is a no-op");
  console.log("PASS: guards.");
}

runAppliesFieldsAndAppendsRemarks();
runIdempotentRemarks();
runRejectsUnknownColumnsAndMissingIds();
console.log("All tracker-v3-core unit tests passed.");
