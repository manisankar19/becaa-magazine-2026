import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, siteRoot, sha256, ensureDir } from "./lib.mjs";
import { buildArticleMarkdown } from "./article-markdown-core.mjs";

export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "v2-incoming", "Palash Article.docx");
export const outputPath = path.join(siteRoot, "src", "content", "articles", "ART-011-item.md");

// Text-only import per sprints/v2/PRD.md #5: the docx contains one embedded
// illustration (word/media/image1.png) that is not surfaced inline, matching
// how every other current ART- item renders (no inline images in body text).
export async function extractPalashArticle() {
  const { value: rawText } = await mammoth.extractRawText({ path: sourcePath });
  const markdown = buildArticleMarkdown({
    id: "ART-011",
    title: "বেঁচে থাকার লড়াই ও স্বপ্নের পথ",
    sourceFile: "02_INCOMING_CONTENT/v2-incoming/Palash Article.docx",
    fingerprint: sha256(sourcePath),
    bodyText: rawText,
  });
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractPalashArticle();
  console.log(`Extracted: ${path.relative(projectRoot, outputPath)}`);
}
