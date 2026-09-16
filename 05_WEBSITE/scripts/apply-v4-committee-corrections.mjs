// Sprint v4 Tasks 23–25: apply the committee's text corrections (scripts/v4-corrections.mjs)
// to working content and the manifest. Each correction is exact and count-guarded
// (text-correction-core); already-applied corrections are skipped and any partial or
// ambiguous state stops the run, so it is safe to re-run.
//   node scripts/apply-v4-committee-corrections.mjs [--only MSG-001,ART-003]
import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib.mjs";
import { applyCorrection, correctionState } from "./text-correction-core.mjs";
import { V4_FILE_CORRECTIONS } from "./v4-corrections.mjs";

export function applyV4FileCorrections({ only = null, root = siteRoot, corrections = V4_FILE_CORRECTIONS } = {}) {
  const selected = only ? corrections.filter((c) => only.includes(c.id)) : corrections;
  if (only && selected.length === 0) throw new Error(`No corrections for: ${only.join(", ")}`);
  const results = [];
  for (const correction of selected) {
    const file = path.resolve(root, correction.file);
    if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error(`Correction path escapes the site root: ${correction.file}`);
    const text = fs.readFileSync(file, "utf8");
    const state = correctionState(text, correction);
    if (state === "pending") fs.writeFileSync(file, applyCorrection(text, correction), "utf8");
    results.push({ id: correction.id, file: correction.file, find: correction.find, replace: correction.replace, action: state === "pending" ? "applied" : "already applied" });
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex > -1 ? String(process.argv[onlyIndex + 1] ?? "").split(",").filter(Boolean) : null;
  for (const r of applyV4FileCorrections({ only })) console.log(`${r.id}  ${r.action}  ${r.file}: "${r.find}" → "${r.replace}"`);
}
