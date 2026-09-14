// Integration test for scripts/extract-v3-secretary-desk.mjs — Sprint v3 Task 3.
// Re-extracts the revised DOCX independently and asserts the shipped MSG-003
// Markdown is the verbatim, soft-line-break-preserving text of that file.
import assert from "node:assert/strict";
import fs from "node:fs";
import mammoth from "mammoth";
import { sha256 } from "../../scripts/lib.mjs";
import { docxHtmlToParagraphText } from "../../scripts/article-markdown-core.mjs";
import { extractSecretaryDesk, outputPath, sourcePath } from "../../scripts/extract-v3-secretary-desk.mjs";

async function run() {
  await extractSecretaryDesk();

  assert.ok(fs.existsSync(outputPath), "output Markdown file must exist");
  const written = fs.readFileSync(outputPath, "utf8");

  const { value: html } = await mammoth.convertToHtml({ path: sourcePath });
  const expectedBody = docxHtmlToParagraphText(html).trim();

  assert.equal(sha256(sourcePath), "ed3fd766d55e7bad364f95e8d3777c7305b52aa57458fe636f1a21d988108885", "the revised DOCX must be the file received on 2026-09-14");
  assert.match(written, /^---\nid: MSG-003\n/);
  assert.match(written, /\ntitle: "Secretary Desk"\n/, "manifest/tracker display title is kept (Decision C)");
  assert.match(written, /\nsource_file: "02_INCOMING_CONTENT\/secretary desk\.docx"\n/);
  assert.match(written, /\nsource_fingerprint: ed3fd766d55e7bad364f95e8d3777c7305b52aa57458fe636f1a21d988108885\n/);
  assert.match(written, /\nverification: verified\n/);
  assert.ok(written.endsWith(`---\n${expectedBody}\n`), "body must equal the independent re-extraction exactly");

  const body = written.split("---\n").slice(2).join("---\n");
  assert.ok(body.startsWith("From the Secretary's Desk\n\n"), "document heading line is kept verbatim inside the body");
  assert.ok(body.includes("“BECAA Maharashtra is more than an alumni association."), "pull-quote paragraph present");
  assert.ok(body.endsWith("With warm regards,\n\nAbir Banerjee\n\nETC '92\n\nSecretary  \nBECAA Maharashtra\n"), "closing lines must be separate lines (soft break kept as a Markdown hard break)");
  assert.ok(!body.includes("SecretaryBECAA"), "the V1-era concatenation must not recur");
  assert.ok(!/<img|data:image|word\/media/.test(written), "the scanned signature image is not imported (Decision B)");
  assert.ok(!/NEEDS VERIFICATION|TODO|TBD/.test(written), "no unresolved extraction markers");
  assert.ok(!/<\/?(p|strong|em|br)\b/.test(body), "no HTML tags leak into the Markdown");
  assert.equal(body.split("\n\n").length, 17, "14 body paragraphs + 3 closing lines separated by blank lines (heading counted as a paragraph)");

  console.log("PASS: MSG-003 (revised Secretary's Desk) extracted verbatim with line breaks preserved, text-only, correct front matter.");
}

await run();
