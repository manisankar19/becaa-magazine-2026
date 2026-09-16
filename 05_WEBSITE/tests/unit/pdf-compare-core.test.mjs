// Unit test for scripts/pdf-compare-core.mjs — Sprint v4 Task 31 (PRD §4.7, Decision L). Hermetic:
// page texts are fabricated in the shape `pdftotext -layout` produces for the review PDF.
import assert from "node:assert/strict";
import { comparePdfPages, splitPdfText, normalisePageText } from "../../scripts/pdf-compare-core.mjs";

// --- Fixture helpers -------------------------------------------------------
// A page is its lines followed by the centred page-number footer pdftotext emits.
const page = (lines, n) => `${lines.join("\n")}\n\n\n\n                                               ${n}\n`;
const kicker = (section, id) => `${section} · ${id}`;
const contentsPage = (entries, n, { header = true, trailer = [] } = {}) =>
  page([...(header ? ["একই শিকড় — Contents"] : []), ...entries.map(([no, title, id]) => ` ${no}. ${title} ${id}`), ...trailer], n);

const ENTRIES = [
  [1, "President Desk", "MSG-001"],
  [2, "Vice Preseident Desk", "MSG-002"],
  [3, "স্মৃতির গলিতে", "ART-003"],
  [4, "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "ART-004"],
  [5, "গোলাপ", "ART-010"],
  [6, "Hidden history", "ART-011"],
  [7, "With best compliments from CETEST", "ADV-026"],
];

// Baseline: cover, contents, info, MSG-001, MSG-002, ART-003, ART-004 (2 pages), ART-010, ART-011 (2 pages), ADV-026, sponsor page.
function baselinePages() {
  return [
    page([""], 1),
    contentsPage(ENTRIES, 2, { trailer: ["Sponsor Acknowledgements / With Thanks"] }),
    page(["INFORMATION AND CONTACT", "", "Connect with BECAA Maharashtra"], 3),
    page([kicker("MESSAGES", "MSG-001"), "", "President Desk", "প্রিয় বেকান ও বেকানী বন্ধু রা,", "যেখানেই পৌঁছে থাকি না কেন, বেকান পরিচয় আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।"], 4),
    page([kicker("MESSAGES", "MSG-002"), "", "Vice Preseident Desk", "Vice President's Desk", "Dear friends, a strong connection between generations."], 5),
    page([kicker("ARTICLES", "ART-003"), "", "স্মৃতির গলিতে", "আজকের দিনে কোন কলেজে ভাইবই যায় না।", "মিলে লেডিস হোস্টেল পারিমা টার্গেট করলাম।"], 6),
    page([kicker("ARTICLES", "ART-004"), "", "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "Biswajit Sengupta, Civil, 1971 Batch", "প্রথম অনুচ্ছেদ এখানে শুরু হয় এবং অনেক দূর চলে।"], 7),
    page(["সেই সময়ে কোনো অস্বাভাবিক পরিস্থিতি ছিল না; না হলে বিপদ হত।", "শেষ কথা।"], 8),
    page([kicker("ARTICLES", "ART-010"), "", "গোলাপ", "এনেছি এক গোলাপের চারা—রেখেছি তার ভার ভার মাটি ভরা টবে,জল দিই তারে।"], 9),
    page([kicker("ARTICLES", "ART-011"), "", "Hidden history", "The quick brown fox jumps over the lazy dog and keeps", "running along the river bank until evening falls."], 10),
    page(["Second page of the history article with its closing", "paragraph and a final sentence."], 11),
    page([kicker("ADVERTISEMENTS", "ADV-026"), "", "With best compliments from CETEST"], 12),
    page(["SPONSOR ACKNOWLEDGEMENTS", "", "With Thanks", "BECAA Maharashtra warmly thanks our sponsors for their support."], 13),
  ];
}

const POEM = ["ART-010"];
const NEW = ["ADV-027", "ADV-028", "ADV-029"];
const CORRECTIONS = [
  { id: "MSG-001", find: "বেকান পরিচয়", replace: "BECAA-র পরিচয়" },
  { id: "MSG-002", find: "Vice Preseident Desk", replace: "Vice President Desk" },
  { id: "ART-003", find: "ভাইবই", replace: "ভাবায়" },
  { id: "ART-003", find: "পারিমা", replace: "পরিমা" },
  { id: "ART-004", find: "Biswajit Sengupta", replace: "Late Biswajit Sengupta" },
];
const classes = (result) => result.pages.map((p) => p.class);
const pageOf = (result, n) => result.pages.find((p) => p.page === n);

// --- Scenario 0: splitting and normalisation -------------------------------
{
  assert.deepEqual(splitPdfText("a\n 1\n\fb\n 2\n\f"), ["a\n 1\n", "b\n 2\n"], "form feeds split pages; the trailing empty chunk is dropped");
  assert.equal(normalisePageText(page(["Hello   world", "again"], 17)), "Hello world again", "footer page number removed and whitespace collapsed");
  assert.equal(normalisePageText("Line with 2024\n  2024\n"), "Line with 2024", "only a trailing number-only line is treated as a footer");
}

// --- Scenario 1: identical documents → every page unchanged, ok ------------
{
  const result = comparePdfPages(baselinePages(), baselinePages(), { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(result.summary.ok, true);
  assert.ok(classes(result).every((c) => c === "unchanged"), "identical page texts are all unchanged");
  assert.equal(result.summary.counts.unchanged, 13);
  assert.equal(result.summary.unexplained, 0);
  assert.deepEqual(result.removedBaselinePages, []);
  assert.deepEqual(pageOf(result, 7).itemIds, ["ART-004"], "kicker page carries its item id");
  assert.deepEqual(pageOf(result, 8).itemIds, ["ART-004"], "continuation page inherits the preceding kicker's item id");
  assert.deepEqual(pageOf(result, 13).itemIds, [], "an all-caps section page after the last item belongs to no item");
}

// --- Scenario 2: the Sprint v4 shape — contents entries, poem, new items, shift ----
{
  const base = baselinePages();
  const cur = baselinePages().slice(0, 12);
  cur[1] = contentsPage(
    [...ENTRIES, [8, "Best Compliment from Sarc Epic", "ADV-027"], [9, "Best Compliment from M/s Balajee Infrate", "ADV-028"], [10, "In fond memory of Late Shri Bhakta Mohon Mitra", "ADV-029"]],
    2,
    { trailer: ["Sponsor Acknowledgements / With Thanks"] },
  );
  cur[8] = page([kicker("ARTICLES", "ART-010"), "", "গোলাপ", "এনেছি এক গোলাপের চারা—", "রেখেছি তার ভার ভার মাটি ভরা টবে,", "জল দিই তারে।"], 9);
  cur.push(page([kicker("ADVERTISEMENTS", "ADV-027"), "", "Best Compliment from Sarc Epic"], 13));
  cur.push(page([kicker("ADVERTISEMENTS", "ADV-028"), "", "Best Compliment from M/s Balajee Infrate"], 14));
  cur.push(page([kicker("ADVERTISEMENTS · IN MEMORIAM", "ADV-029"), "", "In fond memory of Late Shri Bhakta Mohon", "Mitra"], 15));
  cur.push(page(["SPONSOR ACKNOWLEDGEMENTS", "", "With Thanks", "BECAA Maharashtra warmly thanks our sponsors for their support."], 16));

  const result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(result.summary.ok, true, JSON.stringify(result.pages.filter((p) => p.class === "unexplained")));
  assert.equal(pageOf(result, 2).class, "contents", "contents page with only the three authorised new entries");
  assert.deepEqual(pageOf(result, 2).itemIds, NEW, "contents page lists the ids whose entries were added");
  assert.equal(pageOf(result, 9).class, "poem", "re-extracted poem page (text differs beyond whitespace)");
  assert.deepEqual([13, 14, 15].map((n) => pageOf(result, n).class), ["new-item", "new-item", "new-item"]);
  assert.deepEqual(pageOf(result, 15).itemIds, ["ADV-029"], "a mixed-case/multi-part kicker still yields the id");
  const sponsor = pageOf(result, 16);
  assert.equal(sponsor.class, "shifted", "sponsor page text is identical once the footer is ignored");
  assert.equal(sponsor.baselinePage, 13, "shifted page records the baseline page it matched");
  assert.equal(result.summary.counts.unchanged, 10, "16 pages minus contents, poem, three new items and the shifted sponsor page");
  assert.equal(result.removedBaselinePages.length, 0, "baseline contents and poem pages are accounted for");
}

// --- Scenario 3: contents with an unauthorised change → unexplained --------
{
  const base = baselinePages();
  const renamed = ENTRIES.map((e) => (e[2] === "ART-011" ? [e[0], "Hidden histories", e[2]] : e));
  const cur = baselinePages();
  cur[1] = contentsPage(renamed, 2, { trailer: ["Sponsor Acknowledgements / With Thanks"] });
  let result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(pageOf(result, 2).class, "unexplained", "a retitled entry without a correction is unexplained");
  assert.equal(result.summary.ok, false);

  const added = [...ENTRIES, [8, "An unexpected sponsor", "ADV-099"]];
  cur[1] = contentsPage(added, 2, { trailer: ["Sponsor Acknowledgements / With Thanks"] });
  result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(pageOf(result, 2).class, "unexplained", "a new entry for an id outside newItemIds is unexplained");

  cur[1] = contentsPage(ENTRIES.filter((e) => e[2] !== "ART-011"), 2, { trailer: ["Sponsor Acknowledgements / With Thanks"] });
  result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(pageOf(result, 2).class, "unexplained", "a dropped entry is unexplained");

  cur[1] = contentsPage(ENTRIES, 2, { trailer: ["Sponsor Acknowledgements / Thanks"] });
  result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(pageOf(result, 2).class, "unexplained", "a change to non-entry contents text is unexplained");
}

// --- Scenario 4: all committee corrections applied, with justification reflow ----
function correctedPages() {
  const cur = baselinePages();
  cur[1] = contentsPage(ENTRIES.map((e) => (e[2] === "MSG-002" ? [e[0], "Vice President Desk", e[2]] : e)), 2, { trailer: ["Sponsor Acknowledgements / With Thanks"] });
  cur[3] = page([kicker("MESSAGES", "MSG-001"), "", "President Desk", "প্রিয় বেকান ও বেকানী বন্ধুরা,", "যেখানেই পৌঁছে থাকি না কেন, BECAA-র পরিচয় আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।"], 4);
  cur[4] = page([kicker("MESSAGES", "MSG-002"), "", "Vice President Desk", "Vice President's Desk", "Dear friends, a strong connection between generations."], 5);
  // Justified text: wider inter-word spacing and a different line break, same words.
  cur[5] = page([kicker("ARTICLES", "ART-003"), "", "স্মৃতির গলিতে", "আজকের   দিনে   কোন   কলেজে   ভাবায়", "যায় না। মিলে লেডিস হোস্টেল পরিমা টার্গেট করলাম।"], 6);
  // Byline prefix pushes a sentence from page 1 onto page 2 (reflow across pages).
  cur[6] = page([kicker("ARTICLES", "ART-004"), "", "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "Late Biswajit Sengupta, Civil, 1971 Batch", "প্রথম অনুচ্ছেদ এখানে শুরু হয়"], 7);
  cur[7] = page(["এবং অনেক দূর চলে। সেই সময়ে কোনো অস্বাভাবিক পরিস্থিতি ছিল না; না হলে বিপদ হত।", "শেষ কথা।"], 8);
  return cur;
}
{
  const result = comparePdfPages(baselinePages(), correctedPages(), { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(result.summary.ok, true, JSON.stringify(result.pages.filter((p) => p.class === "unexplained")));
  assert.equal(pageOf(result, 2).class, "contents", "contents page whose only change is the MSG-002 title correction");
  assert.deepEqual(pageOf(result, 2).itemIds, ["MSG-002"]);
  assert.deepEqual([4, 5, 6, 7, 8].map((n) => pageOf(result, n).class), ["correction", "correction", "correction", "correction", "correction"]);
  assert.deepEqual(pageOf(result, 8).itemIds, ["ART-004"], "reflowed continuation page is attributed to the corrected item");
  assert.equal(pageOf(result, 6).baselinePage, 6);
  assert.equal(result.summary.counts.correction, 5);
  assert.equal(result.removedBaselinePages.length, 0);

  // A corrected item with no change at all on one page stays unchanged on that page.
  const partial = correctedPages();
  partial[6] = page([kicker("ARTICLES", "ART-004"), "", "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "Late Biswajit Sengupta, Civil, 1971 Batch", "প্রথম অনুচ্ছেদ এখানে শুরু হয় এবং অনেক দূর চলে।"], 7);
  partial[7] = baselinePages()[7];
  const r2 = comparePdfPages(baselinePages(), partial, { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(r2.summary.ok, true);
  assert.equal(pageOf(r2, 7).class, "correction");
  assert.equal(pageOf(r2, 8).class, "unchanged", "an untouched page of a corrected item remains unchanged");
}

// --- Scenario 5: corrections missing or partial → unexplained --------------
{
  // Nothing applied although corrections are expected.
  let result = comparePdfPages(baselinePages(), baselinePages(), { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(result.summary.ok, false, "expected corrections that are absent make the run fail");
  for (const n of [4, 5, 6, 7]) assert.equal(pageOf(result, n).class, "unexplained", `page ${n}: corrected item still in its superseded form`);
  assert.equal(pageOf(result, 2).class, "unexplained", "contents still shows the superseded MSG-002 title");
  assert.match(pageOf(result, 7).note, /Late Biswajit Sengupta/, "note names the missing replacement");

  // ART-003 only half corrected: ভাবায় present, পারিমা still there.
  const half = correctedPages();
  half[5] = page([kicker("ARTICLES", "ART-003"), "", "স্মৃতির গলিতে", "আজকের দিনে কোন কলেজে ভাবায় যায় না।", "মিলে লেডিস হোস্টেল পারিমা টার্গেট করলাম।"], 6);
  result = comparePdfPages(baselinePages(), half, { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(pageOf(result, 6).class, "unexplained", "a superseded form still present is unexplained");
  assert.match(pageOf(result, 6).note, /পারিমা/);
  assert.equal(pageOf(result, 4).class, "correction", "other corrected items are unaffected");

  // Correction applied, plus an extra unrelated edit on the same item.
  const extra = correctedPages();
  extra[4] = page([kicker("MESSAGES", "MSG-002"), "", "Vice President Desk", "Vice President's Desk", "Dear friends, a weak connection between generations."], 5);
  result = comparePdfPages(baselinePages(), extra, { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(pageOf(result, 5).class, "unexplained", "an edit beyond the expected substitution is unexplained");

  // Byline doubled: the find string is a substring of the replacement, so presence of
  // "Biswajit Sengupta" alone must not be read as the superseded form.
  const doubled = correctedPages();
  doubled[6] = page([kicker("ARTICLES", "ART-004"), "", "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "Late Late Biswajit Sengupta, Civil, 1971 Batch", "প্রথম অনুচ্ছেদ এখানে শুরু হয়"], 7);
  result = comparePdfPages(baselinePages(), doubled, { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(pageOf(result, 7).class, "unexplained", "a doubled prefix is not the expected correction");

  // The prefix without the name: replacement absent.
  const noName = correctedPages();
  noName[6] = page([kicker("ARTICLES", "ART-004"), "", "হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম", "Late B. Sengupta, Civil, 1971 Batch", "প্রথম অনুচ্ছেদ এখানে শুরু হয়"], 7);
  result = comparePdfPages(baselinePages(), noName, { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS });
  assert.equal(pageOf(result, 7).class, "unexplained");
}

// --- Scenario 6: random edit on an uncorrected page → unexplained ----------
{
  const cur = baselinePages();
  cur[9] = page([kicker("ARTICLES", "ART-011"), "", "Hidden history", "The quick brown fox leaps over the lazy dog and keeps", "running along the river bank until evening falls."], 10);
  const result = comparePdfPages(baselinePages(), cur, { poemIds: POEM, newItemIds: NEW, corrections: CORRECTIONS.filter(() => false) });
  assert.equal(pageOf(result, 10).class, "unexplained");
  assert.deepEqual(pageOf(result, 10).itemIds, ["ART-011"]);
  assert.equal(pageOf(result, 10).baselinePage, 10, "unexplained item page points at the baseline page it replaces");
  assert.equal(result.summary.ok, false);
  assert.equal(result.summary.counts.unexplained, 1);

  // An edited non-item page (sponsor acknowledgements) after a new item is not swallowed by it.
  const withNew = baselinePages();
  withNew.splice(12, 0, page([kicker("ADVERTISEMENTS", "ADV-027"), "", "Best Compliment from Sarc Epic"], 13));
  withNew[13] = page(["SPONSOR ACKNOWLEDGEMENTS", "", "With Thanks", "BECAA Maharashtra thanks nobody."], 14);
  const r2 = comparePdfPages(baselinePages(), withNew, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(pageOf(r2, 13).class, "new-item");
  assert.equal(pageOf(r2, 14).class, "unexplained", "a changed section page after a new item is unexplained");
}

// --- Scenario 7: a baseline page removed → unexplained ---------------------
{
  const cur = baselinePages();
  cur.splice(10, 1); // drop ART-011's second page
  const result = comparePdfPages(baselinePages(), cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(result.summary.ok, false, "a vanished page makes the comparison fail");
  assert.equal(result.removedBaselinePages.length, 1);
  assert.equal(result.removedBaselinePages[0].baselinePage, 11);
  assert.equal(result.removedBaselinePages[0].class, "unexplained");
  assert.deepEqual(result.removedBaselinePages[0].itemIds, ["ART-011"]);
  assert.equal(result.summary.removedUnexplained, 1);
  assert.equal(pageOf(result, 11).class, "shifted", "the following page shifted up by one");

  // A whole item removed from both contents and body.
  const noItem = baselinePages();
  noItem[1] = contentsPage(ENTRIES.filter((e) => e[2] !== "ADV-026").map((e, i) => [i + 1, e[1], e[2]]), 2, { trailer: ["Sponsor Acknowledgements / With Thanks"] });
  noItem.splice(11, 1);
  const r2 = comparePdfPages(baselinePages(), noItem, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(r2.summary.ok, false);
  assert.equal(pageOf(r2, 2).class, "unexplained");
  assert.deepEqual(r2.removedBaselinePages.map((p) => [p.baselinePage, p.class]), [[12, "unexplained"]]);
}

// --- Scenario 8: justification whitespace-only change on an uncorrected article ----
{
  const cur = baselinePages();
  // Same page: only inter-word spacing and line breaks differ.
  cur[9] = page([kicker("ARTICLES", "ART-011"), "", "Hidden history", "The  quick  brown  fox  jumps  over  the  lazy  dog", "and keeps running along the river bank until evening falls."], 10);
  let result = comparePdfPages(baselinePages(), cur, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(result.summary.ok, true);
  assert.equal(pageOf(result, 10).class, "unchanged", "whitespace-only difference on the same page counts as unchanged");
  assert.match(pageOf(result, 10).note, /whitespace/i, "the note records that spacing differed");

  // Across pages: a line moves from page 10 to page 11 and pdftotext splits a conjunct differently.
  const reflow = baselinePages();
  reflow[9] = page([kicker("ARTICLES", "ART-011"), "", "Hidden history", "The quick brown fox jumps over the lazy dog and keeps"], 10);
  reflow[10] = page(["running along the river bank until evening falls. Second page of the history article with its closing", "paragraph and a final sentence."], 11);
  result = comparePdfPages(baselinePages(), reflow, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.equal(result.summary.ok, true, JSON.stringify(result.pages.filter((p) => p.class === "unexplained")));
  assert.deepEqual([10, 11].map((n) => pageOf(result, n).class), ["reflow", "reflow"], "same item text redistributed across pages is reflow");
  assert.equal(result.removedBaselinePages.length, 0);

  // Reflow that also changes a word is not whitespace-only.
  reflow[10] = page(["running along the river bank until night falls. Second page of the history article with its closing", "paragraph and a final sentence."], 11);
  result = comparePdfPages(baselinePages(), reflow, { poemIds: POEM, newItemIds: NEW, corrections: [] });
  assert.deepEqual([10, 11].map((n) => pageOf(result, n).class), ["unexplained", "unexplained"]);
}

// --- Scenario 9: a new-item id that already existed in the baseline is not waved through ----
{
  const base = baselinePages();
  const cur = baselinePages();
  cur[11] = page([kicker("ADVERTISEMENTS", "ADV-026"), "", "With best compliments from CETEST Ltd"], 12);
  const result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: ["ADV-026"], corrections: [] });
  assert.equal(pageOf(result, 12).class, "unexplained", "newItemIds only explain items absent from the baseline");
}

// --- Scenario 10: mixed Unicode forms of য় (U+09DF vs U+09AF U+09BC) --------
{
  const PRECOMPOSED = "য়";
  const DECOMPOSED = "য়";
  const msg001 = (ya, word) =>
    page([kicker("MESSAGES", "MSG-001"), "", "President Desk", `যেখানেই পৌঁছে থাকি না কেন, ${word} পরিচ${ya} আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।`], 4);
  const art011 = (ya) => page([kicker("ARTICLES", "ART-011"), "", "Hidden history", `যা${ya} না। The quick brown fox jumps over the lazy dog and keeps`, "running along the river bank until evening falls."], 10);
  const base = baselinePages();
  base[3] = msg001(PRECOMPOSED, "বেকান");
  base[9] = art011(PRECOMPOSED);
  const cur = baselinePages();
  cur[3] = msg001(DECOMPOSED, "BECAA-র");
  cur[9] = art011(DECOMPOSED);
  const corrections = [{ id: "MSG-001", find: `বেকান পরিচ${DECOMPOSED}`, replace: `BECAA-র পরিচ${DECOMPOSED}` }];
  const result = comparePdfPages(base, cur, { poemIds: POEM, newItemIds: NEW, corrections });
  assert.equal(result.summary.ok, true, JSON.stringify(result.pages.filter((p) => p.class === "unexplained")));
  assert.equal(pageOf(result, 4).class, "correction", "precomposed baseline + decomposed find/replace/current is still the expected correction");
  assert.equal(pageOf(result, 10).class, "unchanged", "a page differing only in the Unicode form of য় is unchanged");

  // The reverse direction (decomposed baseline, precomposed find) also matches.
  const r2 = comparePdfPages(cur.map((p, i) => (i === 3 ? msg001(DECOMPOSED, "বেকান") : p)), base.map((p, i) => (i === 3 ? msg001(PRECOMPOSED, "BECAA-র") : p)), {
    poemIds: POEM,
    newItemIds: NEW,
    corrections: [{ id: "MSG-001", find: `বেকান পরিচ${PRECOMPOSED}`, replace: `BECAA-র পরিচ${PRECOMPOSED}` }],
  });
  assert.equal(r2.summary.ok, true);
  assert.equal(pageOf(r2, 4).class, "correction");
}

console.log("pdf-compare-core: all assertions passed");
