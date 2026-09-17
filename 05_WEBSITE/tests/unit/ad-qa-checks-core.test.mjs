// Unit test for scripts/ad-qa-checks-core.mjs — Sprint v3 Task 15. Hermetic.
import assert from "node:assert/strict";
import { findBadAdvertisementTitles, findPdfPageIndex, pixelMatchesHex, contentBoxSamplePoint } from "../../scripts/ad-qa-checks-core.mjs";

// Title checks over rendered text (headings, contents entries, nav links, PDF lines).
const ads = [{ id: "ADV-018", title: "With best compliments from Eframe" }, { id: "ADV-001", title: "With best compliments from Skylark" }];
assert.deepEqual(findBadAdvertisementTitles(ads, { "ADV-018": ["With best compliments from Eframe", "With best compliments from Eframe"], "ADV-001": ["With best compliments from Skylark"] }), []);
assert.deepEqual(
  findBadAdvertisementTitles(ads, { "ADV-018": ["Eframe Advertisement"], "ADV-001": ["With best compliments from Skylark"] }),
  [{ id: "ADV-018", text: "Eframe Advertisement", reason: 'ends with "Advertisement"' }],
);
assert.deepEqual(
  findBadAdvertisementTitles(ads, { "ADV-018": ["With best compliments from Eframe Ltd"], "ADV-001": [] }),
  [{ id: "ADV-018", text: "With best compliments from Eframe Ltd", reason: "does not equal the manifest title" }, { id: "ADV-001", text: "", reason: "no rendered title found" }],
);
assert.deepEqual(findBadAdvertisementTitles(ads, { "ADV-018": ["  With best compliments from Eframe \n"], "ADV-001": ["With best compliments from Skylark"] }), [], "surrounding whitespace is ignored");

// PDF page lookup: the page whose text carries the item's kicker line.
const pages = ["cover", "contents", "MESSAGES · MSG-001\nPresident", "ADVERTISEMENTS · ADV-018\nWith best compliments from Eframe", "ADVERTISEMENTS · ADV-019\n…"];
assert.equal(findPdfPageIndex(pages, "ADV-018"), 3);
assert.equal(findPdfPageIndex(pages, "ADV-001"), -1);
assert.equal(findPdfPageIndex(["x · ADV-0181 y"], "ADV-018"), -1, "ID must match as a whole token");

// Pixel tolerance.
assert.equal(pixelMatchesHex([209, 205, 28], "#d1cd1c", 6), true);
assert.equal(pixelMatchesHex([215, 205, 28], "#d1cd1c", 6), true, "within tolerance");
assert.equal(pixelMatchesHex([216, 205, 28], "#d1cd1c", 6), false, "outside tolerance");
assert.equal(pixelMatchesHex([255, 255, 255], "#d1cd1c", 6), false);

// Where to sample: just inside the 18 mm @page margin at the given raster DPI.
assert.deepEqual(contentBoxSamplePoint(96), { x: 73, y: 73 }, "18mm ≈ 68px at 96dpi, plus a 5px inset");
assert.deepEqual(contentBoxSamplePoint(72), { x: 56, y: 56 });
// Sprint v4 (2026-09-17): a long contents title wraps, leaving the item ID alone on the next line.
{
  const { contentsEntries } = await import("../../scripts/ad-qa-checks-core.mjs");
  const lines = [
    "একই শিকড় — Contents",
    " 45. Best Compliment from Sarc Epic ADV-027",
    "",
    " 46. We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate",
    "    ADV-028",
    " 47. In fond memory of Late Shri Bhakta Mohon Mitra ADV-029",
    "Sponsor Acknowledgements / With Thanks",
  ];
  const entries = contentsEntries(lines);
  assert.deepEqual(entries.get("ADV-027"), { number: 45, title: "Best Compliment from Sarc Epic" });
  assert.deepEqual(entries.get("ADV-028"), { number: 46, title: "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate" }, "wrapped entry re-joined");
  assert.deepEqual(entries.get("ADV-029"), { number: 47, title: "In fond memory of Late Shri Bhakta Mohon Mitra" });
  assert.equal(entries.size, 3);
  // A title wrapped over two lines before the ID line.
  const two = contentsEntries([" 3. A very long title that", "continues here", "  MSG-003"]);
  assert.deepEqual(two.get("MSG-003"), { number: 3, title: "A very long title that continues here" });
}

console.log("All ad-qa-checks-core unit tests passed.");
