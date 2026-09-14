// Sprint v3 Task 41 (carried from v2 Task 19) — the cover page must not show a sliver of the
// next page. Renders page 1 of the built PDF at 200 DPI and walks the lower part row by row:
// after the cover image ends, the only ink allowed before the bottom of the page is the page
// number (a short band in the centre column). Requires `npm run build && npm run pdf`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { siteRoot } from "../../scripts/lib.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
assert.ok(fs.existsSync(pdf), "run npm run build && npm run pdf first");
const outDir = path.join(siteRoot, "tests", "screenshots");
fs.mkdirSync(outDir, { recursive: true });
const prefix = path.join(outDir, "task41-cover-page1");
execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-singlefile", "-png", "-r", "200", pdf, prefix]);
const { data, info } = await sharp(`${prefix}.png`).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

// Classify each row: "image" (wide non-white coverage), "ink" (some non-white pixels), "white".
const rowState = (y) => {
  let nonWhite = 0;
  for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * C;
    if (data[i] < 230 || data[i + 1] < 230 || data[i + 2] < 230) nonWhite++;
  }
  return nonWhite > W / 20 ? "image" : nonWhite > 0 ? "ink" : "white";
};
const states = Array.from({ length: H }, (_, y) => rowState(y));
const imageBottom = states.lastIndexOf("image");
assert.ok(imageBottom > H * 0.5, "cover image occupies most of the page");

// Page number: a centred band in the bottom 8 %; everything else below the image must be white.
const pageNumberTop = Math.round(H * 0.92);
const stray = [];
for (let y = imageBottom + 1; y < H; y++) {
  if (states[y] === "white") continue;
  if (y >= pageNumberTop) {
    // page number: ink only within the centre 15 % of the width
    let outside = 0;
    for (let x = 0; x < W; x += 2) {
      if (Math.abs(x - W / 2) < W * 0.075) continue;
      const i = (y * W + x) * C;
      if (data[i] < 230 || data[i + 1] < 230 || data[i + 2] < 230) outside++;
    }
    if (outside) stray.push(y);
  } else {
    stray.push(y);
  }
}
const mm = (y) => ((y / H) * 297).toFixed(1);
assert.deepEqual(stray, [], `ink rows between the cover image (ends at ${mm(imageBottom)} mm) and the page number: rows ${stray.slice(0, 5).join(", ")}${stray.length > 5 ? "…" : ""} (${mm(stray[0] ?? 0)} mm) — the next page is bleeding onto page 1`);

// The contents heading must be the first thing on page 2, and nothing else moves.
const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 30_000_000 }).split("\f");
assert.equal(text.length - 1, 69, "page count unchanged");
assert.match(text[1].trim().split("\n")[0], /একই শিকড়/, "page 2 starts with the contents heading");
assert.ok(!/একই শিকড়.*Contents/.test(text[0]), "page 1 carries no contents text");
console.log(`PASS: cover page clean — image ends at ${mm(imageBottom)} mm, no stray ink before the page number, 69 pages.`);
