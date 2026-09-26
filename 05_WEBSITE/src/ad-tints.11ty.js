// Sprint v5 Task 25 (PRD §11, Decision P): writes assets/css/ad-tints.css — one `#ID { --ad-bg;
// --ad-ink }` rule per web-published advertisement — so the cards get their tints without inline
// style attributes, which the production CSP (default-src 'self') refuses.
import { adTintsStylesheet } from "../scripts/ad-tints-core.mjs";

export const data = { permalink: "assets/css/ad-tints.css", eleventyExcludeFromCollections: true };

export function render({ publication }) {
  return adTintsStylesheet(publication.items);
}
