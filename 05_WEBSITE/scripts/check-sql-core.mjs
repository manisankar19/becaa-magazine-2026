// Pure heuristic scanner for string-built SQL (Sprint v3 Task 32). No I/O.
// Findings: a template literal whose text looks like SQL and contains `${…}` interpolation,
// or a string literal that looks like SQL joined with `+`. A line-level marker
// `// check-sql: allow …` suppresses a finding after human review (used once, for the
// fixed WHERE fragment + positional placeholders in lib/admin-queries.ts).
const SQL_KEYWORDS = /\b(select|insert\s+into|update|delete\s+from|create\s+(?:table|index|extension)|drop\s+(?:table|index)|alter\s+table|truncate)\b/i;
const ALLOW = /check-sql:\s*allow/;

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function lineText(source, line) {
  return source.split("\n")[line - 1] ?? "";
}

// Extract template literals (backtick …), tracking ${…} nesting; returns [{start, text, interpolated}].
function templateLiterals(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "/") { i = source.indexOf("\n", i); if (i === -1) break; continue; }
    if (ch === "/" && source[i + 1] === "*") { const end = source.indexOf("*/", i + 2); i = end === -1 ? source.length : end + 2; continue; }
    if (ch === '"' || ch === "'") { let j = i + 1; while (j < source.length && source[j] !== ch && source[j] !== "\n") { if (source[j] === "\\") j++; j++; } i = j + 1; continue; }
    if (ch === "`") {
      const start = i;
      let j = i + 1; let depth = 0; let interpolated = false; let text = "";
      while (j < source.length) {
        const c = source[j];
        if (c === "\\") { text += source[j + 1] ?? ""; j += 2; continue; }
        if (depth === 0 && c === "`") break;
        if (c === "$" && source[j + 1] === "{") { interpolated = true; depth++; j += 2; continue; }
        if (depth > 0 && c === "}") { depth--; j++; continue; }
        if (depth === 0) text += c;
        j++;
      }
      out.push({ start, text, interpolated });
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

// String literals joined with `+` (either side) whose text looks like SQL.
function concatenatedSql(source) {
  const out = [];
  const re = /(["'])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  let m;
  while ((m = re.exec(source))) {
    const text = m[2];
    if (!SQL_KEYWORDS.test(text)) continue;
    const before = source.slice(Math.max(0, m.index - 20), m.index);
    const after = source.slice(m.index + m[0].length, m.index + m[0].length + 20);
    if (/\+\s*$/.test(before) || /^\s*\+/.test(after)) out.push({ start: m.index, text });
  }
  return out;
}

export function findUnsafeSql(path, source) {
  const findings = [];
  for (const lit of templateLiterals(source)) {
    if (!lit.interpolated || !SQL_KEYWORDS.test(lit.text)) continue;
    const line = lineOf(source, lit.start);
    // A reviewed exception may be marked on the literal's line, the line above, or the line below (multi-line literals).
    if ([line - 1, line, line + 1].some((l) => ALLOW.test(lineText(source, l)))) continue;
    findings.push({ path, line, reason: "SQL template literal with ${} interpolation — use $1 parameters" });
  }
  for (const c of concatenatedSql(source)) {
    const line = lineOf(source, c.start);
    if (ALLOW.test(lineText(source, line))) continue;
    findings.push({ path, line, reason: "SQL string concatenation — use $1 parameters" });
  }
  return findings.sort((a, b) => a.line - b.line);
}
