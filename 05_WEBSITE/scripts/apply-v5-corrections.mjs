// Sprint v5 Tasks 6 and 10: apply the owner corrections (scripts/v5-corrections.mjs; authority
// 02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md) to working content and the manifest.
// Same safeguards as the v4 script, whose applier is reused: exact and count-guarded, paths
// confined to 05_WEBSITE/, already-applied corrections skipped, partial or ambiguous state stops.
//   node scripts/apply-v5-corrections.mjs [--only MSG-001,ART-011]
import { siteRoot } from "./lib.mjs";
import { applyV4FileCorrections } from "./apply-v4-committee-corrections.mjs";
import { V5_FILE_CORRECTIONS } from "./v5-corrections.mjs";

export function applyV5FileCorrections({ only = null, root = siteRoot, corrections = V5_FILE_CORRECTIONS } = {}) {
  return applyV4FileCorrections({ only, root, corrections });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex > -1 ? String(process.argv[onlyIndex + 1] ?? "").split(",").filter(Boolean) : null;
  for (const r of applyV5FileCorrections({ only })) console.log(`${r.id}  ${r.action}  ${r.file}: ${JSON.stringify(r.find)} → ${JSON.stringify(r.replace)}`);
}
