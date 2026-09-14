// Pure tracker rule evaluation (Sprint v3 Task 9). No xlsx, no file I/O —
// validate-tracker.mjs reads the workbook and hands rows/sheet names here.
// Returns an array of error strings (empty = valid).
export const EXPECTED_SHEETS = ["Content Tracker", "Lists", "Instructions"];
export const EXPECTED_ROW_COUNT = 52; // COV-001 + Items 1–24 + ADV-001…ADV-027
export const COMPLIMENTS_PREFIX = "With best compliments from ";

const yes = (v) => /^yes$/i.test(String(v ?? "").trim());
const id = (row) => String(row["Item ID"] ?? "").trim();

export function validateTrackerRows(rows, sheetNames) {
  const errors = [];
  if (sheetNames.join("|") !== EXPECTED_SHEETS.join("|")) errors.push(`Unexpected sheets: ${sheetNames.join(", ")}`);
  if (rows.length !== EXPECTED_ROW_COUNT) errors.push(`Expected ${EXPECTED_ROW_COUNT} tracker rows including COV-001 and Items 20-24, found ${rows.length}.`);

  const ids = rows.map(id);
  if (new Set(ids).size !== ids.length) errors.push("Duplicate tracker IDs detected.");

  const cover = rows.find((r) => id(r) === "COV-001");
  if (!cover || cover["Source File Name"] !== "cover page new.png" || cover.Status !== "Approved" || !yes(cover["Web Include"]) || !yes(cover["Print Include"])) {
    errors.push("COV-001 official cover approval fields are incomplete.");
  }

  // Item 20: source file still not received (unchanged since Sprint v2).
  const item20 = rows.find((r) => id(r) === "20");
  if (!item20 || yes(item20["Web Include"]) || yes(item20["Print Include"]) || !/^Excluded/.test(String(item20.Status))) {
    errors.push("Item 20 must remain recorded but excluded (Web/Print Include: No) pending its missing source file.");
  }

  // Item 24: approved in Sprint v3 and published as ART-012.
  const item24 = rows.find((r) => id(r) === "24");
  if (!item24 || item24.Status !== "Approved" || item24.Permission !== "Print and web" || !yes(item24["Web Include"]) || !yes(item24["Print Include"])) {
    errors.push("Item 24 must be Approved, Permission 'Print and web', Web/Print Include Yes (Sprint v3, published as ART-012).");
  }

  for (const row of rows.filter((r) => id(r).startsWith("ADV-"))) {
    const rid = id(row);
    const webOn = yes(row["Web Include"]);
    const printOn = yes(row["Print Include"]);
    if (webOn && (!/^approved$/i.test(String(row.Status)) || !String(row["Source File Name"]).trim() || row["Source File Name"] === "—")) {
      errors.push(`${rid} is web-enabled without approved available artwork.`);
    }
    if (printOn && !webOn) errors.push(`${rid} print/web inclusion is inconsistent.`);
    if (webOn || printOn) {
      const expected = `${COMPLIMENTS_PREFIX}${String(row["Contributor / Company"] ?? "").trim()}`;
      if (String(row["Title / Item"] ?? "").trim() !== expected) {
        errors.push(`${rid} published advertisement display title must be "${expected}" (found "${row["Title / Item"]}").`);
      }
    }
  }
  return errors;
}
