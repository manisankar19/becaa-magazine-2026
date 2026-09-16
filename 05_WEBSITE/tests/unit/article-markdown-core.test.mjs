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

// ---------------------------------------------------------------------------
// Sprint v4 Task 5 — readVerseSource(): validates and parses the verse
// source Markdown convention (# heading, **author**, blank line, N lines
// each ending "<br>") used by the authoritative poem source
// 02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md (sha256 0d068f30b846c0b7…).
// Fixtures below are built from that file's real, verbatim Bengali text
// (read via the Read tool), never paraphrased or retyped from memory.
// ---------------------------------------------------------------------------
import { readVerseSource } from "../../scripts/article-markdown-core.mjs";

// The heading, author and all 17 poem lines, copied verbatim from
// "02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md". In the real file, only
// 16 of the 17 poem lines end with "<br>" — the 17th (last) line ends with
// an em dash and a bare newline, with no "<br>" marker at all (independently
// confirmed: `grep -c '<br>'` on the file returns 16, and a hex dump of the
// file's tail shows the last line ending "...e2 80 94 0a", i.e. em dash +
// newline, no "<br>"). This is correct, not truncated: "<br>" is the
// separator BETWEEN lines, so N lines need only N-1 separators — there is
// nothing after the last line to break to. readVerseSource() treats it
// this way (last line exempt from the "<br>" requirement); see the
// production code comment above the parsing loop for the same note. This
// fixture is therefore a VALID 17-line source, not a "missing <br>" one.
const REAL_VERSE_SOURCE = `# গোলাপ

**শুভ্রা বসু**

এনেছি এক গোলাপের চারা—<br>
রেখেছি তার ভার ভার মাটি ভরা টবে,<br>
জল দিই তারে, রোদ্দুরেও রাখি তারে।<br>
ধীরে ধীরে বেড়ে ওঠে, গোলাপের চারা—<br>
মেলেছে তার সবুজ কচি পাতা।<br>
ডাল ভরে এসেছে তার কুঁড়ি,<br>
দুদিন বাদেই কখন মেলেছে কলি।<br>
একে একে আমন্ত্রণ করেছে, গোলাপেরা<br>
পেয়েছে নিমন্ত্রণ, মৌমাছিরা আর প্রজাপতিরা।<br>
রোজই খুশি, আনন্দেতে করছে ছুটোছুটি—<br>
তারা আসে, পায়ে ফুলের রেণু নিয়ে<br>
করছে মাখামাখি, দিচ্ছে গড়াগড়ি।<br>
কত কথা, কত ব্যথা শোনায় গোলাপেরে—<br>
চুপচাপ, ফিসফাস সেই কথা কানাকানি,<br>
গুন গুন গুঞ্জন গান গায় মৌমাছি।<br>
সারাদিন খেলাধুলো হয়ে এল শেষ—<br>
অবশেষে মধুপুরা নিয়ে গেল রেশ—
`;

// The 17 real poem lines, raw (lines 1-16 still end "<br>"; line 17 does
// not — see the note above), sliced out of the real fixture so the
// four-line fixture and the expected parsed output below are derived from
// the same verbatim text, not retyped again.
const REAL_POEM_LINES_RAW = REAL_VERSE_SOURCE.trimEnd().split("\n").slice(4, 21);
const stripBr = (line) => (line.endsWith("<br>") ? line.slice(0, -"<br>".length) : line);

function runValidSeventeenLineSourceParsesToSeventeenEntries() {
  const result = readVerseSource(REAL_VERSE_SOURCE, { expectedCount: 17 });
  assert.equal(result.heading, "গোলাপ");
  assert.equal(result.author, "শুভ্রা বসু");
  assert.equal(result.lines.length, 17, "must return exactly 17 poem lines");
  assert.deepEqual(
    result.lines,
    REAL_POEM_LINES_RAW.map(stripBr),
    "each returned line must equal the source line with only a trailing <br> removed (none to remove on the last line)"
  );
  console.log("PASS: valid 17-line verse source (real file structure, last line has no trailing <br>) parses to 17 entries.");
}

function runFourLineExampleVerbatim() {
  const fourLineSource = [
    "# গোলাপ",
    "",
    "**শুভ্রা বসু**",
    "",
    ...REAL_POEM_LINES_RAW.slice(0, 4),
    "",
  ].join("\n");

  const result = readVerseSource(fourLineSource, { expectedCount: 4 });
  assert.deepEqual(
    result.lines,
    REAL_POEM_LINES_RAW.slice(0, 4).map(stripBr),
    "four consecutive real poem lines must round-trip verbatim, in order, with only <br> stripped"
  );
  console.log("PASS: four-line example renders exactly as the four verbatim source lines.");
}

function runMissingBrThrows() {
  // A genuine defect: a MIDDLE line (not the last) missing its "<br>"
  // separator — this must still throw, since only the very last line is
  // exempt. Line 5 ("মেলেছে তার সবুজ কচি পাতা।<br>") has its marker
  // stripped to construct the broken fixture.
  const brokenLines = [...REAL_POEM_LINES_RAW];
  assert.ok(brokenLines[4].endsWith("<br>"), "fixture precondition: line 5 must have a <br> to remove");
  brokenLines[4] = stripBr(brokenLines[4]);
  const brokenSource = ["# গোলাপ", "", "**শুভ্রা বসু**", "", ...brokenLines, ""].join("\n");

  assert.throws(
    () => readVerseSource(brokenSource, { expectedCount: 17 }),
    /line 5 is missing the trailing "<br>"/,
    "must throw when a non-final poem line has no trailing <br>"
  );
  console.log("PASS: a non-final poem line missing <br> throws a descriptive error.");
}

function runEmptyBodyThrows() {
  const emptyBodySource = "# গোলাপ\n\n**শুভ্রা বসু**\n\n";
  assert.throws(
    () => readVerseSource(emptyBodySource),
    /no poem lines found/,
    "must throw when there are no poem lines at all"
  );
  console.log("PASS: an empty body throws a descriptive error.");
}

function runExpectedCountMismatchThrows() {
  const fourLineSource = [
    "# গোলাপ",
    "",
    "**শুভ্রা বসু**",
    "",
    ...REAL_POEM_LINES_RAW.slice(0, 4),
    "",
  ].join("\n");

  assert.throws(
    () => readVerseSource(fourLineSource, { expectedCount: 17 }),
    /expected 17 poem lines, found 4/,
    "must throw when expectedCount does not match the actual number of poem lines"
  );
  console.log("PASS: an expectedCount mismatch throws a descriptive error.");
}

function runWrongHeadingLevelThrows() {
  const wrongHeadingSource = REAL_VERSE_SOURCE.replace(/^# গোলাপ/, "## গোলাপ");
  assert.throws(
    () => readVerseSource(wrongHeadingSource),
    /level-1 heading/,
    "must throw when the heading is not a level-1 (single #) heading"
  );
  console.log("PASS: a non-H1 heading throws a descriptive error.");
}

function runAuthorNotBoldThrows() {
  const notBoldAuthorSource = REAL_VERSE_SOURCE.replace("**শুভ্রা বসু**", "শুভ্রা বসু");
  assert.throws(
    () => readVerseSource(notBoldAuthorSource),
    /bold author line/,
    "must throw when the author line is not wrapped in ** **"
  );
  console.log("PASS: a non-bold author line throws a descriptive error.");
}

runValidSeventeenLineSourceParsesToSeventeenEntries();
runFourLineExampleVerbatim();
runMissingBrThrows();
runEmptyBodyThrows();
runExpectedCountMismatchThrows();
runWrongHeadingLevelThrows();
runAuthorNotBoldThrows();
console.log("All readVerseSource unit tests passed.");
