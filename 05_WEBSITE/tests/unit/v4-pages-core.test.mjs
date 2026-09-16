// Unit test for scripts/v4-pages-core.mjs — Sprint v4 Task 30 (release evidence renders). Hermetic.
import assert from "node:assert/strict";
import { itemPageRanges, planV4PageRenders } from "../../scripts/v4-pages-core.mjs";

const pages = [
  "cover",
  "একই শিকড় — Contents\n 1. President Desk MSG-001\n",
  " 45. Best Compliment from Sarc Epic ADV-027\n",
  "INFORMATION AND CONTACT\n",
  "MESSAGES · MSG-001\nPresident Desk\n…\n  5",
  "continued message text\n  6",
  "ARTICLES · ART-003\nস্মৃতির গলিতে\n",
  "ARTICLES · ART-010\nগোলাপ\n",
  "ARTICLES · ART-011\n…",
  "more of ART-011",
  "Advertisements · ADV-027\nBest Compliment from Sarc Epic\n",
  "Advertisements · In memoriam · ADV-029\nIn fond memory of\n",
  "Sponsor Acknowledgements\nWith Thanks\n",
];

// --- page ranges per item (1-based, inclusive); continuation pages belong to the item ---
const ranges = itemPageRanges(pages);
assert.deepEqual(ranges.get("MSG-001"), { first: 5, last: 6 });
assert.deepEqual(ranges.get("ART-003"), { first: 7, last: 7 });
assert.deepEqual(ranges.get("ART-011"), { first: 9, last: 10 });
assert.deepEqual(ranges.get("ADV-029"), { first: 12, last: 12 }, "the sponsor page after the memorial is not part of it");
assert.equal(ranges.has("GAL-001"), false);

// --- render plan ---
const plan = planV4PageRenders(pages, { evidenceIds: ["MSG-001", "ART-003", "ART-010", "ADV-027", "ADV-029"], articleIds: ["ART-003", "ART-010", "ART-011"] });
assert.deepEqual(plan.contentsPages, [2, 3], "contents pages (header page plus the entry continuation)");
assert.deepEqual(plan.evidence.map((e) => `${e.page}-${e.id}`), ["2-contents", "3-contents", "5-MSG-001", "6-MSG-001", "7-ART-003", "8-ART-010", "11-ADV-027", "12-ADV-029"]);
assert.deepEqual(plan.justification.map((e) => `${e.page}-${e.id}`), ["7-ART-003", "8-ART-010", "9-ART-011", "10-ART-011"]);
assert.throws(() => planV4PageRenders(pages, { evidenceIds: ["ART-999"], articleIds: [] }), /ART-999 not found/);
console.log("v4-pages-core: all assertions passed");
