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
