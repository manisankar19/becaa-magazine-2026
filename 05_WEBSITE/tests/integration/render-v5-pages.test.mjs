// Sprint v5 Task 16 — `npm run qa:v5-pages` renders the PDF pages a reviewer needs for this
// sprint (contents, MSG-001, ART-011) into qa-output/v5-pages/ with an index. Requires `npm run pdf`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "../../scripts/lib.mjs";
import { itemPageRanges } from "../../scripts/v4-pages-core.mjs";

const pdf = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
assert.ok(fs.existsSync(pdf), "run npm run build && npm run pdf first");
const pages = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 50_000_000 }).split("\f");
if (pages.at(-1).trim() === "") pages.pop();
const ranges = itemPageRanges(pages);

execFileSync(process.execPath, [path.join(siteRoot, "scripts", "render-v5-pages.mjs")], { cwd: siteRoot, stdio: "pipe" });
const dir = path.join(siteRoot, "qa-output", "v5-pages");
const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
assert.equal(index.pdfPages, pages.length);

const pad = (n) => String(n).padStart(2, "0");
const expected = [...index.contentsPages.map((p) => `p${pad(p)}-contents.png`)];
for (const id of ["MSG-001", "ART-011"]) {
  const { first, last } = ranges.get(id);
  for (let p = first; p <= last; p++) expected.push(`p${pad(p)}-${id}.png`);
}
assert.ok(index.contentsPages.length >= 1, "contents pages rendered");
const pngs = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
assert.deepEqual(pngs, [...expected].sort(), "exactly the contents, MSG-001 and ART-011 pages are rendered");
for (const f of pngs) {
  const buf = fs.readFileSync(path.join(dir, f));
  assert.ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && buf.length > 10_000, `${f} is a non-trivial PNG`);
}
console.log(`render-v5-pages: ${pngs.length} evidence pages (${pngs.join(", ")})`);
