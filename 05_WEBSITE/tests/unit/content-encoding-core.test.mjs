// Unit test for scripts/content-encoding-core.mjs — Sprint v4 Task 42 (2026-09-17). Hermetic.
import assert from "node:assert/strict";
import { findControlCharacters } from "../../scripts/content-encoding-core.mjs";

const ch = (n) => String.fromCharCode(n);

// Tab, line feed and carriage return are ordinary text.
assert.deepEqual(findControlCharacters(`a${ch(9)}b${ch(13)}${ch(10)}c`), []);
assert.deepEqual(findControlCharacters("বাংলা text — “quotes” ’"), [], "Bengali and typographic punctuation are not control characters");

// A form feed (U+000C) carried over from DOCX extraction, with 1-based line and column.
assert.deepEqual(findControlCharacters(`first line${ch(10)}in a${ch(10)}${ch(12)}meeting`), [{ line: 3, column: 1, codePoint: "U+000C" }]);

// Other C0 controls and DEL are reported, each occurrence.
assert.deepEqual(findControlCharacters(`x${ch(0)}y${ch(27)}z${ch(127)}`), [
  { line: 1, column: 2, codePoint: "U+0000" },
  { line: 1, column: 4, codePoint: "U+001B" },
  { line: 1, column: 6, codePoint: "U+007F" },
]);
assert.deepEqual(findControlCharacters(""), []);
console.log("content-encoding-core: all assertions passed");
