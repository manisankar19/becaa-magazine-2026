import fs from "node:fs";
import path from "node:path";
import { projectRoot, siteRoot, sha256, readManifest } from "./lib.mjs";

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
const newSourceFile = "02_INCOMING_CONTENT/cover page new.png";
const newAsset = "assets/normalized/cover/cover page new.png";

const before = readManifest();
if (!before.cover) {
  console.error("Manifest has no cover block; refusing to proceed.");
  process.exit(1);
}
if (!fs.existsSync(path.join(siteRoot, "src", newAsset))) {
  console.error(`Normalized cover asset not found: ${newAsset}. Run "npm run normalize:v2-cover" first.`);
  process.exit(1);
}

const newFingerprint = sha256(path.join(projectRoot, newSourceFile));

let text = fs.readFileSync(manifestPath, "utf8");
const oldSourceFileLine = `  source_file: ${before.cover.source_file}`;
const oldAssetLine = `  asset: ${before.cover.asset}`;
const oldFingerprintLine = `  source_fingerprint: ${before.cover.source_fingerprint}`;

for (const line of [oldSourceFileLine, oldAssetLine, oldFingerprintLine]) {
  if (!text.includes(line)) {
    console.error(`Expected line not found in publication.yaml (aborting, no changes written): ${line}`);
    process.exit(1);
  }
}

text = text
  .replace(oldSourceFileLine, `  source_file: ${newSourceFile}`)
  .replace(oldAssetLine, `  asset: ${newAsset}`)
  .replace(oldFingerprintLine, `  source_fingerprint: ${newFingerprint}`);

fs.writeFileSync(manifestPath, text, "utf8");

const after = readManifest(); // re-parse to confirm the file is still valid YAML
console.log(`COV-001 manifest entry updated. source_file: ${after.cover.source_file}`);
console.log(`New fingerprint: ${after.cover.source_fingerprint}`);
