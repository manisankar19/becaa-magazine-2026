// Unit test for lib/csv-core.ts — Sprint v3 Task 30. Hermetic.
// Run with: node --import tsx tests/unit/csv-core.test.mjs
import assert from "node:assert/strict";
import { csvCell, csvRow, buildCsv, EXPORT_COLUMNS, BOM } from "../../lib/csv-core.ts";

assert.equal(BOM, "﻿");
assert.deepEqual(EXPORT_COLUMNS, ["name", "email", "category", "batch_year", "department", "department_other", "organisation", "mobile", "consent_at", "registered_at", "last_seen_at", "visit_count"]);
for (const c of EXPORT_COLUMNS) assert.ok(!/hash|token|ip|agent|password|session/.test(c), `column ${c} is approved`);

// Every cell is quoted; embedded quotes doubled.
assert.equal(csvCell("plain"), '"plain"');
assert.equal(csvCell('say "hi"'), '"say ""hi"""');
assert.equal(csvCell("a,b"), '"a,b"');
assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
assert.equal(csvCell(null), '""');
assert.equal(csvCell(undefined), '""');
assert.equal(csvCell(42), '"42"');
assert.equal(csvCell("সিদ্ধার্থ"), '"সিদ্ধার্থ"', "UTF-8 passes through");

// Formula-injection guard: leading = + - @ TAB CR are prefixed with an apostrophe.
assert.equal(csvCell("=1+1"), "\"'=1+1\"");
assert.equal(csvCell("+91 98360"), "\"'+91 98360\"");
assert.equal(csvCell("-5"), "\"'-5\"");
assert.equal(csvCell("@import"), "\"'@import\"");
assert.equal(csvCell("\tx"), "\"'\tx\"");
assert.equal(csvCell("\rx"), "\"'\rx\"");
assert.equal(csvCell("=cmd|' /C calc'!A0"), "\"'=cmd|' /C calc'!A0\"", "guard and quoting compose (only double quotes are doubled)");
assert.equal(csvCell("a=b"), '"a=b"', "only a leading character triggers the guard");

assert.equal(csvRow(["a", "b"]), '"a","b"');
const csv = buildCsv(["name", "email"], [{ name: "A", email: "a@x.org" }, { name: "=B", email: null }]);
assert.ok(csv.startsWith(BOM + '"name","email"\r\n'), "BOM then header row, CRLF");
assert.equal(csv, BOM + '"name","email"\r\n"A","a@x.org"\r\n"\'=B",""\r\n');
assert.equal(buildCsv(["name"], []), BOM + '"name"\r\n', "header only when no rows");
assert.throws(() => buildCsv(["ip_hash"], []), /not an approved column/i, "unapproved columns cannot be exported");
console.log("All csv-core unit tests passed.");
