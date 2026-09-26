// Pure tracker row logic for Sprint v4 Task 28 (PRD §4.7 item 7): record the five
// committee corrections on their tracker rows. No file I/O —
// apply-v4-corrections-tracker-updates.mjs reads the workbook and hands rows here.
// Remarks are appended (existing remarks preserved); only MSG-002's title field changes.
// The tracker has no display-name column, so "Late Biswajit Sengupta" is recorded in
// Remarks and Contributor / Company keeps the provenance name.
import { applyTrackerFieldUpdates } from "./tracker-v3-core.mjs";
import { V4_CORRECTIONS } from "./v4-corrections.mjs";

const SOURCE = "02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md";

// Manifest ID → tracker Item ID (from each item's manifest note "Tracker Item ID N").
export const TRACKER_IDS = { "MSG-001": "16", "MSG-002": "17", "ART-003": "5", "ART-004": "6", "ART-005": "7" };

// Deliberately includes superseded entries (MSG-001, Sprint v5 Decision H): the row-16 remark
// was written in Sprint v4 and is history; it must stay byte-identical so a re-run is a no-op.
// The v5 tracker update records the replacement in a separate, appended note.
const substitutions = (id) => V4_CORRECTIONS.filter((c) => c.id === id).map((c) => `"${c.find}" → "${c.replace}"`).join(" and ");

export const CORRECTION_DECISIONS = {
  [TRACKER_IDS["MSG-001"]]: {
    remarksNote: `Sprint v4 committee correction (${SOURCE}): published wording ${substitutions("MSG-001")} in MSG-001; the salutation and বেকানী unchanged; original source file unchanged.`,
  },
  [TRACKER_IDS["MSG-002"]]: {
    fields: { "Title / Item": "Vice President Desk" },
    remarksNote: `Sprint v4 committee correction (${SOURCE}): title spelling ${substitutions("MSG-002")} (MSG-002); original source file unchanged.`,
  },
  [TRACKER_IDS["ART-003"]]: {
    remarksNote: `Sprint v4 committee correction (${SOURCE}): Bengali spellings ${substitutions("ART-003")} in ART-003; original source file unchanged.`,
  },
  [TRACKER_IDS["ART-004"]]: {
    remarksNote: `Sprint v4 committee correction (${SOURCE}): reader-facing name shown as "Late Biswajit Sengupta" (manifest display_name, ART-004); Contributor / Company kept as the provenance name.`,
  },
  [TRACKER_IDS["ART-005"]]: {
    remarksNote: `Sprint v4 committee correction (${SOURCE}): reader-facing name shown as "Late Biswajit Sengupta" (manifest display_name, ART-005); Contributor / Company kept as the provenance name.`,
  },
};

// Approvals of 2026-09-17 (correction record addendum §§6–9). Applied after the corrections
// above; applyTrackerFieldUpdates takes one note per row, hence a second decision set.
const APPROVALS = "2026-09-17 approval (" + SOURCE + ", addendum)";
export const APPROVAL_DECISIONS = {
  "ADV-028": {
    fields: { "Title / Item": "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate" },
    remarksNote: `Sprint v4 ${APPROVALS}: wording changed from "Best Compliment from M/s Balajee Infrate"; shown once on the page.`,
  },
  "ADV-027": { remarksNote: `Sprint v4 ${APPROVALS}: the repeated visible heading was removed; the sentence is shown once on the page.` },
  "ADV-029": { remarksNote: `Sprint v4 ${APPROVALS}: the repeated visible heading was removed; the approved memorial text is shown once.` },
  [TRACKER_IDS["ART-004"]]: { remarksNote: `Sprint v4 ${APPROVALS}: Bengali author line in the article body changed to "প্রয়াত বিশ্বজিৎ সেনগুপ্ত".` },
  [TRACKER_IDS["ART-005"]]: { remarksNote: `Sprint v4 ${APPROVALS}: Bengali author line in the article body changed to "প্রয়াত বিশ্বজিৎ সেনগুপ্ত".` },
  1: { remarksNote: `Sprint v4 ${APPROVALS}: a stray page-break character (U+000C) removed from the extracted ART-009 text; wording unchanged.` },
};

// Idempotent: field overrides are no-ops once applied and a remark already present is not
// appended again. `headers` is accepted for symmetry with tracker-v4-core; no rows are added.
export function buildCorrectionTrackerRows(_headers, rows) {
  return applyTrackerFieldUpdates(applyTrackerFieldUpdates(rows, CORRECTION_DECISIONS), APPROVAL_DECISIONS);
}
