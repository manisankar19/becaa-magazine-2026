// Pure CSV construction for the administrator export (Sprint v3 Task 30, PRD §5.5).
// Every cell is double-quoted; cells that a spreadsheet would interpret as a formula
// (leading = + - @ TAB CR) are prefixed with an apostrophe; rows end with CRLF and the
// document starts with a UTF-8 BOM so Excel decodes Bengali correctly.
export const BOM = "﻿";

// The only columns that may ever be exported. Anything else (ids, hashes, IPs, user agents,
// session data) is rejected by buildCsv().
export const EXPORT_COLUMNS = ["name", "email", "category", "batch_year", "department", "department_other", "organisation", "mobile", "consent_at", "registered_at", "last_seen_at", "visit_count"] as const;
export type ExportColumn = (typeof EXPORT_COLUMNS)[number];

const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_LEAD.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

export function buildCsv(columns: readonly string[], rows: ReadonlyArray<Record<string, unknown>>): string {
  for (const column of columns) {
    if (!(EXPORT_COLUMNS as readonly string[]).includes(column)) throw new Error(`"${column}" is not an approved column for export`);
  }
  const lines = [csvRow(columns), ...rows.map((row) => csvRow(columns.map((c) => row[c])))];
  return BOM + lines.join("\r\n") + "\r\n";
}
