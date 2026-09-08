// Unit test for scripts/tracker-merge-core.mjs — Sprint v2 Task 1.
// Hermetic: no file I/O, no xlsx. Fixtures mirror the real tracker's column
// shape (17 headers) and the addendum's shape (15 headers, no "Print
// Include" / "Remarks").
import assert from "node:assert/strict";
import { mergeAddendumRows } from "../../scripts/tracker-merge-core.mjs";

const HEADERS = [
  "Item ID", "Title / Item", "Type", "Contributor / Company", "Passing Year", "Branch",
  "Source File Name", "Received Date", "Permission", "Status", "Print Section",
  "Proposed Page", "Web Include", "Credit / Caption", "Notes", "Print Include", "Remarks",
];

function makeMainRows() {
  return [
    { "Item ID": "1", "Title / Item": "Tokenomics", "Type": "Technical Article", "Contributor / Company": "Sudip Mazumder", "Passing Year": "", "Branch": "", "Source File Name": "Artical Sudip Mazumdar .pdf", "Received Date": "", "Permission": "Print and web", "Status": "Approved", "Print Section": "", "Proposed Page": "", "Web Include": "Yes", "Credit / Caption": "", "Notes": "", "Print Include": "Yes", "Remarks": "" },
    { "Item ID": "COV-001", "Title / Item": "একই শিকড় — Official Cover", "Type": "Cover", "Contributor / Company": "BECAA Maharashtra", "Passing Year": "—", "Branch": "—", "Source File Name": "Cover page.jpg", "Received Date": "02.08.2026", "Permission": "Print and web", "Status": "Approved", "Print Section": "Front Cover", "Proposed Page": "1", "Web Include": "Yes", "Credit / Caption": "—", "Notes": "Preserve exactly.", "Print Include": "Yes", "Remarks": "Confirmed official magazine title." },
  ];
}

function makeAddendumRows() {
  // Deliberately only the 15 columns the real addendum sheet has.
  const shortHeaders = HEADERS.filter((h) => h !== "Print Include" && h !== "Remarks");
  const row20 = Object.fromEntries(shortHeaders.map((h) => [h, ""]));
  Object.assign(row20, { "Item ID": 20, "Title / Item": "Climate Change and its Impact on Amchi Mumbai", "Type": "Technical Article", "Contributor / Company": "Sudipta Chakraborty", "Source File Name": "Article for BECAA Maharashtra Souveneir.pdf", "Permission": "Print and web", "Status": "Approved", "Web Include": "Yes" });
  const row21 = Object.fromEntries(shortHeaders.map((h) => [h, ""]));
  Object.assign(row21, { "Item ID": 21, "Title / Item": "Chatgpt", "Type": "Painting / Drawing", "Contributor / Company": "Kallol Roy", "Source File Name": "chatgpt kallol.jpeg", "Permission": "Print and web", "Status": "Approved", "Web Include": "Yes" });
  return [row20, row21];
}

function runMergeHappyPath() {
  const mainRows = makeMainRows();
  const addendumRows = makeAddendumRows();
  const merged = mergeAddendumRows({
    headers: HEADERS,
    mainRows,
    addendumRows,
    coverUpdate: {
      itemId: "COV-001",
      newSourceFileName: "cover page new.png",
      remarksNote: (previous) => `V2 cover replacement applied; previous source preserved as "${previous}".`,
    },
  });

  assert.equal(merged.length, mainRows.length + addendumRows.length, "merged row count should be main + addendum");

  const item1 = merged.find((r) => String(r["Item ID"]) === "1");
  assert.deepEqual(item1, mainRows[0], "pre-existing non-cover row must be byte-identical");

  const cover = merged.find((r) => String(r["Item ID"]) === "COV-001");
  assert.equal(cover["Source File Name"], "cover page new.png", "cover source file must be replaced");
  assert.match(cover.Remarks, /Cover page\.jpg/, "remarks must retain a trace of the previous cover file");
  assert.match(cover.Remarks, /Confirmed official magazine title\./, "existing remarks text must be preserved, not overwritten");

  const item20 = merged.find((r) => String(r["Item ID"]) === "20");
  assert.equal(item20["Title / Item"], "Climate Change and its Impact on Amchi Mumbai");
  assert.equal(item20["Print Include"], "", "columns absent from the addendum must default to an empty string, not be dropped");
  assert.equal(item20["Remarks"], "");

  const item21 = merged.find((r) => String(r["Item ID"]) === "21");
  assert.equal(item21["Source File Name"], "chatgpt kallol.jpeg");

  console.log("PASS: happy-path merge appends addendum rows and updates the cover without disturbing existing rows.");
}

function runDuplicateAgainstMainDetection() {
  const mainRows = makeMainRows();
  const addendumRows = [{ ...makeAddendumRows()[0], "Item ID": "1" }]; // collides with existing row "1"
  assert.throws(
    () => mergeAddendumRows({ headers: HEADERS, mainRows, addendumRows }),
    /Duplicate Item ID/,
    "merging a row whose ID already exists in the main tracker must throw"
  );
  console.log("PASS: duplicate-against-main Item ID is rejected.");
}

function runDuplicateWithinAddendumDetection() {
  const mainRows = makeMainRows();
  const one = makeAddendumRows()[0];
  const addendumRows = [one, { ...one }]; // same ID twice within the addendum
  assert.throws(
    () => mergeAddendumRows({ headers: HEADERS, mainRows, addendumRows }),
    /Duplicate Item ID/,
    "two addendum rows sharing an ID must throw"
  );
  console.log("PASS: duplicate-within-addendum Item ID is rejected.");
}

runMergeHappyPath();
runDuplicateAgainstMainDetection();
runDuplicateWithinAddendumDetection();
console.log("All tracker-merge-core unit tests passed.");
