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
