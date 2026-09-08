// Integration test for scripts/normalize-v2-gallery-image.mjs — Sprint v2 Task 7.
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import { normalizeGalleryImage, sourcePath, webOutputPath, printOutputPath } from "../../scripts/normalize-v2-gallery-image.mjs";

async function run() {
  await normalizeGalleryImage();

  assert.ok(fs.existsSync(webOutputPath), "web derivative must exist");
  assert.ok(fs.existsSync(printOutputPath), "print derivative must exist");

  const sourceMeta = await sharp(sourcePath).metadata();
  const webMeta = await sharp(webOutputPath).metadata();
  const printMeta = await sharp(printOutputPath).metadata();

  assert.equal(webMeta.format, "jpeg");
  assert.equal(printMeta.format, "jpeg");

  // Source is 1600x1236 — below both the 1600 web cap (no-op) and the 2480
  // print cap, and withoutEnlargement must prevent upscaling either one.
  assert.ok(webMeta.width <= 1600, "web derivative must not exceed the 1600px cap");
  assert.ok(printMeta.width <= 2480, "print derivative must not exceed the 2480px cap");
  assert.ok(webMeta.width <= sourceMeta.width, "must never upscale beyond the source (withoutEnlargement)");
  assert.ok(printMeta.width <= sourceMeta.width, "must never upscale beyond the source (withoutEnlargement)");

  const sourceRatio = sourceMeta.width / sourceMeta.height;
  const webRatio = webMeta.width / webMeta.height;
  const printRatio = printMeta.width / printMeta.height;
  assert.ok(Math.abs(sourceRatio - webRatio) < 0.01, "aspect ratio must be preserved (no cropping) for the web derivative");
  assert.ok(Math.abs(sourceRatio - printRatio) < 0.01, "aspect ratio must be preserved (no cropping) for the print derivative");

  console.log("PASS: GAL-007 web/print derivatives match the established resize/quality convention.");
}

await run();
