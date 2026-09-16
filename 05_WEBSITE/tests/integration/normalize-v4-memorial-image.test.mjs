// Integration test for scripts/normalize-v4-memorial-image.mjs — Sprint v4 Task 12.
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import { sha256 } from "../../scripts/lib.mjs";
import { normalizeMemorialImage, sourcePath, webOutputPath, printOutputPath } from "../../scripts/normalize-v4-memorial-image.mjs";

async function main() {
  const sourceHashBefore = sha256(sourcePath);

  await normalizeMemorialImage();

  assert.ok(fs.existsSync(webOutputPath), "web derivative must exist");
  assert.ok(fs.existsSync(printOutputPath), "print derivative must exist");

  const webMeta = await sharp(webOutputPath).metadata();
  const printMeta = await sharp(printOutputPath).metadata();

  // Format
  assert.equal(webMeta.format, "jpeg", "web derivative must be a JPEG");
  assert.equal(printMeta.format, "jpeg", "print derivative must be a JPEG");

  // Exact dimensions per acceptance criteria.
  assert.equal(webMeta.width, 1600, "web derivative width must be 1600px");
  assert.equal(webMeta.height, 1600, "web derivative height must be 1600px");
  assert.equal(printMeta.width, 1687, "print derivative width must be 1687px (source already below the 2480px print cap; withoutEnlargement prevents upscaling)");
  assert.equal(printMeta.height, 1687, "print derivative height must be 1687px");

  // Aspect ratio exactly 1:1 — no crop or distortion.
  assert.equal(webMeta.width / webMeta.height, 1, "web derivative must be exactly square (no crop or distortion)");
  assert.equal(printMeta.width / printMeta.height, 1, "print derivative must be exactly square (no crop or distortion)");

  // Print width must clear the validator's A4 warning threshold.
  assert.ok(printMeta.width >= 1116, "print derivative width must be at least 1,116px");

  // Source file must be byte-identical before and after — the script never mutates the original.
  const sourceHashAfter = sha256(sourcePath);
  assert.equal(sourceHashAfter, sourceHashBefore, "source file must be byte-identical before and after normalization");

  console.log("All normalize-v4-memorial-image integration tests passed.");
}

await main();
