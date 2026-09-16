// Integration test for scripts/extract-v3-siddhartha-story.mjs — Sprint v3 Task 4.
import assert from "node:assert/strict";
import fs from "node:fs";
import mammoth from "mammoth";
import { sha256 } from "../../scripts/lib.mjs";
import { docxHtmlToParagraphText } from "../../scripts/article-markdown-core.mjs";
import { extractSiddharthaStory, outputPath, sourcePath } from "../../scripts/extract-v3-siddhartha-story.mjs";

async function run() {
  await extractSiddharthaStory();

  assert.ok(fs.existsSync(outputPath), "output Markdown file must exist");
  const written = fs.readFileSync(outputPath, "utf8");

  const { value: html } = await mammoth.convertToHtml({ path: sourcePath });
  const expectedBody = docxHtmlToParagraphText(html).trim();
  const { value: rawText } = await mammoth.extractRawText({ path: sourcePath });

  assert.equal(sha256(sourcePath), "9bbe16d10ca51c310a61ca0936ee886b761eb45710a8c46d655473afebdb1c65", "the revised DOCX must be the file received on 2026-09-14");
  assert.match(written, /^---\nid: ART-012\n/);
  assert.match(written, /\ntitle: "প্যাঁড়া"\n/, "manifest title is the document's own title (Decision D)");
  assert.match(written, /\nsource_file: "02_INCOMING_CONTENT\/Siddhartha Mukhopadhyay story\.docx"\n/);
  assert.match(written, /\nsource_fingerprint: 9bbe16d10ca51c310a61ca0936ee886b761eb45710a8c46d655473afebdb1c65\n/);
  assert.match(written, /\nverification: verified\n/);
  assert.ok(written.endsWith(`---\n${expectedBody}\n`), "body must equal the independent re-extraction exactly");

  const body = written.split("---\n").slice(2).join("---\n");
  assert.ok(body.startsWith("প্যাঁড়া/ সিদ্ধার্থ মুখোপাধ্যায়\n\n"), "title/author line kept verbatim as the first line");
  assert.ok(body.trimEnd().endsWith("প্যারানোইয়াটা থেকেই যেত।"), "last sentence intact (no truncation)");
  assert.equal(body.replace(/\s+/g, ""), rawText.replace(/\s+/g, ""), "every non-whitespace character of the raw extraction is present, in order (no rewording)");
  assert.ok(!body.includes("�"), "no replacement characters (no mojibake)");
  assert.ok(!/Story upcoming/.test(body), "placeholder text from the superseded file must be gone");
  assert.ok(!/<img|data:image|<\/?(p|strong|em|br)\b|NEEDS VERIFICATION|TODO|TBD/.test(written), "no HTML, images or unresolved markers");
  assert.ok(body.length >= 4800, `body should be the full ~4,837-character story, got ${body.length}`);

  console.log("PASS: ART-012 (Siddhartha Mukhopadhyay, প্যাঁড়া) extracted verbatim with correct front matter.");
}

await run();
