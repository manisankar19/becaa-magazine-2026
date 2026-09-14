import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, siteRoot, sha256, ensureDir } from "./lib.mjs";
import { buildArticleMarkdown, docxHtmlToParagraphText } from "./article-markdown-core.mjs";

// Sprint v3 Task 3 (sprints/v3/PRD.md §4.1, Decisions B and C): replace the
// MSG-003 body with the revised Secretary's Desk received 2026-09-14. Text-only
// (the embedded 162×65 px scanned signature is not imported); soft line breaks
// in the closing are preserved via docxHtmlToParagraphText; the display title
// "Secretary Desk" is unchanged. The superseded source is archived under
// 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/.
export const sourcePath = path.join(projectRoot, "02_INCOMING_CONTENT", "secretary desk.docx");
export const outputPath = path.join(siteRoot, "src", "content", "messages", "MSG-003-secretary-desk.md");

export async function extractSecretaryDesk() {
  const { value: html } = await mammoth.convertToHtml({ path: sourcePath });
  const markdown = buildArticleMarkdown({
    id: "MSG-003",
    title: "Secretary Desk",
    sourceFile: "02_INCOMING_CONTENT/secretary desk.docx",
    fingerprint: sha256(sourcePath),
    bodyText: docxHtmlToParagraphText(html),
  });
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractSecretaryDesk();
  console.log(`Extracted: ${path.relative(projectRoot, outputPath)}`);
}
