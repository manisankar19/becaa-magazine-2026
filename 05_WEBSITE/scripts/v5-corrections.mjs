// Sprint v5 owner corrections (sprints/v5/Changev5.md; PRD §4.2, §4.4, Decisions C, D, J) in
// machine-readable form. The human-readable authority is
// 02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md.
//
// Strings are code-point exact. The MSG-001 signature's old form is C, E, two U+0020 spaces,
// 8, 7 (the source lost the apostrophe); the new form is C, E, one space, U+2019 RIGHT SINGLE
// QUOTATION MARK, 8, 7. The \u2019 escape keeps the apostrophe visible and stops an editor
// from turning it into an ASCII quote.
//
// Decision C: the author's other wording (PRD §1.1) is published as supplied; any correction
// the owner later approves is added to the record first, then here, as an exact old → new entry.

// Text edits applied to working content (Task 6: MSG-001 signature; Task 10: ART-011 branch).
// `file` is relative to 05_WEBSITE/.
export const V5_FILE_CORRECTIONS = [
  { id: "MSG-001", file: "src/content/messages/MSG-001-president-desk.md", find: "CE  87", replace: "CE \u201987", expectedCount: 1 },
  // `branch: Civil` occurs on ten items; the find is anchored on ART-011's own lines so it is
  // unique in the manifest. Only the branch value changes (the article body's "Mech 2006" stays).
  {
    id: "ART-011",
    file: "src/_data/publication.yaml",
    find: "    contributor: Palash Biswas\n    designation: ''\n    passing_year: '2006'\n    branch: Civil\n",
    replace: "    contributor: Palash Biswas\n    designation: ''\n    passing_year: '2006'\n    branch: Mechanical\n",
    expectedCount: 1,
    wholeWord: false, // multi-line block bounded by newlines; a word-boundary check adds nothing
  },
];

// How each correction shows up in rendered text (website, PDF); used by the v5 regression
// test and the PDF comparison. ART-011 changes through the `byline` filter, not a body edit.
export const V5_CORRECTIONS = [
  { id: "MSG-001", find: "CE  87", replace: "CE \u201987" },
  { id: "ART-011", find: "Palash Biswas, Civil, 2006 Batch", replace: "Palash Biswas, Mechanical, 2006 Batch" },
];
