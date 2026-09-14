// Sprint v3 Task 6 (sprints/v3/PRD.md §4.3) — pure advertisement retitling.
// Dependency-free (no file I/O) so it can be unit tested in isolation.
//
// Every published advertisement's generic public-facing title
// ("[Company] Advertisement" / "Advertisement from [Company]") becomes
// "With best compliments from [Company Name]", where the company name is the
// contributor already recorded in the manifest — never guessed or re-spelled.

export const COMPLIMENTS_PREFIX = "With best compliments from ";

const GENERIC_PATTERNS = [/^(.+) Advertisement$/, /^Advertisement from (.+)$/];

function isPublished(item) {
  return Boolean(item.web_include) || Boolean(item.print_include);
}

export function deriveComplimentsTitle(item) {
  const contributor = String(item.contributor ?? "").trim();
  if (!contributor) throw new Error(`${item.id}: empty contributor — cannot derive a compliments title`);
  const title = String(item.title ?? "").trim();
  if (title === `${COMPLIMENTS_PREFIX}${contributor}`) return title; // already correct
  if (!GENERIC_PATTERNS.some((re) => re.test(title))) {
    throw new Error(`${item.id}: unrecognised title pattern "${title}" — refusing to rewrite`);
  }
  return `${COMPLIMENTS_PREFIX}${contributor}`;
}

// items: manifest items; trackerRows: sheet_to_json rows of the Content Tracker.
// Returns { items: newArray, changes: [{id, from, to}] } without mutating inputs.
export function retitleAdvertisements(items, trackerRows = []) {
  const trackerById = new Map(trackerRows.map((row) => [String(row["Item ID"]).trim(), row]));
  const changes = [];
  const next = items.map((item) => {
    if (item.type !== "advertisement" || !isPublished(item)) return item;
    const row = trackerById.get(String(item.id).trim());
    if (!row) throw new Error(`${item.id}: no tracker row found for a published advertisement`);
    const trackerCompany = String(row["Contributor / Company"] ?? "").trim();
    const contributor = String(item.contributor ?? "").trim();
    if (!contributor) throw new Error(`${item.id}: empty contributor`);
    if (trackerCompany !== contributor) {
      throw new Error(`${item.id}: contributor mismatch — manifest "${contributor}" vs tracker "${trackerCompany}"`);
    }
    const to = deriveComplimentsTitle(item);
    if (to === item.title) return item;
    changes.push({ id: item.id, from: item.title, to });
    return { ...item, title: to };
  });
  return { items: next, changes };
}
