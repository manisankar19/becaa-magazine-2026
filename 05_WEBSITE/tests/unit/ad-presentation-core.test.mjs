// Unit test for scripts/ad-presentation-core.mjs — Sprint v3 Task 10, extended
// Sprint v4 Task 9 for `presentation`/`text_lines` (sprints/v4/PRD.md §5, Decision E). Hermetic.
import assert from "node:assert/strict";
import { validateAdvertisementPresentation } from "../../scripts/ad-presentation-core.mjs";

const ad = (over = {}) => ({ id: "ADV-018", type: "advertisement", title: "With best compliments from Eframe", contributor: "Eframe", web_include: true, print_include: true, page_background: "#d1cd1c", page_background_mode: "auto", page_ink: "dark", ...over });
const errs = (over) => validateAdvertisementPresentation(ad(over));

assert.deepEqual(errs(), [], "a correct published advertisement has no errors");
assert.ok(errs({ title: "Eframe Advertisement" }).some((e) => /Advertisement/.test(e) && /title/i.test(e)), "title ending in 'Advertisement' is an error");
assert.ok(errs({ title: "With best compliments from Eframe Ltd" }).some((e) => /title/i.test(e)), "title must use the contributor verbatim");
assert.ok(errs({ page_background: "d1cd1c" }).some((e) => /page_background/.test(e)), "malformed hex");
assert.ok(errs({ page_background_mode: "sometimes" }).some((e) => /page_background_mode/.test(e)), "bad mode enum");
assert.ok(errs({ page_ink: "blue" }).some((e) => /page_ink/.test(e)), "bad ink enum");
assert.ok(errs({ page_background: undefined }).some((e) => /page_background/.test(e)), "auto/manual mode requires a colour");
assert.deepEqual(errs({ page_background: undefined, page_background_mode: "none", page_ink: undefined }), [], "mode none needs no colour");
assert.ok(errs({ page_ink: "light" }).some((e) => /page_ink/.test(e) && /contrast/i.test(e)), "declared ink must actually reach 4.5:1 on the background");
assert.deepEqual(errs({ page_ink: "auto" }), [], "page_ink auto is resolved at validation time");
assert.deepEqual(validateAdvertisementPresentation({ id: "ADV-009", type: "advertisement", title: "Worldline India Advertisement", contributor: "Worldline India", web_include: false, print_include: false }), [], "unpublished advertisements are not checked");
assert.deepEqual(validateAdvertisementPresentation({ id: "GAL-007", type: "gallery", title: "Chatgpt", contributor: "Kallol Roy", web_include: true, print_include: true }), [], "non-advertisements are not checked");
assert.deepEqual(errs({ page_background: undefined, page_background_mode: undefined, page_ink: undefined }).filter((e) => /page_background/.test(e)).length, 1, "a published advertisement with no background fields at all reports the missing colour (mode defaults to auto)");

// --- Sprint v4 Task 9: presentation kinds (artwork default / text / memorial) ---

// artwork: explicit presentation matches the implicit default; forbids text_lines
assert.deepEqual(errs({ presentation: "artwork" }), [], "explicit presentation:'artwork' behaves exactly like the default");
assert.ok(errs({ text_lines: ["Some stray line"] }).some((e) => /text_lines/.test(e)), "artwork forbids text_lines (non-empty array)");
assert.ok(errs({ text_lines: [] }).some((e) => /text_lines/.test(e)), "artwork forbids text_lines (even an empty array)");

// unknown presentation kind
assert.ok(errs({ presentation: "banner" }).some((e) => /presentation/.test(e)), "an unrecognised presentation kind is an error");

// text presentation
const textAd = (over = {}) => ad({
  presentation: "text",
  title: "Best Compliment from Sarc Epic",
  text_lines: ["Best Compliment from Sarc Epic"],
  page_background: "#f3efe6",
  page_background_mode: "manual",
  page_ink: "auto",
  web_asset: undefined,
  print_asset: undefined,
  ...over
});
const textErrs = (over) => validateAdvertisementPresentation(textAd(over));

assert.deepEqual(textErrs(), [], "a valid text-presentation advertisement has no errors");
assert.ok(textErrs({ text_lines: ["Line one", "Line two"] }).some((e) => /text_lines/.test(e)), "text presentation requires exactly one line (two lines is an error)");
assert.ok(textErrs({ text_lines: [] }).some((e) => /text_lines/.test(e)), "text presentation requires exactly one line (zero lines is an error)");
assert.ok(textErrs({ title: "Something else entirely" }).some((e) => /title/i.test(e)), "text presentation title must equal text_lines[0] exactly");
assert.ok(textErrs({ web_asset: "assets/normalized/advertisements/web/ADV-027-web.jpg" }).some((e) => /asset/i.test(e)), "text presentation forbids a web_asset");
assert.ok(textErrs({ print_asset: "assets/normalized/advertisements/print/ADV-027-print.jpg" }).some((e) => /asset/i.test(e)), "text presentation forbids a print_asset");
assert.ok(textErrs({ title: "Best Compliment from Sarc Epic Advertisement", text_lines: ["Best Compliment from Sarc Epic Advertisement"] }).some((e) => /Advertisement/.test(e) && /title/i.test(e)), "text presentation title still forbids the 'Advertisement' suffix");

// memorial presentation
const memorialLines = [
  "In fond memory of",
  "Late Shri Bhakta Mohon Mitra",
  "B E (Mechanical) April 1951",
  "Bengal Engineering College, Shibpur, Howrah.",
  "With Love from",
  "Subrata Mitra (son)",
  "Soma Mitra (daughter)"
];
const memorialAd = (over = {}) => ad({
  presentation: "memorial",
  title: "In fond memory of Late Shri Bhakta Mohon Mitra",
  text_lines: memorialLines,
  page_background: "#f3efe6",
  page_background_mode: "manual",
  page_ink: "auto",
  web_asset: "assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg",
  print_asset: "assets/normalized/advertisements/print/ADV-029-late-shri-bhakta-mohon-mitra-print.jpg",
  ...over
});
const memorialErrs = (over) => validateAdvertisementPresentation(memorialAd(over));

assert.deepEqual(memorialErrs(), [], "a valid memorial-presentation advertisement has no errors");
assert.ok(memorialErrs({ text_lines: memorialLines.slice(0, 2) }).some((e) => /text_lines/.test(e)), "memorial requires at least 3 lines (2 lines is an error)");
assert.ok(memorialErrs({ title: "Some unrelated title" }).some((e) => /title/i.test(e)), "memorial title must equal text_lines[0] + ' ' + text_lines[1]");
assert.ok(memorialErrs({ web_asset: "" }).some((e) => /asset/i.test(e)), "memorial requires a non-empty web_asset");
assert.ok(memorialErrs({ print_asset: "" }).some((e) => /asset/i.test(e)), "memorial requires a non-empty print_asset");
assert.ok(memorialErrs({ title: `${memorialLines[0]} ${memorialLines[1]} Advertisement` }).some((e) => /Advertisement/.test(e) && /title/i.test(e)), "memorial presentation title still forbids the 'Advertisement' suffix");

console.log("All ad-presentation-core unit tests passed.");
