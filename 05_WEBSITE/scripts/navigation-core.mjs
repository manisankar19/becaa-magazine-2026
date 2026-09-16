// Sprint v4 §4.6 (Decision I): the primary navigation holds one link per section,
// pointing at that section's first published item, instead of one label per item.
// Pure — no file or Eleventy access; eleventy.config.mjs exposes it as `sectionNav`.

export const SECTION_LABELS = Object.freeze({ messages: "Messages", articles: "Articles", events: "Events", gallery: "Gallery", advertisements: "Advertisements" });

export function sectionLabel(value = "", labels = SECTION_LABELS) {
  return labels[value] || value;
}

// `items` must already be the published, ordered list (whereWeb | byOrder); section
// order is the order of first appearance in it.
export function sectionNavigation(items = [], { labels = SECTION_LABELS, hasThanks = false } = {}) {
  const firstBySection = new Map();
  for (const item of items) {
    if (item?.section && !firstBySection.has(item.section)) firstBySection.set(item.section, item.id);
  }
  const links = [{ label: "Contents", href: "#contents" }];
  for (const [section, id] of firstBySection) links.push({ label: sectionLabel(section, labels), href: `#${id}` });
  links.push({ label: "Cultural Programmes", href: "#cultural-programmes" }, { label: "Connect", href: "#connect" });
  if (hasThanks) links.push({ label: "With Thanks", href: "#with-thanks" });
  return links;
}
