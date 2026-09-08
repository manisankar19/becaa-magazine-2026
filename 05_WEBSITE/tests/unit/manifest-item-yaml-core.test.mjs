// Unit test for scripts/manifest-item-yaml-core.mjs — Sprint v2 Task 8.
// Hermetic: no file I/O against the real manifest.
import assert from "node:assert/strict";
import yaml from "js-yaml";
import { buildManifestItemBlock } from "../../scripts/manifest-item-yaml-core.mjs";

function runShapeAndIndentation() {
  const item = { id: "GAL-999", type: "gallery", title: "Test Title", order: 10, web_include: true };
  const block = buildManifestItemBlock(item);
  const lines = block.split("\n").filter(Boolean);
  assert.match(lines[0], /^  - id: GAL-999$/, "first line must be a 2-space-indented list item starting with id");
  for (const line of lines.slice(1)) {
    assert.match(line, /^    \S/, "every subsequent field line must be indented 4 spaces");
  }
  console.log("PASS: block uses 2-space list marker + 4-space field indentation, matching the existing manifest style.");
}

function runFieldOrderPreserved() {
  const item = { id: "ART-999", type: "article", title: "T", order: 5 };
  const block = buildManifestItemBlock(item);
  const keys = block
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().replace(/^- /, "").split(":")[0]);
  assert.deepEqual(keys, ["id", "type", "title", "order"], "field order must follow object key insertion order");
  console.log("PASS: field order is preserved from the input object.");
}

function runRoundTripsThroughYaml() {
  const item = {
    id: "ART-010",
    type: "article",
    title: "গোলাপ",
    language: "bn",
    contributor: "Shubhra Basu (wife of Pranab Basu)",
    order: 200,
    web_include: true,
    print_include: false,
    notes: "A title with a colon: and an apostrophe's mark.",
  };
  const block = buildManifestItemBlock(item);
  // Re-parse as a one-item YAML sequence to confirm valid, faithful round-trip.
  const parsed = yaml.load(`items:\n${block}`).items[0];
  assert.deepEqual(parsed, item, "parsing the emitted block back must reproduce the original object exactly, including Bengali text, booleans, and punctuation");
  console.log("PASS: emitted block round-trips through YAML parsing unchanged, including Bengali text and tricky punctuation.");
}

runShapeAndIndentation();
runFieldOrderPreserved();
runRoundTripsThroughYaml();
console.log("All manifest-item-yaml-core unit tests passed.");
