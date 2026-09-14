import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, siteRoot, sha256, ensureDir } from "./lib.mjs";
import { buildArticleMarkdown, docxHtmlToParagraphText } from "./article-markdown-core.mjs";

// Sprint v3 Task 4 (sprints/v3/PRD.md §4.2, Decision D): tracker Item 24,
// now approved, becomes ART-012. The revised DOCX (received 2026-09-14) holds
// the complete Bengali story "প্যাঁড়া"; the superseded placeholder file is
// archived under 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/.
export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "v2-incoming", "Siddhartha Mukhopadhyay story.docx");
export const outputPath = path.join(siteRoot, "src", "content", "articles", "ART-012-item.md");

export async function extractSiddharthaStory() {
  const { value: html } = await mammoth.convertToHtml({ path: sourcePath });
  const markdown = buildArticleMarkdown({
    id: "ART-012",
    title: "প্যাঁড়া",
    sourceFile: "02_INCOMING_CONTENT/v2-incoming/Siddhartha Mukhopadhyay story.docx",
    fingerprint: sha256(sourcePath),
    bodyText: docxHtmlToParagraphText(html),
  });
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractSiddharthaStory();
  console.log(`Extracted: ${path.relative(projectRoot, outputPath)}`);
}
