// Integration test for scripts/normalize-cover-core.mjs — Sprint v2 Task 3.
// Operates on the real replacement cover file (read-only) to verify the
// normalization transform: same pixel dimensions, same DPI density, and no
// EXIF/XMP metadata (which on this file includes a personal author name and
// Canva document/user IDs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { normalizeCoverBuffer } from "../../scripts/normalize-cover-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, "..", "..", "..", "02_INCOMING_CONTENT", "v2-incoming", "cover page new.png");

async function run() {
  const input = fs.readFileSync(sourcePath);
  const sourceMeta = await sharp(input).metadata();
  assert.equal(sourceMeta.width, 1240);
  assert.equal(sourceMeta.height, 1748);
  assert.ok(sourceMeta.exif, "precondition: source file is expected to carry EXIF we intend to strip");
  assert.ok(sourceMeta.xmp, "precondition: source file is expected to carry XMP we intend to strip");
  assert.ok(input.includes(Buffer.from("Manisankar")), "precondition: source metadata contains the author's name");

  const { buffer: output } = await normalizeCoverBuffer(input);
  const outputMeta = await sharp(output).metadata();

  assert.equal(outputMeta.width, sourceMeta.width, "width must be unchanged (no resize/recrop)");
  assert.equal(outputMeta.height, sourceMeta.height, "height must be unchanged (no resize/recrop)");
  assert.equal(outputMeta.density, sourceMeta.density, "DPI density must be preserved for print suitability");
  assert.equal(outputMeta.exif, undefined, "EXIF must be stripped");
  assert.equal(outputMeta.xmp, undefined, "XMP must be stripped");
  assert.ok(!output.includes(Buffer.from("Manisankar")), "author name must not survive in the normalized output");
  assert.ok(!output.includes(Buffer.from("Canva")), "Canva document/user identifiers must not survive in the normalized output");

  console.log("PASS: cover normalization preserves dimensions/DPI and strips personal/Canva metadata.");
}

await run();
