// Unit test for scripts/advertisement-title-core.mjs — Sprint v3 Task 6.
// Hermetic: pure functions, no file I/O.
import assert from "node:assert/strict";
import { deriveComplimentsTitle, retitleAdvertisements } from "../../scripts/advertisement-title-core.mjs";

function ad(id, title, contributor) {
  return { id, type: "advertisement", title, contributor, web_include: true, print_include: true };
}
function row(id, title, company) {
  return { "Item ID": id, "Title / Item": title, "Contributor / Company": company };
}

function runDerive() {
  assert.equal(deriveComplimentsTitle(ad("ADV-018", "Eframe Advertisement", "Eframe")), "With best compliments from Eframe");
  assert.equal(deriveComplimentsTitle(ad("ADV-005", "Tata Capital Ltd. Retail Finance Advertisement", "Tata Capital Ltd. (Retail Finance)")), "With best compliments from Tata Capital Ltd. (Retail Finance)", "the recorded contributor is used verbatim, not the old title's flattened form");
  assert.equal(deriveComplimentsTitle(ad("ADV-008", "Roofs & Ceilings Advertisement", "Roofs & Ceilings")), "With best compliments from Roofs & Ceilings");
  assert.equal(deriveComplimentsTitle(ad("ADV-099", "Advertisement from Acme", "Acme")), "With best compliments from Acme", "second generic pattern");
  assert.equal(deriveComplimentsTitle(ad("ADV-098", "With best compliments from Acme", "Acme")), "With best compliments from Acme", "already-correct title is returned unchanged (idempotent)");
  assert.throws(() => deriveComplimentsTitle(ad("ADV-097", "Acme Advertisement", "")), /contributor/i, "empty contributor must throw");
  assert.throws(() => deriveComplimentsTitle(ad("ADV-096", "Acme Advertisement", "   ")), /contributor/i, "blank contributor must throw");
  assert.throws(() => deriveComplimentsTitle(ad("ADV-095", "Acme Summer Campaign", "Acme")), /unrecognised title/i, "an unexpected title pattern is surfaced, never silently rewritten");
  console.log("PASS: deriveComplimentsTitle.");
}

function runRetitleHappyPath() {
  const items = [
    { id: "MSG-001", type: "message", title: "President Desk", contributor: "Manik Barman" },
    ad("ADV-001", "Skylark Advertisement", "Skylark"),
    ad("ADV-018", "Eframe Advertisement", "Eframe"),
    { id: "GAL-007", type: "gallery", title: "Chatgpt", contributor: "Kallol Roy" },
  ];
  const rows = [row("ADV-001", "Skylark Advertisement", "Skylark"), row("ADV-018", "Eframe Advertisement", "Eframe"), row("18", "Secretary Desk", "Abir Banerjee")];
  const result = retitleAdvertisements(items, rows);
  assert.notEqual(result.items, items, "input array is not mutated");
  assert.deepEqual(items[1].title, "Skylark Advertisement", "input objects are not mutated");
  assert.equal(result.items[1].title, "With best compliments from Skylark");
  assert.equal(result.items[2].title, "With best compliments from Eframe");
  assert.deepEqual(result.items[0], items[0], "non-advertisement items untouched");
  assert.deepEqual(result.items[3], items[3], "gallery items untouched");
  assert.deepEqual(result.changes, [
    { id: "ADV-001", from: "Skylark Advertisement", to: "With best compliments from Skylark" },
    { id: "ADV-018", from: "Eframe Advertisement", to: "With best compliments from Eframe" },
  ]);
  console.log("PASS: retitleAdvertisements happy path.");
}

function runRetitleGuards() {
  assert.throws(
    () => retitleAdvertisements([ad("ADV-001", "Skylark Advertisement", "Skylark")], [row("ADV-001", "Skylark Advertisement", "Skylark Ltd")]),
    /mismatch/i,
    "manifest contributor must equal the tracker Contributor / Company",
  );
  assert.throws(
    () => retitleAdvertisements([ad("ADV-001", "Skylark Advertisement", "Skylark")], []),
    /tracker row/i,
    "a published advertisement without a tracker row is an error",
  );
  assert.throws(() => retitleAdvertisements([ad("ADV-001", "Skylark Advertisement", "")], [row("ADV-001", "Skylark Advertisement", "")]), /contributor/i);
  assert.throws(() => retitleAdvertisements([ad("ADV-001", "Skylark Campaign", "Skylark")], [row("ADV-001", "Skylark Campaign", "Skylark")]), /unrecognised title/i);
  // Excluded (not-included) advertisements are left alone even if present.
  const excluded = { ...ad("ADV-009", "Worldline India Advertisement", "Worldline India"), web_include: false, print_include: false };
  const result = retitleAdvertisements([excluded], []);
  assert.deepEqual(result.items[0], excluded, "an advertisement that is not published is not retitled");
  assert.deepEqual(result.changes, []);
  console.log("PASS: retitleAdvertisements guards.");
}

// Sprint v4 (sprints/v4/PRD.md §5, Decision E): text-only and memorial
// advertisements are never retitled to the compliments pattern, even though
// they are published — their title is intentionally something other than
// "With best compliments from [Company]" and does not match either generic
// pattern, so without this guard retitleAdvertisements would throw.
function runTextAndMemorialPresentationsAreNeverRetitled() {
  const textAd = { id: "ADV-027", type: "advertisement", title: "Best Compliment from Sarc Epic", contributor: "Sarc Epic", presentation: "text", web_include: true, print_include: true };
  const memorialAd = { id: "ADV-029", type: "advertisement", title: "In fond memory of Late Shri Bhakta Mohon Mitra", contributor: "Subrata Mitra (son), Soma Mitra (daughter)", presentation: "memorial", web_include: true, print_include: true };
  const result = retitleAdvertisements([textAd, memorialAd], []);
  assert.deepEqual(result.items[0], textAd, "a text-presentation advertisement is left exactly as-is");
  assert.deepEqual(result.items[1], memorialAd, "a memorial-presentation advertisement is left exactly as-is");
  assert.deepEqual(result.changes, [], "neither generates a change");
  // No tracker row is even looked up for them (no throw despite an empty tracker rows array).
  console.log("PASS: text/memorial presentation advertisements are never retitled to the compliments pattern.");
}

runDerive();
runRetitleHappyPath();
runRetitleGuards();
runTextAndMemorialPresentationsAreNeverRetitled();
console.log("All advertisement-title-core unit tests passed.");
