// Pure validation rules for published advertisement presentation fields
// (Sprint v3 Task 10, sprints/v3/PRD.md §4.3–4.4; Sprint v4 Task 9 adds the
// `presentation`/`text_lines` rules, sprints/v4/PRD.md §5, Decision E). No I/O.
import { config } from "./config.mjs";
import { isHexColour, chooseInk, resolveInkColour, AA_MIN_RATIO } from "./contrast-core.mjs";

export const COMPLIMENTS_PREFIX = "With best compliments from ";

// Returns { ink, colour, ratio } for the item's effective ink, or null when no background.
export function resolveInk(item) {
  if (!isHexColour(item.page_background)) return null;
  const declared = item.page_ink ?? "auto";
  if (declared === "auto") return chooseInk(item.page_background);
  return resolveInkColour(item.page_background, declared);
}

export function validateAdvertisementPresentation(item) {
  const errors = [];
  if (item.type !== "advertisement" || !(item.web_include || item.print_include)) return errors;
  const id = item.id ?? "(missing id)";

  const title = String(item.title ?? "").trim();
  // Every presentation kind forbids a title ending "Advertisement" — checked
  // once, up front, regardless of which kind-specific rule runs next.
  if (/Advertisement$/.test(title)) errors.push(`${id} published advertisement title still ends with "Advertisement": "${title}"`);

  const presentation = item.presentation ?? "artwork";
  if (!config.advertisementPage.presentations.includes(presentation)) {
    errors.push(`${id} presentation must be one of ${config.advertisementPage.presentations.join("|")} (found "${presentation}")`);
  } else if (presentation === "artwork") {
    // Sprint v3 title rule, unchanged: the published title must be the exact
    // compliments sentence built from the contributor.
    const expectedTitle = `${COMPLIMENTS_PREFIX}${String(item.contributor ?? "").trim()}`;
    if (title !== expectedTitle) errors.push(`${id} published advertisement title must be exactly "${expectedTitle}" (found "${title}")`);
    if (item.text_lines !== undefined) errors.push(`${id} text_lines is only valid for text/memorial presentations (found on an artwork item)`);
  } else if (presentation === "text") {
    const lines = Array.isArray(item.text_lines) ? item.text_lines : null;
    if (!lines || lines.length !== 1) {
      errors.push(`${id} text presentation requires text_lines to be an array of exactly one line (found ${lines ? `${lines.length} lines` : JSON.stringify(item.text_lines ?? null)})`);
    } else if (title !== lines[0]) {
      errors.push(`${id} text presentation title must equal text_lines[0] exactly ("${lines[0]}", found "${title}")`);
    }
    if ((item.web_asset ?? "") !== "" || (item.print_asset ?? "") !== "") {
      errors.push(`${id} text presentation forbids web_asset/print_asset (found web_asset="${item.web_asset ?? ""}", print_asset="${item.print_asset ?? ""}")`);
    }
  } else if (presentation === "memorial") {
    const lines = Array.isArray(item.text_lines) ? item.text_lines : null;
    if (!lines || lines.length < 3) {
      errors.push(`${id} memorial presentation requires text_lines to have at least 3 lines (found ${lines ? `${lines.length} lines` : JSON.stringify(item.text_lines ?? null)})`);
    } else {
      const expectedTitle = `${lines[0]} ${lines[1]}`;
      if (title !== expectedTitle) errors.push(`${id} memorial presentation title must equal text_lines[0] + " " + text_lines[1] exactly ("${expectedTitle}", found "${title}")`);
    }
    if ((item.web_asset ?? "") === "") errors.push(`${id} memorial presentation requires a non-empty web_asset`);
    if ((item.print_asset ?? "") === "") errors.push(`${id} memorial presentation requires a non-empty print_asset`);
  }

  const mode = item.page_background_mode ?? "auto";
  if (!config.advertisementPage.backgroundModes.includes(mode)) errors.push(`${id} page_background_mode must be one of ${config.advertisementPage.backgroundModes.join("|")} (found "${mode}")`);
  const ink = item.page_ink ?? "auto";
  if (!config.advertisementPage.inkModes.includes(ink)) errors.push(`${id} page_ink must be one of ${config.advertisementPage.inkModes.join("|")} (found "${ink}")`);

  if (item.page_background !== undefined && item.page_background !== "" && !isHexColour(item.page_background)) {
    errors.push(`${id} page_background must be a #rrggbb hex colour (found "${item.page_background}")`);
  } else if (mode !== "none" && !isHexColour(item.page_background)) {
    errors.push(`${id} page_background is required when page_background_mode is "${mode}" (run: npm run sample:ad-backgrounds)`);
  }

  const resolved = resolveInk(item);
  if (resolved && resolved.ratio < AA_MIN_RATIO) {
    errors.push(`${id} page_ink "${resolved.ink}" reaches only ${resolved.ratio.toFixed(2)}:1 contrast on ${item.page_background}; ${AA_MIN_RATIO}:1 required`);
  }
  return errors;
}
