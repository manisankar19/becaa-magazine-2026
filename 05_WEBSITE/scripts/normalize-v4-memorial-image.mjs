import path from "node:path";
import { projectRoot, siteRoot, ensureDir } from "./lib.mjs";
import { normalizeImageVariant, WEB_SPEC, PRINT_SPEC } from "./image-normalize-core.mjs";

export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "Supriyo.JPG");
export const webOutputPath = path.join(siteRoot, "src", "assets", "normalized", "advertisements", "web", "ADV-029-late-shri-bhakta-mohon-mitra-web.jpg");
export const printOutputPath = path.join(siteRoot, "src", "assets", "normalized", "advertisements", "print", "ADV-029-late-shri-bhakta-mohon-mitra-print.jpg");

export async function normalizeMemorialImage() {
  ensureDir(path.dirname(webOutputPath));
  ensureDir(path.dirname(printOutputPath));
  await normalizeImageVariant(sourcePath, webOutputPath, WEB_SPEC);
  await normalizeImageVariant(sourcePath, printOutputPath, PRINT_SPEC);
  return { webOutputPath, printOutputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await normalizeMemorialImage();
  console.log(`Web derivative:   ${path.relative(projectRoot, webOutputPath)}`);
  console.log(`Print derivative: ${path.relative(projectRoot, printOutputPath)}`);
}
