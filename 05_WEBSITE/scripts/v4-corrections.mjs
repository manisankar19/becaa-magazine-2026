// Sprint v4 committee corrections (sprints/v4/v4changev2.md; PRD §4.7, Decisions O–S) in
// machine-readable form. The human-readable authority is
// 02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md.
//
// Strings are code-point exact for the file they target: MSG-001 stores the letter ya-nukta
// as U+09DF, ART-003 stores it as U+09AF U+09BC. \u escapes keep that visible and stop an
// editor from normalising it away.

// Text edits applied to working content (scripts/apply-v4-committee-corrections.mjs).
// `file` is relative to 05_WEBSITE/.
export const V4_FILE_CORRECTIONS = [
  { id: "MSG-001", file: "src/content/messages/MSG-001-president-desk.md", find: "বেকান পরিচ\u09DF", replace: "BECAA-র পরিচ\u09DF", expectedCount: 1 },
  { id: "MSG-002", file: "src/_data/publication.yaml", find: "Vice Preseident Desk", replace: "Vice President Desk", expectedCount: 2 }, // title and alt
  { id: "MSG-002", file: "src/content/messages/MSG-002-vice-preseident-desk.md", find: "Vice Preseident Desk", replace: "Vice President Desk", expectedCount: 1 },
  { id: "ART-003", file: "src/content/articles/ART-003-item.md", find: "ভাইবই", replace: "ভাবা\u09AF\u09BC", expectedCount: 1 },
  { id: "ART-003", file: "src/content/articles/ART-003-item.md", find: "পারিমা", replace: "পরিমা", expectedCount: 1 },
];

// How each correction shows up in rendered text (website, PDF); used by the regression
// test and the PDF comparison. ART-004/ART-005 change through `display_name`, not a text edit.
export const V4_CORRECTIONS = [
  { id: "MSG-001", find: "বেকান পরিচ\u09DF", replace: "BECAA-র পরিচ\u09DF" },
  { id: "MSG-002", find: "Vice Preseident Desk", replace: "Vice President Desk" },
  { id: "ART-003", find: "ভাইবই", replace: "ভাবা\u09AF\u09BC" },
  { id: "ART-003", find: "পারিমা", replace: "পরিমা" },
  { id: "ART-004", find: "Biswajit Sengupta", replace: "Late Biswajit Sengupta" },
  { id: "ART-005", find: "Biswajit Sengupta", replace: "Late Biswajit Sengupta" },
];

// The confirmed MSG-001 sentence (Decision O), exactly as recorded in the correction record.
export const MSG001_SENTENCE = {
  old: "কর্মজীবনে আমরা যে যেখানেই পৌঁছে থাকি না কেন, বেকান পরিচ\u09DF আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।",
  new: "কর্মজীবনে আমরা যে যেখানেই পৌঁছে থাকি না কেন, BECAA-র পরিচ\u09DF আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।",
  untouched: "প্রি\u09DF বেকান ও বেকানী বন্ধুরা,",
};
