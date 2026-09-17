// Unit test for scripts/validate-tracker-core.mjs — Sprint v3 Task 9; extended
// Sprint v4 Task 14 for the ADV-027 revision and the ADV-028/029 rows
// (sprints/v4/PRD.md §4.3-4.4, Decision E: text-only/memorial advertisements
// carry their own approved wording and, for text-only rows, no source
// artwork at all). Hermetic: rule evaluation over in-memory rows, no xlsx.
import assert from "node:assert/strict";
import { validateTrackerRows, EXPECTED_SHEETS, EXPECTED_ROW_COUNT } from "../../scripts/validate-tracker-core.mjs";

function baseRows() {
  const rows = [];
  for (let i = 1; i <= 19; i++) rows.push({ "Item ID": String(i), "Title / Item": `Item ${i}`, "Contributor / Company": `Person ${i}`, "Source File Name": `f${i}.docx`, Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  rows.push({ "Item ID": "20", "Title / Item": "Climate Change", "Contributor / Company": "Sudipta Chakraborty", "Source File Name": "x.pdf", Status: "Excluded – Source file not received", "Web Include": "No", "Print Include": "No" });
  for (const i of [21, 22, 23]) rows.push({ "Item ID": String(i), "Title / Item": `Item ${i}`, "Contributor / Company": `Person ${i}`, "Source File Name": `f${i}.docx`, Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  rows.push({ "Item ID": "24", "Title / Item": "প্যাঁড়া (Siddhartha Mukhopadhyay story)", "Contributor / Company": "Siddhartha Mukhopadhyay", "Source File Name": "Siddhartha Mukhopadhyay story.docx", Permission: "Print and web", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  rows.push({ "Item ID": "COV-001", "Title / Item": "একই শিকড় — Official Cover", "Contributor / Company": "BECAA", "Source File Name": "cover page new.png", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  // ADV-001..ADV-026: standard artwork advertisements (or excluded), unchanged since Sprint v3.
  const ads = ["Skylark", "PNB Housing", "Vistaar Finance", "Gainwell Technologies", "Tata Capital Ltd. (Retail Finance)", "Tata Capital Housing Finance Ltd.", "OnShore Construction Pvt Ltd", "Roofs & Ceilings", "Worldline India", "Indus Grand", "Axelon", "Aarvi Encon", "Anand Rathi", "Future Netwings Solutions", "Swaraj Shoes", "Not Known", "UREDCONNECT", "Eframe", "Network Techlabs", "Schnelltech Global", "Bhavik", "Pratap Caterer", "Clover Blakefield Reality LLP", "Eegrab", "mepass", "CETEST"];
  const excluded = new Set([9, 16, 24, 25]);
  ads.forEach((company, idx) => {
    const n = idx + 1;
    const id = `ADV-${String(n).padStart(3, "0")}`;
    rows.push(excluded.has(n)
      ? { "Item ID": id, "Title / Item": `${company} Advertisement`, "Contributor / Company": company, "Source File Name": "—", Status: "Excluded – Source artwork not available", "Web Include": "No", "Print Include": "No" }
      : { "Item ID": id, "Title / Item": `With best compliments from ${company}`, "Contributor / Company": company, "Source File Name": `${n} ${company}.jpeg`, Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  });
  // ADV-027/028 — Sprint v4 text-only advertisements: no source artwork at
  // all (Source File Name "—"), approved wording instead of the compliments
  // pattern. ADV-029 — the memorial: a real source photo, its own wording.
  rows.push({ "Item ID": "ADV-027", "Title / Item": "Best Compliment from Sarc Epic", "Contributor / Company": "Sarc Epic", "Source File Name": "—", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  rows.push({ "Item ID": "ADV-028", "Title / Item": "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate", "Contributor / Company": "M/s Balajee Infrate", "Source File Name": "—", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  rows.push({ "Item ID": "ADV-029", "Title / Item": "In fond memory of Late Shri Bhakta Mohon Mitra", "Contributor / Company": "Subrata Mitra (son), Soma Mitra (daughter)", "Source File Name": "Supriyo.JPG", Status: "Approved", "Web Include": "Yes", "Print Include": "Yes" });
  assert.equal(rows.length, EXPECTED_ROW_COUNT, "fixture mirrors the live tracker's 54 rows");
  return rows;
}

function errorsFor(mutate) {
  const rows = baseRows();
  if (mutate) mutate(rows);
  return validateTrackerRows(rows, [...EXPECTED_SHEETS]);
}

function runValidStateIsClean() {
  assert.deepEqual(errorsFor(), [], "the approved Sprint v3 state must validate cleanly");
  console.log("PASS: v3 fixture validates clean.");
}

function runStaleAdvertisementTitleFails() {
  const errors = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-018")["Title / Item"] = "Eframe Advertisement"; });
  assert.ok(errors.some((e) => /ADV-018/.test(e) && /With best compliments from/.test(e)), `expected a title error, got: ${errors}`);
  console.log("PASS: a published advertisement still titled '… Advertisement' fails.");
}

function runWrongCompanyInTitleFails() {
  const errors = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-001")["Title / Item"] = "With best compliments from Skylark Ltd"; });
  assert.ok(errors.some((e) => /ADV-001/.test(e)), "title must use the row's own Contributor / Company verbatim");
  console.log("PASS: a compliments title with a different company fails.");
}

function runExcludedAdsAreNotTitleChecked() {
  const errors = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-009")["Title / Item"] = "Worldline India Advertisement"; });
  assert.deepEqual(errors, [], "excluded advertisements keep their old titles without error");
  console.log("PASS: excluded advertisements are exempt from the title rule.");
}

function runItem24MustBeApprovedAndIncluded() {
  const errors = errorsFor((rows) => { const r = rows.find((x) => x["Item ID"] === "24"); r.Status = "Excluded – Content and permission pending"; r["Web Include"] = "No"; r["Print Include"] = "No"; r.Permission = "Pending"; });
  assert.ok(errors.some((e) => /Item 24/.test(e) && /Approved/.test(e)), `expected an Item 24 rule error, got: ${errors}`);
  console.log("PASS: Item 24 must now be approved and included.");
}

function runItem20StillExcluded() {
  const errors = errorsFor((rows) => { const r = rows.find((x) => x["Item ID"] === "20"); r.Status = "Approved"; r["Web Include"] = "Yes"; });
  assert.ok(errors.some((e) => /Item 20/.test(e)), "Item 20 must remain excluded");
  console.log("PASS: Item 20 rule retained.");
}

function runTextOnlyAdvertisementsAreExemptFromTheArtworkRule() {
  // ADV-027/028 (Source File Name "—", Web Include Yes) must NOT trip the
  // "web-enabled without approved available artwork" rule — that is by
  // design for a text-only advertisement, not a missing-intake defect.
  assert.deepEqual(errorsFor(), [], "the approved Sprint v4 state (including the two text-only rows) validates clean");
  console.log("PASS: ADV-027/028 text-only rows (no Source File Name) do not trip the artwork rule.");
}

function runTextOnlyAdvertisementTitleMustMatchTheApprovedSentence() {
  const errors = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-027")["Title / Item"] = "With best compliments from Sarc Epic"; });
  assert.ok(errors.some((e) => /ADV-027/.test(e) && /Best Compliment from Sarc Epic/.test(e)), `expected ADV-027 to require its own approved wording, got: ${errors}`);
  const errors2 = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-028")["Title / Item"] = "Balajee Infrate Advertisement"; });
  assert.ok(errors2.some((e) => /ADV-028/.test(e)), "ADV-028 must also require its own approved wording");
  console.log("PASS: text-only advertisement titles must equal their approved sentence, not the compliments pattern.");
}

function runMemorialTitleMustMatchAndKeepsItsArtworkRequirement() {
  const errors = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-029")["Title / Item"] = "With best compliments from Subrata Mitra"; });
  assert.ok(errors.some((e) => /ADV-029/.test(e) && /In fond memory of Late Shri Bhakta Mohon Mitra/.test(e)), `expected ADV-029 to require the memorial wording, got: ${errors}`);
  // Unlike the text-only rows, the memorial genuinely has source artwork — the rule still applies to it.
  const errors2 = errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-029")["Source File Name"] = "—"; });
  assert.ok(errors2.some((e) => /ADV-029/.test(e) && /artwork/.test(e)), "the memorial still requires its Source File Name (it has a real source photo)");
  console.log("PASS: the memorial keeps its own wording requirement and the artwork-required rule.");
}

function runStructuralRulesRetained() {
  assert.ok(errorsFor((rows) => rows.pop()).some((e) => /54/.test(e)), "row count rule");
  assert.ok(errorsFor((rows) => { rows[1]["Item ID"] = "1"; }).some((e) => /Duplicate/i.test(e)), "duplicate ID rule");
  assert.ok(validateTrackerRows(baseRows(), ["Content Tracker"]).some((e) => /sheets/i.test(e)), "sheet names rule");
  assert.ok(errorsFor((rows) => { rows.find((r) => r["Item ID"] === "COV-001")["Source File Name"] = "Cover page.jpg"; }).some((e) => /COV-001/.test(e)), "cover rule");
  assert.ok(errorsFor((rows) => { rows.find((r) => r["Item ID"] === "ADV-002").Status = "Placed in Word"; }).some((e) => /ADV-002/.test(e)), "web-enabled ad must be approved");
  console.log("PASS: pre-existing structural rules retained.");
}

runValidStateIsClean();
runStaleAdvertisementTitleFails();
runWrongCompanyInTitleFails();
runExcludedAdsAreNotTitleChecked();
runItem24MustBeApprovedAndIncluded();
runItem20StillExcluded();
runTextOnlyAdvertisementsAreExemptFromTheArtworkRule();
runTextOnlyAdvertisementTitleMustMatchTheApprovedSentence();
runMemorialTitleMustMatchAndKeepsItsArtworkRequirement();
runStructuralRulesRetained();
console.log("All validate-tracker-rules unit tests passed.");
