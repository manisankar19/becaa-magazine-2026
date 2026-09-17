// Pure tracker row logic for Sprint v4 Task 14 (sprints/v4/PRD.md §4.3-4.4,
// Decisions C, M). No file I/O, no xlsx — apply-v4-tracker-updates.mjs reads
// the real workbook and hands rows/headers here.
//
//   ADV-027 — field overrides only (Item ID unchanged): the row currently
//     records the excluded "Aniket Pal Advertisement" entry; it is revised in
//     place to Sarc Epic, Approved, with an appended Remarks note (the old
//     remark is preserved, not erased).
//   ADV-028, ADV-029 — brand-new rows, inserted directly after the ADV-027
//     row (same position the ads block already occupies in the sheet).
//   "22" — the poem's tracker row (its manifest item, ART-010, records
//     "Tracker Item ID 22") gets an appended Remarks note recording the
//     revised source; nothing else on that row changes.
import { applyTrackerFieldUpdates } from "./tracker-v3-core.mjs";

export const DECISIONS = {
  "ADV-027": {
    fields: {
      "Title / Item": "Best Compliment from Sarc Epic",
      "Contributor / Company": "Sarc Epic",
      Status: "Approved",
      "Web Include": "Yes",
      "Print Include": "Yes",
      "Received Date": "15.09.2026",
      Notes:
        'Sprint v4: company name confirmed as Sarc Epic (same sponsor as the previously excluded "Aniket Pal" entry, source via Debojit da). Text-only advertisement; no source artwork supplied. Source: AniketPal (Debojit da).',
    },
    remarksNote: "Sprint v4: re-included as ADV-027, Approved, Sarc Epic — see Notes.",
  },
  22: {
    remarksNote:
      "Sprint v4: revised source received 15.09.2026 (SHA-256 0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2) replaces the earlier committed source (SHA-256 83ae8311a1db9205946b5f7f207985eccace7dbf54d771fed3680a9a11d63af9), preserved in 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-15/.",
  },
};

export const ADV_028_ROW = {
  "Item ID": "ADV-028",
  "Title / Item": "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate",
  Type: "Advertisement",
  "Contributor / Company": "M/s Balajee Infrate",
  "Passing Year": "—",
  Branch: "—",
  "Source File Name": "—",
  "Received Date": "15.09.2026",
  Permission: "Print and web",
  Status: "Approved",
  "Print Section": "Advertisements",
  "Proposed Page": "—",
  "Web Include": "Yes",
  "Credit / Caption": "—",
  Notes: "Text-only advertisement; no source artwork supplied. Source: Keya Mukhopadhya. Intended for magazine printing.",
  "Print Include": "Yes",
  Remarks: "Sprint v4: new text-only advertisement, published as ADV-028.",
};

export const ADV_029_ROW = {
  "Item ID": "ADV-029",
  "Title / Item": "In fond memory of Late Shri Bhakta Mohon Mitra",
  Type: "Advertisement",
  "Contributor / Company": "Subrata Mitra (son), Soma Mitra (daughter)",
  "Passing Year": "—",
  Branch: "—",
  "Source File Name": "Supriyo.JPG",
  "Received Date": "15.09.2026",
  Permission: "Print and web",
  Status: "Approved",
  "Print Section": "Advertisements",
  "Proposed Page": "—",
  "Web Include": "Yes",
  "Credit / Caption": "—",
  Notes: "Memorial contribution sponsored by the son and daughter; not a company advertisement. Source: SUPRIO CHOUDHURY.",
  "Print Include": "Yes",
  Remarks: "Sprint v4: new memorial contribution, published as ADV-029.",
};

export const NEW_ROWS = [ADV_028_ROW, ADV_029_ROW];

function idOf(row) {
  return String(row["Item ID"] ?? "").trim();
}

// Normalise a hand-authored row object to the sheet's full header set, in
// header order, the same way tracker-merge-core.mjs's mergeAddendumRows does.
function normalizeRow(headers, row) {
  return Object.fromEntries(headers.map((header) => [header, row[header] ?? ""]));
}

export function insertRowsAfter(rows, afterId, rowsToInsert) {
  const index = rows.findIndex((row) => idOf(row) === afterId);
  if (index === -1) throw new Error(`insertRowsAfter: Item ID "${afterId}" not found in the tracker`);
  return [...rows.slice(0, index + 1), ...rowsToInsert, ...rows.slice(index + 1)];
}

// Pure, idempotent: applying this to an already-updated row set returns the
// same rows unchanged (field overrides are no-ops once applied;
// already-present new rows are left alone, not re-inserted or duplicated).
export function buildV4TrackerRows(headers, rows) {
  const updated = applyTrackerFieldUpdates(rows, DECISIONS);

  const existingIds = new Set(updated.map(idOf));
  const alreadyAppended = NEW_ROWS.filter((row) => existingIds.has(idOf(row)));
  if (alreadyAppended.length === NEW_ROWS.length) return updated; // nothing more to do
  if (alreadyAppended.length > 0) {
    throw new Error(`Inconsistent tracker state: only some of ${NEW_ROWS.map(idOf).join(", ")} are present (${alreadyAppended.map(idOf).join(", ")}).`);
  }

  const normalizedNewRows = NEW_ROWS.map((row) => normalizeRow(headers, row));
  return insertRowsAfter(updated, "ADV-027", normalizedNewRows);
}
