import yaml from "js-yaml";

// Formats a single manifest item object as a "- id: ..." YAML block matching
// the indentation already used throughout publication.yaml (2-space list
// marker, 4-space field indentation), using the same js-yaml dump options
// as writeManifest() in lib.mjs so quoting style stays consistent with the
// rest of the hand-authored file.
export function buildManifestItemBlock(item) {
  const dumped = yaml.dump(item, { lineWidth: 120, noRefs: true }).trimEnd();
  const lines = dumped.split("\n");
  return lines.map((line, i) => (i === 0 ? `  - ${line}` : `    ${line}`)).join("\n") + "\n";
}
