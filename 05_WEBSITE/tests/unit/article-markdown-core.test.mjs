// Unit test for scripts/article-markdown-core.mjs — Sprint v2 Tasks 5 & 6.
// Hermetic: pure string construction, no file I/O.
import assert from "node:assert/strict";
import { buildArticleMarkdown } from "../../scripts/article-markdown-core.mjs";

function runBasicFrontMatter() {
  const md = buildArticleMarkdown({
    id: "ART-010",
    title: "গোলাপ",
    sourceFile: "02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.docx",
    fingerprint: "abc123",
    bodyText: "গোলাপ\n\nশুভ্রা বসু\n\nএনেছি এক গোলাপের চারা",
  });

  assert.match(md, /^---\n/, "must start with a front-matter fence");
  assert.match(md, /\nid: ART-010\n/);
  assert.match(md, /\ntitle: "গোলাপ"\n/);
  assert.match(md, /\nsource_file: "02_INCOMING_CONTENT\/v2-incoming\/Shubhra Basu\.docx"\n/);
  assert.match(md, /\nsource_fingerprint: abc123\n/);
  assert.match(md, /\nverification: verified\n/, "defaults to verified when not specified");
  assert.match(md, /---\nগোলাপ\n\nশুভ্রা বসু\n\nএনেছি এক গোলাপের চারা\n$/, "body text must be preserved verbatim, including internal blank lines");

  console.log("PASS: basic front matter and verbatim body.");
}

function runEscapesQuotesInTitle() {
  const md = buildArticleMarkdown({
    id: "ART-999",
    title: 'A "Quoted" Title',
    sourceFile: "x.docx",
    fingerprint: "abc",
    bodyText: "body",
  });
  assert.match(md, /title: "A \\"Quoted\\" Title"/, "double quotes in the title must be escaped so the YAML front matter stays valid");
  console.log("PASS: quotes in title are escaped.");
}

function runCustomVerification() {
  const md = buildArticleMarkdown({
    id: "ART-999",
    title: "T",
    sourceFile: "x.docx",
    fingerprint: "abc",
    bodyText: "body",
    verification: "needs_verification",
  });
  assert.match(md, /\nverification: needs_verification\n/);
  console.log("PASS: verification field is overridable.");
}

runBasicFrontMatter();
runEscapesQuotesInTitle();
runCustomVerification();
console.log("All article-markdown-core unit tests passed.");
