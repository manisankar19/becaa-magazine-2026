// Integration test for scripts/extract-v2-golap.mjs — Sprint v2 Task 5.
// Runs the real extraction against the real source docx and checks the
// produced Markdown file against mammoth's raw output and the project's
// established front-matter/body convention.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, siteRoot, sha256 } from "../../scripts/lib.mjs";
import { extractGolap, outputPath, sourcePath } from "../../scripts/extract-v2-golap.mjs";

async function run() {
  await extractGolap();

  assert.ok(fs.existsSync(outputPath), "output Markdown file must exist");
  const written = fs.readFileSync(outputPath, "utf8");

  const { value: rawText } = await mammoth.extractRawText({ path: sourcePath });
  const expectedBody = rawText.trim();

  assert.match(written, /^---\nid: ART-010\n/);
  assert.match(written, /\ntitle: "গোলাপ"\n/);
  assert.match(written, new RegExp(`\\nsource_fingerprint: ${sha256(sourcePath)}\\n`));
  assert.match(written, /\nverification: verified\n/);
  assert.ok(written.endsWith(`---\n${expectedBody}\n`), "body must be the verbatim, trimmed mammoth extraction");
  assert.ok(written.includes("এনেছি এক গোলাপের চারা"), "must contain the poem's actual Bengali text, not a placeholder");

  console.log("PASS: ART-010 (গোলাপ) extracted verbatim with correct front matter.");
}

await run();
