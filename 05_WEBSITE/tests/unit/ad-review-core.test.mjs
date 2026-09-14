// Unit test for scripts/ad-review-core.mjs — Sprint v3 Task 16. Hermetic.
import assert from "node:assert/strict";
import { buildReviewMarkdown, contactSheetLayout, swatchSvg } from "../../scripts/ad-review-core.mjs";

const entries = [
  { id: "ADV-018", title: "With best compliments from Eframe", page_background: "#d1cd1c", page_background_mode: "auto", ink: "dark", inkColour: "#20201d", ratio: 9.69, pdfPage: 62, pdfImage: "pdf-advertisements/ADV-018-page.png", webImage: "advertisements/desktop-ADV-018.png" },
  { id: "ADV-019", title: "With best compliments from Network Techlabs", page_background: "#2b2f31", page_background_mode: "manual", ink: "light", inkColour: "#fbfaf7", ratio: 12.95, pdfPage: 63, pdfImage: "pdf-advertisements/ADV-019-page.png", webImage: "advertisements/desktop-ADV-019.png" },
];
const md = buildReviewMarkdown(entries, { generated: "2026-09-14T00:00:00Z", contactSheet: "ad-backgrounds/contact-sheet.png" });
assert.match(md, /^# Advertisement page backgrounds — review sheet\n/);
assert.ok(md.includes("Generated: 2026-09-14T00:00:00Z"));
assert.ok(md.includes("| ADV-018 | With best compliments from Eframe |"), "one row per advertisement");
assert.ok(md.includes("`#d1cd1c`") && md.includes("auto") && md.includes("dark") && md.includes("9.69"), "swatch hex, mode, ink and ratio present");
assert.ok(md.includes("swatches/ADV-018.svg"), "swatch image reference");
assert.ok(md.includes("../pdf-advertisements/ADV-018-page.png") && md.includes("../advertisements/desktop-ADV-018.png"), "thumbnails link to the QA renders relative to the sheet");
assert.ok(md.includes("**manual**"), "manual overrides are emphasised");
assert.ok(md.includes("contact-sheet.png"));
assert.equal((md.match(/^\| ADV-/gm) || []).length, 2);

const layout = contactSheetLayout(5, 200, 283, 3, 10);
assert.deepEqual(layout.positions, [
  { left: 10, top: 10 }, { left: 220, top: 10 }, { left: 430, top: 10 },
  { left: 10, top: 303 }, { left: 220, top: 303 },
]);
assert.deepEqual({ width: layout.width, height: layout.height }, { width: 640, height: 596 });
assert.equal(contactSheetLayout(0, 200, 283, 3, 10).height, 10);

const svg = swatchSvg("#d1cd1c", "#20201d", "ADV-018");
assert.match(svg, /^<svg /);
assert.ok(svg.includes('fill="#d1cd1c"') && svg.includes('fill="#20201d"') && svg.includes("ADV-018"));
console.log("All ad-review-core unit tests passed.");
