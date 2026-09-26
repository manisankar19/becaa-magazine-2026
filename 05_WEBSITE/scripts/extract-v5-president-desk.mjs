import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, siteRoot, sha256, ensureDir } from "./lib.mjs";
import { buildArticleMarkdown, docxHtmlToParagraphText } from "./article-markdown-core.mjs";

// Sprint v5 Task 4 (sprints/v5/PRD.md, Decisions A, B, C, E, F): replace the
// MSG-001 body with the President's new English message received 2026-09-26.
// The display title "President Desk" is kept (A); the source heading stays as
// the first body line in plain text (B); the wording is published exactly as
// supplied (C) — approved corrections are applied later from the v5
// correction record; the four charity items are one bulleted list (E); the
// three tiny embedded images are layout artefacts and are never imported (F).
// The superseded Bengali source is archived under
// 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/.
const SOURCE_RELATIVE = "02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx";
export const EXPECTED_SOURCE_SHA256 = "67d8a418d781e5bdad16985ceca4f64c6a40bd40d10a3cf075c9bd18dc9f3bf7";
export const sourcePath = path.join(projectRoot, ...SOURCE_RELATIVE.split("/"));
export const outputPath = path.join(siteRoot, "src", "content", "messages", "MSG-001-president-desk.md");

export function verifySourceFingerprint(filePath) {
  const actual = sha256(filePath);
  if (actual !== EXPECTED_SOURCE_SHA256) {
    throw new Error(
      `extract-v5-president-desk: refusing to run — SHA-256 of ${path.relative(projectRoot, filePath)} is ${actual}, expected ${EXPECTED_SOURCE_SHA256}`
    );
  }
  return actual;
}

// The extracted Markdown, verbatim from the fingerprinted source. Sprint v5 Task 6: the
// published file is this plus the recorded owner corrections (npm run corrections:apply-v5),
// so re-running the extraction on the real file must be followed by that step.
export async function buildPresidentDeskMarkdown() {
  const fingerprint = verifySourceFingerprint(sourcePath);
  const { value: html } = await mammoth.convertToHtml({ path: sourcePath });
  return buildArticleMarkdown({
    id: "MSG-001",
    title: "President Desk",
    sourceFile: SOURCE_RELATIVE,
    fingerprint,
    bodyText: docxHtmlToParagraphText(html, { lists: true }),
  });
}

export async function extractPresidentDesk({ outputPath: target = outputPath } = {}) {
  const markdown = await buildPresidentDeskMarkdown();
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, markdown, "utf8");
  return target;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractPresidentDesk();
  console.log(`Extracted: ${path.relative(projectRoot, outputPath)} — now run: npm run corrections:apply-v5`);
}
