// Sprint v5 Task 25 (PRD §11, Decision P): advertisement card tints as a generated stylesheet.
// Until Sprint v5 the website set them with inline `style="--ad-bg: …; --ad-ink: …"`
// attributes, which the production CSP (default-src 'self') refuses, so no card showed its
// tint. The CSP stays strict; the same values now come from assets/css/ad-tints.css. Pure.
import { resolveInk } from "./ad-presentation-core.mjs";

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const ITEM_ID = /^[A-Z]{2,5}-\d{3}$/;

// { bg, ink, inkClass } for an advertisement with a tint, else null — the resolution the
// `adPageStyle`/`adInkClass` filters have always used (print.njk still uses them inline).
export function adTint(item = {}) {
  const ink = resolveInk(item);
  if (!ink || (item.page_background_mode ?? "auto") === "none") return null;
  if (!HEX.test(String(item.page_background)) || !HEX.test(String(ink.colour))) return null;
  return { bg: item.page_background, ink: ink.colour, inkClass: `ad-ink--${ink.ink}` };
}

// One `#ID { --ad-bg; --ad-ink }` rule per web-published advertisement with a tint.
export function adTintsStylesheet(items = []) {
  const rules = [];
  for (const item of items) {
    if (item.type !== "advertisement" || !item.web_include) continue;
    const tint = adTint(item);
    if (!tint) continue;
    if (!ITEM_ID.test(String(item.id))) throw new Error(`adTintsStylesheet: invalid advertisement id ${JSON.stringify(item.id)}`);
    rules.push(`#${item.id} { --ad-bg: ${tint.bg}; --ad-ink: ${tint.ink}; }`);
  }
  return `/* Generated from src/_data/publication.yaml by src/ad-tints.11ty.js (Sprint v5 Task 25) — do not edit. */\n${rules.join("\n")}\n`;
}
