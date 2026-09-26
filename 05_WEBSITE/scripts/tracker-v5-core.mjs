// Pure tracker row logic for Sprint v5 Task 11 (sprints/v5/PRD.md §4.5,
// Decisions I, J). No file I/O, no xlsx — apply-v5-tracker-updates.mjs reads
// the real workbook and hands rows/headers here.
//
//   "16" (MSG-001) — the President's message was replaced by his new English
//     message: Source File Name and Received Date change (Decision I: the date
//     the file arrived, not the 05-09-2026 in its name); a Remarks note is
//     appended after the Sprint v4 remark, which is kept as history.
//   "23" (ART-011) — Branch Civil → Mechanical at the owner's request
//     (Decision J); a Remarks note is appended.
import { applyTrackerFieldUpdates } from "./tracker-v3-core.mjs";

// Manifest ID → tracker Item ID (from each item's manifest note "Tracker Item ID N").
export const V5_TRACKER_IDS = { "MSG-001": "16", "ART-011": "23" };

export const NEW_MSG_001_SOURCE = "Souvenir President message 05-09-2026.docx";
export const MSG_001_RECEIVED_DATE = "26.09.2026";

export const MSG_001_REMARKS_NOTE =
  "Sprint v5 (2026-09-26): message replaced by the President's new English message (Souvenir President message 05-09-2026.docx); old source President Desk.docx archived in 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/; the Sprint v4 wording correction applied only to the superseded text and is retired (Decision H).";

export const ART_011_REMARKS_NOTE =
  'Sprint v5 (2026-09-26): branch corrected Civil → Mechanical at the owner\'s request (BECAA Owner Corrections 2026-09-26.md); byline now "Palash Biswas, Mechanical, 2006 Batch".';

export const V5_DECISIONS = {
  [V5_TRACKER_IDS["MSG-001"]]: {
    fields: { "Source File Name": NEW_MSG_001_SOURCE, "Received Date": MSG_001_RECEIVED_DATE },
    remarksNote: MSG_001_REMARKS_NOTE,
  },
  [V5_TRACKER_IDS["ART-011"]]: {
    fields: { Branch: "Mechanical" },
    remarksNote: ART_011_REMARKS_NOTE,
  },
};

// Idempotent: field overrides are no-ops once applied and a remark already present is
// not appended again. Throws if either row or column is missing. `headers` is accepted
// for symmetry with tracker-v4-core; no rows are added or removed.
export function buildV5TrackerRows(_headers, rows) {
  return applyTrackerFieldUpdates(rows, V5_DECISIONS);
}
