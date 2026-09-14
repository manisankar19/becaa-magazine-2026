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

// ---------------------------------------------------------------------------
// Sprint v3 Task 2 — docxHtmlToParagraphText(): convert mammoth.convertToHtml
// output into paragraph text that keeps DOCX soft line breaks (<br />) as
// Markdown hard line breaks, drops inline formatting/images, decodes entities.
// ---------------------------------------------------------------------------
import { docxHtmlToParagraphText } from "../../scripts/article-markdown-core.mjs";

function runSoftLineBreakBecomesHardBreak() {
  const html = "<p>With warm regards,</p><p><strong>Secretary</strong><br /><strong>BECAA Maharashtra</strong></p>";
  const text = docxHtmlToParagraphText(html);
  assert.equal(text, "With warm regards,\n\nSecretary  \nBECAA Maharashtra", "a <br /> inside a paragraph must become a Markdown hard break (two trailing spaces + newline), not be dropped");
  console.log("PASS: <br /> becomes a hard line break.");
}

function runQuotedParagraphKeepsCurlyQuotesAndDropsInlineTags() {
  const html = "<p><strong><em>“BECAA Maharashtra is more than an alumni association.”</em></strong></p>";
  assert.equal(docxHtmlToParagraphText(html), "“BECAA Maharashtra is more than an alumni association.”");
  console.log("PASS: inline emphasis stripped, curly quotes preserved.");
}

function runPlainMultiParagraphBody() {
  const html = "<p>প্যাঁড়া/ সিদ্ধার্থ মুখোপাধ্যায়</p><p>বি ই কলেজ থেকে পাশ করে না বেরোলে…</p><p>থ্যংক ইউ রামগুলাম।</p>";
  assert.equal(docxHtmlToParagraphText(html), "প্যাঁড়া/ সিদ্ধার্থ মুখোপাধ্যায়\n\nবি ই কলেজ থেকে পাশ করে না বেরোলে…\n\nথ্যংক ইউ রামগুলাম।", "paragraphs are separated by one blank line, Bengali verbatim");
  console.log("PASS: plain multi-paragraph body.");
}

function runImageOnlyParagraphDroppedAndEntitiesDecoded() {
  const html = "<p>Roofs &amp; Ceilings &lt;2026&gt; &#39;92 &quot;q&quot; &#x2019;s</p><p><strong><img src=\"data:image/png;base64,AAAA\" /></strong></p><p>  Abir Banerjee  </p><p></p>";
  assert.equal(docxHtmlToParagraphText(html), "Roofs & Ceilings <2026> '92 \"q\" ’s\n\nAbir Banerjee", "image-only and empty paragraphs are dropped; HTML entities decoded; paragraph edges trimmed");
  console.log("PASS: images/empties dropped, entities decoded.");
}

function runHeadingsAndListItemsAreBlocks() {
  const html = "<h1>Title</h1><ul><li>one</li><li>two</li></ul><p>end</p>";
  assert.equal(docxHtmlToParagraphText(html), "Title\n\none\n\ntwo\n\nend");
  console.log("PASS: headings and list items treated as blocks.");
}

runSoftLineBreakBecomesHardBreak();
runQuotedParagraphKeepsCurlyQuotesAndDropsInlineTags();
runPlainMultiParagraphBody();
runImageOnlyParagraphDroppedAndEntitiesDecoded();
runHeadingsAndListItemsAreBlocks();
console.log("All docxHtmlToParagraphText unit tests passed.");
