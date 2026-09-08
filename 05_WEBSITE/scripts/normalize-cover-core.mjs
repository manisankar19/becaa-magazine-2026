import sharp from "sharp";

// Re-encodes a cover image losslessly at identical pixel dimensions and DPI
// density. sharp omits EXIF/XMP/ICC metadata by default unless withMetadata()
// is called, so this also strips any embedded author name or authoring-tool
// identifiers without needing to touch pixels.
export async function normalizeCoverBuffer(inputBuffer) {
  const sourceMeta = await sharp(inputBuffer).metadata();
  const buffer = await sharp(inputBuffer).png().toBuffer();
  const outputMeta = await sharp(buffer).metadata();
  return { buffer, width: outputMeta.width, height: outputMeta.height, density: outputMeta.density, sourceMeta, outputMeta };
}
