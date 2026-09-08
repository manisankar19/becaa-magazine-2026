import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, siteRoot, sha256, ensureDir } from "./lib.mjs";
import { buildArticleMarkdown } from "./article-markdown-core.mjs";

export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "v2-incoming", "Shubhra Basu.docx");
export const outputPath = path.join(siteRoot, "src", "content", "articles", "ART-010-item.md");

export async function extractGolap() {
  const { value: rawText } = await mammoth.extractRawText({ path: sourcePath });
  const markdown = buildArticleMarkdown({
    id: "ART-010",
    title: "গোলাপ",
    sourceFile: "02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.docx",
    fingerprint: sha256(sourcePath),
    bodyText: rawText,
  });
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractGolap();
  console.log(`Extracted: ${path.relative(projectRoot, outputPath)}`);
}
