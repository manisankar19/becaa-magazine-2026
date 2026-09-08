import sharp from "sharp";

// Mirrors the exact resize/quality convention already used for every
// existing GAL-*/ADV-* item in import-approved.mjs, so new items produce
// derivatives consistent with the rest of the release.
export const WEB_SPEC = { width: 1600, quality: 88 };
export const PRINT_SPEC = { width: 2480, quality: 94 };

export async function normalizeImageVariant(inputPath, outputPath, { width, quality }) {
  await sharp(inputPath)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, chromaSubsampling: "4:4:4" })
    .toFile(outputPath);
}
