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
  const re = new RegExp(`· ${id.replace(/[-]/g, "\\-")}(?![0-9A-Za-z-])`);
  return pagesText.findIndex((page) => re.test(page));
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
