// Integration test for scripts/extract-v2-palash-article.mjs — Sprint v2 Task 6.
import assert from "node:assert/strict";
import fs from "node:fs";
import mammoth from "mammoth";
import { sha256 } from "../../scripts/lib.mjs";
import { extractPalashArticle, outputPath, sourcePath } from "../../scripts/extract-v2-palash-article.mjs";

async function run() {
  await extractPalashArticle();

  assert.ok(fs.existsSync(outputPath), "output Markdown file must exist");
  const written = fs.readFileSync(outputPath, "utf8");

  const { value: rawText } = await mammoth.extractRawText({ path: sourcePath });
  const expectedBody = rawText.trim();

  assert.match(written, /^---\nid: ART-011\n/);
  assert.match(written, /\ntitle: "বেঁচে থাকার লড়াই ও স্বপ্নের পথ"\n/);
  assert.match(written, new RegExp(`\\nsource_fingerprint: ${sha256(sourcePath)}\\n`));
  assert.match(written, /\nverification: verified\n/);
  assert.ok(written.endsWith(`---\n${expectedBody}\n`), "body must be the verbatim, trimmed mammoth extraction (text-only, no embedded image)");
  assert.ok(written.includes("Palash Biswas, Mech 2006"), "byline must be present (it is embedded in the source text itself)");
  assert.ok(!written.includes("<img"), "no image markup should be introduced (text-only import per the PRD decision)");
  assert.ok(!/^GAL-|word\/media/.test(written), "the embedded DOCX image must not be referenced");

  console.log("PASS: ART-011 (Palash Biswas article) extracted verbatim, text-only, with correct front matter.");
}

await run();
