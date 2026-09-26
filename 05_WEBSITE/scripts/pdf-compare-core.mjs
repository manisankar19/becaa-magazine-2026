// Pure page-by-page comparison of two review PDFs' extracted text (Sprint v4 Task 31, PRD §4.7,
// Decision L). No I/O: callers pass the `pdftotext -layout` output split into pages.
//
// Normalisation decision. Every compared string (baseline pages, current pages, correction
// find/replace) is NFC-normalised, the page-number footer is dropped, and the comparison key
// then has ALL whitespace removed. pdftotext splits Bengali conjuncts with spurious spaces
// (`বন্ধুরা` → `বন্ধু রা`), and print justification changes only inter-word spacing and line
// breaks, so whitespace carries no content in this report. Consequently a page whose text
// differs only in whitespace is `unchanged`/`shifted` (the note says so), and an item whose
// text is identical but redistributed across pages is `reflow`. The cost: an edit that only
// inserts or removes a space is not detected.
//
// Replaced items (Sprint v5 Task 16). An item whose whole text was replaced by a new approved
// source (MSG-001, the President's new message) cannot be explained by find/replace pairs. The
// caller passes `replacedItems: [{ id, expectedText }]`; the item's pages are `replaced-item`
// only when the item exists in both PDFs, its text differs from the baseline, and its current
// text equals `expectedText` compared case-insensitively (the PDF kicker is uppercased by CSS)
// and without whitespace. Anything else is `unexplained`.

export const PAGE_CLASSES = ["unchanged", "shifted", "contents", "poem", "new-item", "correction", "replaced-item", "reflow", "unexplained"];

const ITEM_ID = String.raw`[A-Z]{2,5}-\d{3}`;
const KICKER = new RegExp(String.raw`·\s*(${ITEM_ID})$`);
const CONTENTS_HEADER = /(?:^|\s)Contents$/;
const CONTENTS_ENTRY_LINE = new RegExp(String.raw`^\d{1,3}\.\s+.+\s${ITEM_ID}$`);
const CONTENTS_ENTRY = new RegExp(String.raw`(?:^|\s)(\d{1,3})\.\s+(.+?)\s+(${ITEM_ID})(?=\s|$)`, "g");
// An all-caps multi-word first line with no kicker ("SPONSOR ACKNOWLEDGEMENTS") starts a
// non-item page, so it is never swallowed as the continuation of the preceding item.
const SECTION_HEADING = /^[A-Z][A-Z&'’,:/-]*(?:\s+[A-Z&'’,:/-]+)+$/;
const FOOTER = /^\d{1,4}$/;

export function splitPdfText(text) {
  const pages = String(text).split("\f");
  if (pages.length && pages[pages.length - 1].trim() === "") pages.pop();
  return pages;
}

function bodyLines(raw) {
  const lines = String(raw).normalize("NFC").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length && FOOTER.test(lines[lines.length - 1])) lines.pop();
  return lines;
}

export function normalisePageText(raw) {
  return bodyLines(raw).join(" ").replace(/\s+/g, " ").trim();
}

const keyOf = (text) => String(text).normalize("NFC").replace(/\s+/g, "");

function describePages(pages) {
  const out = [];
  let owner = null;
  let inContents = false;
  pages.forEach((raw, index) => {
    const lines = bodyLines(raw);
    const collapsed = lines.join(" ").replace(/\s+/g, " ");
    const layout = lines.map((l) => l.replace(/\s+/g, " ")).join("\n"); // keeps line breaks, for notes only
    const first = lines[0] ?? "";
    const kicker = KICKER.exec(first);
    let kind;
    if (kicker) {
      owner = kicker[1];
      inContents = false;
      kind = "item";
    } else if (CONTENTS_HEADER.test(first) || (inContents && CONTENTS_ENTRY_LINE.test(first))) {
      owner = null;
      inContents = true;
      kind = "contents";
    } else if (first === "") {
      kind = "blank"; // keeps the current owner; a blank page carries no text to compare
    } else if (SECTION_HEADING.test(first) || !owner) {
      owner = null;
      inContents = false;
      kind = "matter";
    } else {
      kind = "continuation";
    }
    const itemId = kind === "item" || kind === "continuation" ? owner : null;
    out.push({ index, collapsed, layout, key: keyOf(collapsed), kind, itemId });
  });
  return out;
}

function itemSpans(desc) {
  const spans = new Map();
  for (const p of desc) {
    if (!p.itemId) continue;
    if (!spans.has(p.itemId)) spans.set(p.itemId, []);
    spans.get(p.itemId).push(p);
  }
  return spans;
}

function contentsBlock(desc) {
  const pages = desc.filter((p) => p.kind === "contents");
  const entries = [];
  const residual = pages
    .map((p) => p.collapsed)
    .join(" ")
    .replace(CONTENTS_ENTRY, (_m, no, title, id) => {
      entries.push({ no: Number(no), title, id });
      return " ";
    });
  return { pages, entries, residualKey: keyOf(residual) };
}

// Short, human-readable pointer to where two whitespace-free keys first diverge.
function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (i === a.length && i === b.length) return "";
  const from = Math.max(0, i - 12);
  return `baseline "…${a.slice(from, i + 18)}…" vs current "…${b.slice(from, i + 18)}…"`;
}

// True when `find` occurs somewhere not wholly inside an occurrence of `replace` — needed
// because a replacement may contain its own superseded form (`Late Biswajit Sengupta`).
function supersededPresent(text, find, replace) {
  const covered = [];
  for (let at = text.indexOf(replace); replace && at !== -1; at = text.indexOf(replace, at + 1)) covered.push([at, at + replace.length]);
  for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + 1)) {
    if (!covered.some(([s, e]) => s <= at && at + find.length <= e)) return true;
  }
  return false;
}

function groupCorrections(corrections) {
  const byId = new Map();
  for (const c of corrections) {
    const entry = { find: String(c.find).normalize("NFC"), replace: String(c.replace).normalize("NFC") };
    entry.findKey = keyOf(entry.find);
    entry.replaceKey = keyOf(entry.replace);
    if (!byId.has(c.id)) byId.set(c.id, []);
    byId.get(c.id).push(entry);
  }
  return byId;
}

function applyCorrections(key, list) {
  let out = key;
  for (const c of list) if (c.findKey && out.includes(c.findKey)) out = out.split(c.findKey).join(c.replaceKey);
  return out;
}

function checkCorrectedItem(baseSpan, curSpan, list) {
  if (!baseSpan || !curSpan) return { ok: false, problems: [baseSpan ? "item missing from the current PDF" : "item missing from the baseline PDF"] };
  const before = baseSpan.map((p) => p.key).join("");
  const after = curSpan.map((p) => p.key).join("");
  const problems = [];
  let expected = before;
  for (const c of list) {
    if (!c.findKey || !expected.includes(c.findKey)) problems.push(`superseded form "${c.find}" not found in the baseline`);
    else expected = expected.split(c.findKey).join(c.replaceKey);
    if (!after.includes(c.replaceKey)) problems.push(`expected replacement "${c.replace}" not found`);
    if (supersededPresent(after, c.findKey, c.replaceKey)) problems.push(`superseded form "${c.find}" still present`);
  }
  if (!problems.length && after !== expected) problems.push(`text differs beyond the expected corrections: ${firstDifference(expected, after)}`);
  return { ok: problems.length === 0, problems };
}

function checkReplacedItem(baseSpan, curSpan, expectedKey) {
  if (!baseSpan) return { ok: false, class: "unexplained", note: "item not in the baseline; only an existing item can be replaced" };
  if (!curSpan) return { ok: false, class: "unexplained", note: "item missing from the current PDF" };
  const before = baseSpan.map((p) => p.key).join("").toLowerCase();
  const after = curSpan.map((p) => p.key).join("").toLowerCase();
  if (after === before) return { ok: false, class: "unexplained", note: "item declared replaced but its text is unchanged (not replaced)" };
  if (after !== expectedKey) return { ok: false, class: "unexplained", note: `replacement text differs from the expected text: ${firstDifference(expectedKey, after)}` };
  return { ok: true, class: "replaced-item", note: "authorised replacement; text equals the expected text" };
}

function explainContents(baseBlock, curBlock, correctionsById, newIds) {
  const problems = [];
  const baseIds = new Set(baseBlock.entries.map((e) => e.id));
  if (baseBlock.residualKey !== curBlock.residualKey) problems.push({ id: null, text: `contents text outside the entries differs: ${firstDifference(baseBlock.residualKey, curBlock.residualKey)}` });

  const added = curBlock.entries.filter((e) => newIds.has(e.id) && !baseIds.has(e.id));
  const rest = curBlock.entries.filter((e) => !added.includes(e));
  const changed = [];
  if (rest.map((e) => e.id).join(",") !== baseBlock.entries.map((e) => e.id).join(",")) {
    const restIds = new Set(rest.map((e) => e.id));
    const missing = baseBlock.entries.filter((e) => !restIds.has(e.id)).map((e) => e.id);
    const unexpected = rest.filter((e) => !baseIds.has(e.id)).map((e) => e.id);
    for (const id of missing) problems.push({ id, text: `entry ${id} missing` });
    for (const id of unexpected) problems.push({ id, text: `unexpected entry ${id}` });
    if (!missing.length && !unexpected.length) problems.push({ id: null, text: "entries reordered" });
  } else {
    rest.forEach((cur, i) => {
      const before = keyOf(baseBlock.entries[i].title);
      const expected = applyCorrections(before, correctionsById.get(cur.id) ?? []);
      const now = keyOf(cur.title);
      if (now === expected && expected !== before) changed.push(cur.id);
      else if (now !== expected) problems.push({ id: cur.id, text: `title of ${cur.id} is "${cur.title}", expected ${expected === before ? "no change" : "the corrected title"}` });
    });
  }
  const sequential = (entries) => entries.every((e, i) => e.no === i + 1);
  if (sequential(baseBlock.entries) && !sequential(curBlock.entries)) problems.push({ id: null, text: "entry numbering is not sequential" });

  const itemIds = curBlock.entries.filter((e) => added.includes(e) || changed.includes(e.id)).map((e) => e.id);
  const parts = [];
  if (added.length) parts.push(`${added.length} new entr${added.length === 1 ? "y" : "ies"} (${added.map((e) => e.id).join(", ")})`);
  if (changed.length) parts.push(`corrected title${changed.length === 1 ? "" : "s"} (${changed.join(", ")})`);
  return { ok: problems.length === 0, problems, itemIds, note: parts.join("; ") };
}

/**
 * Classify every current page against the baseline.
 * @param {string[]} baselinePages page texts of the baseline PDF
 * @param {string[]} currentPages page texts of the current PDF
 * @param {{ poemIds?: string[], newItemIds?: string[], corrections?: {id: string, find: string, replace: string}[],
 *   replacedItems?: {id: string, expectedText: string}[] }} options
 * @returns {{ pages: {page: number, class: string, itemIds: string[], baselinePage: number|null, note: string}[],
 *   removedBaselinePages: {baselinePage: number, class: string, itemIds: string[], note: string}[],
 *   summary: {baselinePageCount: number, currentPageCount: number, counts: Record<string, number>,
 *   unexplained: number, removedUnexplained: number, ok: boolean} }}
 */
export function comparePdfPages(baselinePages, currentPages, { poemIds = [], newItemIds = [], corrections = [], replacedItems = [] } = {}) {
  const base = describePages(baselinePages);
  const cur = describePages(currentPages);
  const poems = new Set(poemIds);
  const newIds = new Set(newItemIds);
  const correctionsById = groupCorrections(corrections);
  const replaced = new Map(replacedItems.map((r) => [r.id, keyOf(r.expectedText).toLowerCase()]));
  const baseSpans = itemSpans(base);
  const curSpans = itemSpans(cur);

  // Exact (whitespace-free) matches: same index first, then anywhere else in order.
  const matchOf = new Array(cur.length).fill(null);
  const baseUsed = new Set();
  cur.forEach((p, i) => {
    if (base[i] && base[i].key === p.key) {
      matchOf[i] = i;
      baseUsed.add(i);
    }
  });
  cur.forEach((p, i) => {
    if (matchOf[i] !== null) return;
    const j = base.findIndex((b, bj) => !baseUsed.has(bj) && b.key === p.key);
    if (j !== -1) {
      matchOf[i] = j;
      baseUsed.add(j);
    }
  });

  const itemChecks = new Map();
  const itemCheck = (id) => {
    if (!itemChecks.has(id)) {
      const b = baseSpans.get(id);
      const c = curSpans.get(id);
      let result;
      if (replaced.has(id)) result = checkReplacedItem(b, c, replaced.get(id));
      else if (poems.has(id)) result = { ok: true, class: "poem", note: "authorised poem re-extraction" };
      else if (newIds.has(id) && !b) result = { ok: true, class: "new-item", note: "authorised new item" };
      else if (correctionsById.has(id)) {
        const check = checkCorrectedItem(b, c, correctionsById.get(id));
        const list = correctionsById.get(id).map((x) => `"${x.find}" → "${x.replace}"`).join(", ");
        result = check.ok ? { ok: true, class: "correction", note: `committee correction ${list}` } : { ok: false, class: "unexplained", note: `correction check failed: ${check.problems.join("; ")}` };
      } else if (b && c) {
        const before = b.map((p) => p.key).join("");
        const after = c.map((p) => p.key).join("");
        result = before === after ? { ok: true, class: "reflow", note: "item text unchanged; redistributed across pages" } : { ok: false, class: "unexplained", note: `item text differs: ${firstDifference(before, after)}` };
      } else result = { ok: false, class: "unexplained", note: b ? "item missing from the current PDF" : "item not in the baseline and not an authorised new item" };
      itemChecks.set(id, result);
    }
    return itemChecks.get(id);
  };

  const baseContents = contentsBlock(base);
  const curContents = contentsBlock(cur);
  const contents = explainContents(baseContents, curContents, correctionsById, newIds);
  const contentsFailing = new Set();
  if (!contents.ok) {
    const problemIds = contents.problems.map((p) => p.id).filter(Boolean);
    for (const p of curContents.pages) {
      const tokens = new Set(p.collapsed.split(" "));
      if (matchOf[p.index] === null || problemIds.some((id) => tokens.has(id))) contentsFailing.add(p.index);
    }
    if (!contentsFailing.size && curContents.pages.length) contentsFailing.add(curContents.pages[0].index);
  }

  const counterpart = (p) => {
    if (p.kind === "contents") return baseContents.pages[curContents.pages.indexOf(p)] ?? null;
    if (p.itemId) return baseSpans.get(p.itemId)?.[curSpans.get(p.itemId).indexOf(p)] ?? null;
    return null;
  };

  const pages = cur.map((p, i) => {
    const matched = matchOf[i];
    const row = { page: i + 1, class: "unexplained", itemIds: p.itemId ? [p.itemId] : [], baselinePage: null, note: "" };
    if (p.kind === "contents" && (!contents.ok ? contentsFailing.has(i) : matched === null)) {
      // The block is judged as a whole; ids and problems are reported on the page that shows them.
      const tokens = new Set(p.collapsed.split(" "));
      const onPage = contents.problems.filter((x) => !x.id || tokens.has(x.id));
      row.class = contents.ok ? "contents" : "unexplained";
      row.itemIds = contents.ok ? contents.itemIds.filter((id) => tokens.has(id)) : onPage.map((x) => x.id).filter(Boolean);
      row.baselinePage = counterpart(p) ? counterpart(p).index + 1 : null;
      row.note = contents.ok ? contents.note : (onPage.length ? onPage : contents.problems).map((x) => x.text).join("; ");
      return row;
    }
    // A failed correction check overrides an exact match on the item's first page, so an
    // unapplied correction is reported even when nothing on the page changed.
    // The same holds for a declared replacement that is missing or wrong.
    const failedCorrection = p.itemId && (correctionsById.has(p.itemId) || replaced.has(p.itemId)) && !itemCheck(p.itemId).ok;
    // The poem re-extraction mostly adds line breaks, i.e. whitespace, so a poem page whose
    // spacing differs is still reported as `poem` rather than hidden as unchanged.
    const poemSpacing = matched !== null && poems.has(p.itemId) && base[matched].layout !== p.layout;
    if (matched !== null && !poemSpacing && !(failedCorrection && curSpans.get(p.itemId)[0] === p)) {
      row.class = matched === i ? "unchanged" : "shifted";
      row.baselinePage = matched + 1;
      const notes = [];
      if (matched !== i) notes.push(`same text as baseline page ${matched + 1}`);
      if (base[matched].layout !== p.layout) notes.push("whitespace-only difference");
      row.note = notes.join("; ");
      return row;
    }
    if (p.itemId) {
      const check = itemCheck(p.itemId);
      row.class = check.class;
      row.note = check.note;
      const cp = counterpart(p);
      row.baselinePage = check.class === "new-item" || !cp ? null : cp.index + 1;
      return row;
    }
    row.note = "page text not found in the baseline";
    return row;
  });

  const matchedCurrentIndex = new Set(matchOf.map((j, i) => (j === null ? null : i)).filter((i) => i !== null));
  const removedBaselinePages = [];
  base.forEach((b, j) => {
    if (baseUsed.has(j)) return;
    if (b.kind === "contents") {
      if (curContents.pages[baseContents.pages.indexOf(b)]) return;
      removedBaselinePages.push({ baselinePage: j + 1, class: contents.ok ? "contents" : "unexplained", itemIds: [], note: contents.ok ? "contents now uses fewer pages" : "contents page removed" });
      return;
    }
    if (b.itemId) {
      const cp = curSpans.get(b.itemId)?.[baseSpans.get(b.itemId).indexOf(b)];
      if (cp && !matchedCurrentIndex.has(cp.index)) return; // reported on its current counterpart
      const check = itemCheck(b.itemId);
      const cls = check.class === "new-item" ? "unexplained" : check.class;
      removedBaselinePages.push({ baselinePage: j + 1, class: cls, itemIds: [b.itemId], note: cls === "unexplained" ? `baseline page has no counterpart; ${check.note}` : `item now uses fewer pages; ${check.note}` });
      return;
    }
    removedBaselinePages.push({ baselinePage: j + 1, class: "unexplained", itemIds: [], note: "baseline page text not found in the current PDF" });
  });

  const counts = Object.fromEntries(PAGE_CLASSES.map((c) => [c, 0]));
  for (const row of pages) counts[row.class] += 1;
  const removedUnexplained = removedBaselinePages.filter((r) => r.class === "unexplained").length;
  return {
    pages,
    removedBaselinePages,
    summary: {
      baselinePageCount: base.length,
      currentPageCount: cur.length,
      counts,
      unexplained: counts.unexplained,
      removedUnexplained,
      ok: counts.unexplained === 0 && removedUnexplained === 0,
    },
  };
}
