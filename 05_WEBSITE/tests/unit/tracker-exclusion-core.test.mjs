// Unit test for scripts/tracker-exclusion-core.mjs — Sprint v2 Task 2.
// Hermetic: no file I/O, no xlsx.
import assert from "node:assert/strict";
import { applyExclusionDecisions } from "../../scripts/tracker-exclusion-core.mjs";

function makeRows() {
  return [
    { "Item ID": "19", "Title / Item": "Saraswati Devi", "Web Include": "Yes", "Print Include": "Yes", Status: "Approved", Remarks: "" },
    { "Item ID": "20", "Title / Item": "Climate Change and its Impact on Amchi Mumbai", "Web Include": "Yes", "Print Include": "", Status: "Approved", Remarks: "" },
    { "Item ID": "21", "Title / Item": "Chatgpt", "Web Include": "Yes", "Print Include": "", Status: "Approved", Remarks: "" },
    { "Item ID": "24", "Title / Item": "Siddhartha Mukhopadhyay story", "Web Include": "Yes", "Print Include": "", Status: "Awaiting", Remarks: "" },
  ];
}

function runAppliesOnlyToTargetedRows() {
  const rows = makeRows();
  const decisions = {
    20: { webInclude: "No", printInclude: "No", status: "Excluded – Source file not received", remarksNote: "Named source file not found anywhere in the project." },
    24: { webInclude: "No", printInclude: "No", status: "Excluded – Content and permission pending", remarksNote: "Source docx contains only placeholder text; permission still Pending." },
  };
  const result = applyExclusionDecisions(rows, decisions);

  const item19 = result.find((r) => r["Item ID"] === "19");
  assert.deepEqual(item19, rows[0], "an item with no decision must pass through completely unchanged");

  const item21 = result.find((r) => r["Item ID"] === "21");
  assert.deepEqual(item21, rows[2], "an item with no decision must pass through completely unchanged");

  const item20 = result.find((r) => r["Item ID"] === "20");
  assert.equal(item20["Web Include"], "No");
  assert.equal(item20["Print Include"], "No");
  assert.equal(item20.Status, "Excluded – Source file not received");
  assert.match(item20.Remarks, /Named source file not found/);

  const item24 = result.find((r) => r["Item ID"] === "24");
  assert.equal(item24["Web Include"], "No");
  assert.equal(item24["Print Include"], "No");
  assert.equal(item24.Status, "Excluded – Content and permission pending");
  assert.match(item24.Remarks, /placeholder text/);

  console.log("PASS: exclusion decisions apply only to targeted rows; all others pass through unchanged.");
}

function runPreservesExistingRemarks() {
  const rows = [{ "Item ID": "20", "Web Include": "Yes", "Print Include": "", Status: "Approved", Remarks: "Prior note." }];
  const result = applyExclusionDecisions(rows, {
    20: { webInclude: "No", printInclude: "No", status: "Excluded – Source file not received", remarksNote: "New note." },
  });
  assert.match(result[0].Remarks, /Prior note\./);
  assert.match(result[0].Remarks, /New note\./);
  console.log("PASS: applying a decision appends to existing Remarks rather than overwriting them.");
}

function runNoDecisionsIsNoOp() {
  const rows = makeRows();
  const result = applyExclusionDecisions(rows, {});
  assert.deepEqual(result, rows, "an empty decisions map must leave every row unchanged");
  console.log("PASS: an empty decisions map is a no-op.");
}

runAppliesOnlyToTargetedRows();
runPreservesExistingRemarks();
runNoDecisionsIsNoOp();
console.log("All tracker-exclusion-core unit tests passed.");
