// Pure Markdown-with-front-matter construction for extracted article/poem
// text. Kept dependency-free (no file I/O, no mammoth) so it can be unit
// tested in isolation. Matches the front-matter shape and body convention
// already used by the existing ART-* content files (body = the extracted
// text, trimmed, otherwise verbatim).
export function buildArticleMarkdown({ id, title, sourceFile, fingerprint, verification = "verified", bodyText }) {
  const escapedTitle = String(title).replaceAll('"', '\\"');
  const frontMatter = [
    "---",
    `id: ${id}`,
    `title: "${escapedTitle}"`,
    `source_file: "${sourceFile}"`,
    `source_fingerprint: ${fingerprint}`,
    `verification: ${verification}`,
    "---",
  ].join("\n");
  return `${frontMatter}\n${bodyText.trim()}\n`;
}

// ---------------------------------------------------------------------------
// Sprint v3 Task 2 — DOCX soft-line-break-aware text extraction.
//
// mammoth.extractRawText() drops <w:br/> soft line breaks, which concatenates
// signature lines such as "Secretary" + "BECAA Maharashtra". Feeding
// mammoth.convertToHtml() output through this pure function instead keeps
// those breaks as Markdown hard line breaks (two trailing spaces + newline),
// treats <p>/<h1-6>/<li> as block boundaries separated by one blank line,
// strips every other tag (inline emphasis, images), and decodes HTML entities.
// Text is otherwise verbatim — nothing is reworded.
// ---------------------------------------------------------------------------
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeHtmlEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return Object.hasOwn(NAMED_ENTITIES, body.toLowerCase()) ? NAMED_ENTITIES[body.toLowerCase()] : match;
  });
}

export function docxHtmlToParagraphText(html) {
  const blocks = String(html)
    // Block boundaries: closing p/h1-6/li. Opening tags are stripped below.
    .split(/<\/(?:p|h[1-6]|li)\s*>/i)
    .map((block) =>
      block
        .replace(/<br\s*\/?>/gi, "  \n")           // soft line break → Markdown hard break
        .replace(/<img\b[^>]*>/gi, "")             // images are never inlined in body text
        .replace(/<[^>]+>/g, "")                   // every remaining tag (strong/em/p/ul/…)
    )
    .map((block) => decodeHtmlEntities(block))
    .map((block) => block.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, ""))
    // A hard break that ends up at a block edge has nothing to break; drop it.
    .map((block) => block.replace(/^(  \n)+/, "").replace(/(  \n)+$/, ""))
    .filter((block) => block.length > 0);
  return blocks.join("\n\n");
}

// ---------------------------------------------------------------------------
// Sprint v4 Task 5 — readVerseSource(): pure parser/validator for the verse
// source Markdown convention used by the poem ART-010 ("গোলাপ"): a level-1
// heading, a bold author line, a blank line, then N poem lines each ending
// with a literal "<br>" hard-break marker. Dependency-free (no file I/O),
// so the extraction script can validate structure before writing
// ART-010-item.md and fail loudly on a malformed or truncated source
// rather than silently publish fewer lines than the poet wrote.
// ---------------------------------------------------------------------------
const BR_MARKER = "<br>";

export function readVerseSource(markdownText, { expectedCount } = {}) {
  const rawLines = String(markdownText).split("\n");

  // A trailing "\n" in the source produces one trailing empty element from
  // split(); drop it so it isn't mistaken for a blank-line transition.
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }

  let index = 0;
  const headingLine = rawLines[index] ?? "";
  const headingMatch = /^# (.+?)\s*$/.exec(headingLine);
  if (!headingMatch) {
    throw new Error(
      `readVerseSource: expected a level-1 heading ("# heading") as the first line, found: ${JSON.stringify(headingLine)}`
    );
  }
  const heading = headingMatch[1];
  index += 1;

  // Blank-ish transition between the heading and the author line.
  while (index < rawLines.length && rawLines[index].trim() === "") {
    index += 1;
  }

  const authorLine = rawLines[index] ?? "";
  const authorMatch = /^\*\*(.+?)\*\*\s*$/.exec(authorLine);
  if (!authorMatch) {
    throw new Error(
      `readVerseSource: expected a bold author line ("**author**") with no other content on the line, found: ${JSON.stringify(authorLine)}`
    );
  }
  const author = authorMatch[1];
  index += 1;

  // Blank-ish transition between the author line and the poem body.
  while (index < rawLines.length && rawLines[index].trim() === "") {
    index += 1;
  }

  const bodyLines = rawLines.slice(index).filter((line) => line.trim() !== "");
  if (bodyLines.length === 0) {
    throw new Error("readVerseSource: no poem lines found (empty body)");
  }

  // <br> is the separator BETWEEN poem lines, not a per-line terminator: N
  // lines need only N-1 separators, so the last line is exempt (there is
  // nothing after it to break to). The authoritative source for ART-010
  // follows exactly this convention — 16 "<br>" markers for its 17 lines,
  // confirmed against the real file (SHA-256 0d068f30b846c0b7…) during
  // Sprint v4 Task 5/6. If a source's last line does carry a trailing
  // "<br>" anyway, it is stripped too, so both conventions round-trip.
  const lines = bodyLines.map((line, lineIndex) => {
    const withoutTrailingWhitespace = line.replace(/[ \t\r]+$/, "");
    const isLastLine = lineIndex === bodyLines.length - 1;
    if (withoutTrailingWhitespace.endsWith(BR_MARKER)) {
      return withoutTrailingWhitespace.slice(0, -BR_MARKER.length);
    }
    if (isLastLine) {
      return withoutTrailingWhitespace;
    }
    throw new Error(
      `readVerseSource: line ${lineIndex + 1} is missing the trailing "${BR_MARKER}" marker: ${JSON.stringify(line)}`
    );
  });

  if (expectedCount !== undefined && lines.length !== expectedCount) {
    throw new Error(`readVerseSource: expected ${expectedCount} poem lines, found ${lines.length}`);
  }

  return { heading, author, lines };
}
