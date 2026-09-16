import path from "node:path";
import { projectRoot, siteRoot, ensureDir } from "./lib.mjs";
import { normalizeImageVariant, WEB_SPEC, PRINT_SPEC } from "./image-normalize-core.mjs";

// base = `${id}-${slugify(title)}`, matching import-approved.mjs's naming
// (slugify("Chatgpt") -> "chatgpt").
export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "chatgpt kallol.jpeg");
export const webOutputPath = path.join(siteRoot, "src", "assets", "normalized", "images", "web", "GAL-007-chatgpt-web.jpg");
export const printOutputPath = path.join(siteRoot, "src", "assets", "normalized", "images", "print", "GAL-007-chatgpt-print.jpg");

export async function normalizeGalleryImage() {
  ensureDir(path.dirname(webOutputPath));
  ensureDir(path.dirname(printOutputPath));
  await normalizeImageVariant(sourcePath, webOutputPath, WEB_SPEC);
  await normalizeImageVariant(sourcePath, printOutputPath, PRINT_SPEC);
  return { webOutputPath, printOutputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await normalizeGalleryImage();
  console.log(`Web derivative:   ${path.relative(projectRoot, webOutputPath)}`);
  console.log(`Print derivative: ${path.relative(projectRoot, printOutputPath)}`);
}
