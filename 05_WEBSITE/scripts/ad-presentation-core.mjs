// Pure validation rules for published advertisement presentation fields
// (Sprint v3 Task 10, sprints/v3/PRD.md §4.3–4.4). No I/O.
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

  const expectedTitle = `${COMPLIMENTS_PREFIX}${String(item.contributor ?? "").trim()}`;
  const title = String(item.title ?? "").trim();
  if (/Advertisement$/.test(title)) errors.push(`${id} published advertisement title still ends with "Advertisement": "${title}"`);
  else if (title !== expectedTitle) errors.push(`${id} published advertisement title must be exactly "${expectedTitle}" (found "${title}")`);

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
