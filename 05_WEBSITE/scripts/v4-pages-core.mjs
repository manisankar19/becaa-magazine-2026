// Sprint v4 Task 30: which PDF pages to render as release evidence. Pure — callers pass the
// `pdftotext -layout` output split on form feeds. Item pages start with a kicker ending in
// "· ID"; following pages without a kicker continue that item until a non-item page.
const KICKER = /·\s*((?:MSG|ART|GAL|ADV|EVT)-\d{3})\s*$/;
const CONTENTS_HEADER = /Contents\s*$/;
const CONTENTS_ENTRY = /^\d{1,3}\.\s+.+\s(?:MSG|ART|GAL|ADV|EVT)-\d{3}$/;
const NON_ITEM_PAGE = /^(?:information and contact|sponsor acknowledgements)\b/i;

const firstLine = (page) => String(page).split("\n").map((l) => l.trim()).find(Boolean) ?? "";

function describe(pages) {
  let owner = null;
  let inContents = false;
  return pages.map((page, index) => {
    const first = firstLine(page);
    const kicker = first.match(KICKER);
    if (kicker) { owner = kicker[1]; inContents = false; return { page: index + 1, id: owner, contents: false }; }
    if (CONTENTS_HEADER.test(first) || (inContents && CONTENTS_ENTRY.test(first))) { owner = null; inContents = true; return { page: index + 1, id: null, contents: true }; }
    if (!first || NON_ITEM_PAGE.test(first)) { owner = null; inContents = false; return { page: index + 1, id: null, contents: false }; }
    inContents = false;
    return { page: index + 1, id: owner, contents: false };
  });
}

export function itemPageRanges(pages) {
  const ranges = new Map();
  for (const { page, id } of describe(pages)) {
    if (!id) continue;
    const range = ranges.get(id);
    if (range) range.last = page;
    else ranges.set(id, { first: page, last: page });
  }
  return ranges;
}

const expand = (id, { first, last }) => Array.from({ length: last - first + 1 }, (_, i) => ({ page: first + i, id }));

export function planV4PageRenders(pages, { evidenceIds = [], articleIds = [] } = {}) {
  const described = describe(pages);
  const ranges = itemPageRanges(pages);
  const rangeOf = (id) => {
    const range = ranges.get(id);
    if (!range) throw new Error(`planV4PageRenders: ${id} not found in the PDF text`);
    return range;
  };
  const contentsPages = described.filter((d) => d.contents).map((d) => d.page);
  const byPage = (a, b) => a.page - b.page;
  const evidence = [...contentsPages.map((page) => ({ page, id: "contents" })), ...evidenceIds.flatMap((id) => expand(id, rangeOf(id)))].sort(byPage);
  const justification = articleIds.flatMap((id) => expand(id, rangeOf(id))).sort(byPage);
  return { contentsPages, evidence, justification };
}
