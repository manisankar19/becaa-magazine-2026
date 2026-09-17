// Sprint v4 Task 42 (2026-09-17): publication text must not carry C0 control characters or
// DEL. DOCX extraction left a form feed (U+000C) in ART-009, which printed as a missing-glyph
// box. Tab, LF and CR are ordinary text. Pure — callers pass file contents.
export function findControlCharacters(text) {
  const found = [];
  let line = 1;
  let column = 0;
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    column += 1;
    if (code === 10) { line += 1; column = 0; continue; }
    if ((code < 32 && code !== 9 && code !== 13) || code === 127) {
      found.push({ line, column, codePoint: `U+${code.toString(16).toUpperCase().padStart(4, "0")}` });
    }
  }
  return found;
}
