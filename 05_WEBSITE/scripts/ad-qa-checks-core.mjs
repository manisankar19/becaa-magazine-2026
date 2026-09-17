// Pure helpers shared by test-site.mjs and pdf-qa.mjs (Sprint v3 Task 15). No I/O.
export const COMPLIMENTS_PREFIX = "With best compliments from ";

// ads: manifest advertisement items; rendered: { [id]: string[] } of every rendered
// title text found for that id (card heading, contents entry, nav link, PDF heading…).
export function findBadAdvertisementTitles(ads, rendered) {
  const bad = [];
  for (const ad of ads) {
    const texts = (rendered[ad.id] ?? []).map((t) => String(t).replace(/\s+/g, " ").trim());
    if (texts.length === 0) { bad.push({ id: ad.id, text: "", reason: "no rendered title found" }); continue; }
    for (const text of texts) {
      if (/Advertisement$/.test(text)) bad.push({ id: ad.id, text, reason: 'ends with "Advertisement"' });
      else if (text !== ad.title) bad.push({ id: ad.id, text, reason: "does not equal the manifest title" });
    }
  }
  return bad;
}

// Index of the PDF page whose text contains the item's kicker ("… · ADV-018") as a whole token.
export function findPdfPageIndex(pagesText, id) {
  const needle = `· ${id}`;
  const hasToken = (page) => {
    for (let at = page.indexOf(needle); at !== -1; at = page.indexOf(needle, at + 1)) {
      if (!/[0-9A-Za-z-]/.test(page[at + needle.length] ?? "")) return true;
    }
    return false;
  };
  return pagesText.findIndex(hasToken);
}

export function pixelMatchesHex([r, g, b], hex, tolerance) {
  const [er, eg, eb] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.abs(r - er) <= tolerance && Math.abs(g - eg) <= tolerance && Math.abs(b - eb) <= tolerance;
}

// A sample point just inside the 18 mm @page margin on a page rasterised at `dpi`.
export function contentBoxSamplePoint(dpi) {
  const margin = Math.round((18 / 25.4) * dpi);
  return { x: margin + 5, y: margin + 5 };
}

// PDF contents lines ("N. <title> <ID>") → Map(ID → { number, title }). A long title wraps,
// so an entry may continue on following lines and its ID may stand alone on the last one.
const CONTENTS_ID = /(?:^|\s)((?:MSG|ART|GAL|ADV|EVT)-\d{3})$/;
export function contentsEntries(lines) {
  const entries = new Map();
  let pending = null;
  for (const raw of lines) {
    const line = String(raw).trim();
    if (!line) continue;
    const start = line.match(/^(\d{1,3})\.\s+(.*)$/);
    if (start) pending = { number: Number(start[1]), parts: [start[2]] };
    else if (pending) pending.parts.push(line);
    else continue;
    const text = pending.parts.join(" ").replace(/\s+/g, " ").trim();
    const id = text.match(CONTENTS_ID);
    if (id) {
      entries.set(id[1], { number: pending.number, title: text.slice(0, text.length - id[1].length).trim() });
      pending = null;
    }
  }
  return entries;
}
