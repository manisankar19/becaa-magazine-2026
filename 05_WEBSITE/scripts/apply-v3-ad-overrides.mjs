import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { siteRoot, readManifest } from "./lib.mjs";
import { insertAdvertisementFields } from "./ad-background-core.mjs";
import { chooseInk } from "./contrast-core.mjs";

// Sprint v3 Task 12 (sprints/v3/PRD.md §4.4, Decision F approved 2026-09-14):
// two manual page-background overrides. Everything else stays `auto`.
//   ADV-023 — sampled bright cyan #58d6db softened 60 % toward --paper (#fbfaf7):
//             r 88→186, g 214→236, b 219→236 = #baecec (restrained tint, dark ink 11.9:1).
//   ADV-019 — sampled near-black #121516 replaced by a deep neutral charcoal #2b2f31
//             so the light heading still reads and the page is not solid black.
const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");

export const OVERRIDES = {
  "ADV-023": {
    page_background: "#baecec",
    note: "Sprint v3: manual background #baecec (sampled cyan #58d6db mixed 60% toward --paper) — Decision F.",
  },
  "ADV-019": {
    page_background: "#2b2f31",
    note: "Sprint v3: manual background #2b2f31 (deep neutral charcoal instead of sampled near-black #121516) — Decision F.",
  },
};

function notesLine(value) {
  return `    ${yaml.dump({ notes: value }, { lineWidth: -1 }).trimEnd()}`;
}

export function applyAdOverrides() {
  const manifest = readManifest();
  let text = fs.readFileSync(manifestPath, "utf8");
  const applied = [];
  for (const [id, override] of Object.entries(OVERRIDES)) {
    const item = manifest.items.find((i) => i.id === id);
    if (!item || item.type !== "advertisement") throw new Error(`${id}: not an advertisement in the manifest`);
    const fields = { page_background: override.page_background, page_background_mode: "manual", page_ink: chooseInk(override.page_background).ink };
    const fieldsUnchanged = item.page_background === fields.page_background && item.page_background_mode === "manual" && item.page_ink === fields.page_ink;
    const notesUnchanged = String(item.notes ?? "").includes(override.note);
    if (fieldsUnchanged && notesUnchanged) continue;
    if (!notesUnchanged) {
      const oldLine = notesLine(item.notes ?? "");
      if (text.split(`\n${oldLine}\n`).length !== 2) throw new Error(`${id}: expected exactly one notes line "${oldLine.trim()}"`);
      text = text.replace(`\n${oldLine}\n`, `\n${notesLine([item.notes, override.note].filter(Boolean).join(" "))}\n`);
    }
    text = insertAdvertisementFields(text, id, fields);
    applied.push({ id, ...fields });
  }
  if (applied.length) {
    fs.writeFileSync(manifestPath, text, "utf8");
    readManifest(); // still valid YAML
  }
  return applied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const applied = applyAdOverrides();
  for (const a of applied) console.log(`  ${a.id}: ${a.page_background} (manual, ink ${a.page_ink})`);
  console.log(applied.length ? `Applied ${applied.length} manual override(s).` : "Manual overrides already in place; nothing to do.");
}
