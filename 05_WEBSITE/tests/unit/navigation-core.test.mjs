// Unit test for scripts/navigation-core.mjs — Sprint v4 Task 17 (PRD §4.6, Decision I). Hermetic.
import assert from "node:assert/strict";
import { SECTION_LABELS, sectionLabel, sectionNavigation } from "../../scripts/navigation-core.mjs";

// --- Fixture helpers -------------------------------------------------------
const item = (id, section, order) => ({ id, section, order, web_include: true });

// The published manifest's shape today: sections appear in this order by `order`.
const currentShape = [
  item("MSG-001", "messages", 10),
  item("MSG-002", "messages", 20),
  item("MSG-003", "messages", 30),
  item("ART-001", "articles", 100),
  item("ART-002", "articles", 110),
  item("GAL-001", "gallery", 300),
  item("GAL-002", "gallery", 310),
  item("ADV-001", "advertisements", 400),
  item("ADV-002", "advertisements", 410),
];

const expectedCurrent = [
  { label: "Contents", href: "#contents" },
  { label: "Messages", href: "#MSG-001" },
  { label: "Articles", href: "#ART-001" },
  { label: "Gallery", href: "#GAL-001" },
  { label: "Advertisements", href: "#ADV-001" },
  { label: "Cultural Programmes", href: "#cultural-programmes" },
  { label: "Connect", href: "#connect" },
  { label: "With Thanks", href: "#with-thanks" },
];

// --- Scenario 1: current manifest shape → 8 entries in the approved order ----
{
  const nav = sectionNavigation(currentShape, { hasThanks: true });
  assert.deepEqual(nav, expectedCurrent, "current shape yields the eight approved links, first published item per section");
  assert.equal(nav.length, 8);
  assert.equal(new Set(nav.map((l) => l.label)).size, 8, "every label appears once");
}

// --- Scenario 2: more articles and advertisements do not add links ----------
{
  const extended = [
    ...currentShape,
    item("ART-013", "articles", 120),
    item("ART-014", "articles", 130),
    item("ADV-030", "advertisements", 420),
    item("ADV-031", "advertisements", 430),
    item("ADV-032", "advertisements", 440),
  ];
  const nav = sectionNavigation(extended, { hasThanks: true });
  assert.equal(nav.length, 8, "two extra articles and three extra advertisements still yield eight links");
  assert.deepEqual(nav, expectedCurrent, "targets remain the first published item of each section");
}

// --- Scenario 3: no sponsor acknowledgement message → 7 ---------------------
{
  const nav = sectionNavigation(currentShape, { hasThanks: false });
  assert.equal(nav.length, 7, "With Thanks omitted when hasThanks is false");
  assert.ok(!nav.some((l) => l.label === "With Thanks"));
  assert.deepEqual(nav, expectedCurrent.slice(0, 7));
  // A string (the manifest message) or empty value is coerced to a boolean.
  assert.equal(sectionNavigation(currentShape, { hasThanks: "BECAA Maharashtra warmly thanks…" }).length, 8);
  assert.equal(sectionNavigation(currentShape, { hasThanks: "" }).length, 7);
  assert.equal(sectionNavigation(currentShape).length, 7, "hasThanks defaults to false");
}

// --- Scenario 4: unknown section label falls back to the raw key ------------
{
  const nav = sectionNavigation([...currentShape, item("EVT-001", "souvenirs", 500)], { hasThanks: true });
  assert.equal(nav.length, 9, "a genuinely new section adds exactly one link");
  assert.deepEqual(nav[5], { label: "souvenirs", href: "#EVT-001" }, "unknown section key used verbatim as the label");
  assert.equal(sectionLabel("souvenirs"), "souvenirs");
  assert.equal(sectionLabel("events"), "Events");
  // Custom label map is honoured.
  const custom = sectionNavigation(currentShape, { labels: { ...SECTION_LABELS, messages: "Desk messages" }, hasThanks: true });
  assert.equal(custom[1].label, "Desk messages");
}

// --- Scenario 5: order of first appearance follows the given (ordered) list --
{
  const reordered = [item("GAL-005", "gallery", 1), item("MSG-002", "messages", 2), item("GAL-001", "gallery", 3)];
  const nav = sectionNavigation(reordered, { hasThanks: false });
  assert.deepEqual(nav.slice(1, 3), [{ label: "Gallery", href: "#GAL-005" }, { label: "Messages", href: "#MSG-002" }], "sections follow first appearance, targets are the first item seen");
  assert.equal(sectionNavigation([], { hasThanks: true }).length, 4, "no items → only the four fixed links");
  assert.ok(!sectionNavigation([{ id: "X-1", order: 1 }], {}).some((l) => l.href === "#X-1"), "items without a section are skipped");
}

// --- Scenario 6: the shared label map is frozen and matches the Sprint v3 map
{
  assert.deepEqual({ ...SECTION_LABELS }, { messages: "Messages", articles: "Articles", events: "Events", gallery: "Gallery", advertisements: "Advertisements" });
  assert.ok(Object.isFrozen(SECTION_LABELS));
}

console.log("navigation-core: all assertions passed");
