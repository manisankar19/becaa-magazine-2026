// Pure helpers for advertisement page-background sampling (Sprint v3 Task 11,
// sprints/v3/PRD.md §4.4). No I/O, no sharp — the sampler script feeds
// sharp's stats() output in here so the logic is unit-testable.
import { rgbToHex, chooseInk } from "./contrast-core.mjs";

// Four edge strips (top, bottom, left, right) as sharp extract() regions.
export function edgeRegions(width, height, fraction) {
  const t = Math.max(1, Math.round(height * fraction));
  const l = Math.max(1, Math.round(width * fraction));
  return [
    { left: 0, top: 0, width, height: t },
    { left: 0, top: height - t, width, height: t },
    { left: 0, top: 0, width: l, height },
    { left: width - l, top: 0, width: l, height },
  ];
}

// stats: array of sharp stats objects ({ channels: [{mean}, {mean}, {mean}, …] }).
// Mean of the per-strip channel means (RGB only; alpha ignored), rounded to hex.
export function edgeColourFromStats(stats) {
  if (!stats || stats.length === 0) throw new Error("edgeColourFromStats: no edge strips supplied");
  const sums = [0, 0, 0];
  for (const s of stats) for (let i = 0; i < 3; i++) sums[i] += s.channels[i].mean;
  return rgbToHex(sums[0] / stats.length, sums[1] / stats.length, sums[2] / stats.length);
}

export function manifestFieldsFor(hex) {
  return { page_background: hex, page_background_mode: "auto", page_ink: chooseInk(hex).ink };
}

const FIELD_ORDER = ["page_background", "page_background_mode", "page_ink"];

// Targeted YAML text edit: within the block of `  - id: <itemId>`, remove any
// existing presentation field lines and append the given fields after the
// `    notes:` line (the last standard field). Nothing else is touched.
export function insertAdvertisementFields(yamlText, itemId, fields) {
  const lines = yamlText.split("\n");
  const start = lines.findIndex((l) => l === `  - id: ${itemId}`);
  if (start === -1) throw new Error(`insertAdvertisementFields: item ${itemId} not found`);
  let end = lines.findIndex((l, i) => i > start && !l.startsWith("    "));
  if (end === -1) end = lines.length;
  const block = lines.slice(start, end).filter((l) => !FIELD_ORDER.some((f) => l.startsWith(`    ${f}:`)));
  const notesIndex = block.findIndex((l) => l.startsWith("    notes:"));
  if (notesIndex === -1) throw new Error(`insertAdvertisementFields: item ${itemId} has no notes line to anchor on`);
  const render = (key, value) => (key === "page_background" ? `    ${key}: '${value}'` : `    ${key}: ${value}`);
  const inserted = FIELD_ORDER.filter((k) => fields[k] !== undefined).map((k) => render(k, fields[k]));
  block.splice(notesIndex + 1, 0, ...inserted);
  return [...lines.slice(0, start), ...block, ...lines.slice(end)].join("\n");
}
