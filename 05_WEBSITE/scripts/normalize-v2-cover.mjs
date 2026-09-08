import fs from "node:fs";
import path from "node:path";
import { projectRoot, sha256 } from "./lib.mjs";
import { normalizeCoverBuffer } from "./normalize-cover-core.mjs";

const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "v2-incoming", "cover page new.png");
const outputDir = path.join(projectRoot, "05_WEBSITE", "src", "assets", "normalized", "cover");
const outputPath = path.join(outputDir, "cover page new.png");

if (!fs.existsSync(sourcePath)) {
  console.error(`Source cover not found: ${sourcePath}`);
  process.exit(1);
}

const input = fs.readFileSync(sourcePath);
const { buffer, width, height, density, sourceMeta } = await normalizeCoverBuffer(input);

if (width !== sourceMeta.width || height !== sourceMeta.height) {
  console.error(`Normalization changed dimensions: source ${sourceMeta.width}x${sourceMeta.height}, output ${width}x${height}.`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, buffer);

console.log(`Normalized cover written: ${path.relative(projectRoot, outputPath)}`);
console.log(`Dimensions: ${width}x${height}, density: ${density} DPI.`);
console.log(`Source SHA-256: ${sha256(sourcePath)}`);
console.log(`Normalized SHA-256: ${sha256(outputPath)}`);
