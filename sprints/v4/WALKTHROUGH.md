# Sprint v4 — Walkthrough (Tasks 1–47)

Scope note: Sprint v4 had 37 planned tasks across streams A–F. Task 38 (Stream G) was added during execution, and Tasks 39–47 (Stream H) after the owner's approvals of 2026-09-17. All are complete and on `main`; Task 35 was superseded by Task 45.

- Streams A–D: intake and consolidation, the poem, three new advertisements, navigation (Tasks 1–20).
- Streams E–G: committee corrections, build and release (`V4_REVIEW_01`), pre-release gate fixes (Tasks 21–38).
- Stream H (2026-09-17): five approved corrections, the `V4_REVIEW_02` release, and deployment to Preview and then Production (Tasks 39–47).

**Production:** `https://becaa-magazine-2026-portal.vercel.app` serves `V4_REVIEW_02` (deployment `…-l8beok45l-…`). The Sprint v3 deployment is kept for rollback. The deployment record is `sprints/v4/PREVIEW_DEPLOYMENT.md`.

## Summary

This slice of Sprint v4 does three things to the BECAA Maharashtra Magazine 2026 site (an Eleventy static build that produces both a website and a print PDF from one hand-authored manifest): it merges a stray `v2-incoming/` subfolder back into the single `02_INCOMING_CONTENT/` intake location with full provenance; it re-extracts the poem "গোলাপ" (ART-010) from a corrected Markdown source so every line renders as its own line, on web and in print; and it adds three new advertisement pages — two text-only compliments ads and one memorial — by extending the advertisement system with a `presentation` concept (`artwork` | `text` | `memorial`) instead of assuming every advertisement is a piece of artwork. Finally, it fixes the website's top navigation, which printed one section label per *item* (51 links with the current manifest: "Articles" ×12, "Advertisements" ×25…; PRD §1.1 counted 48 before Stream C's three advertisements), so that it shows one link per *section* (8 links), each pointing to that section's first published item and derived from the manifest at build time. Nothing in the application layer (registration, authentication, admin, database) was touched, and the print/PDF, welcome and admin pages build byte-identically before and after the navigation change.

The second half of the sprint applies five corrections the BECAA committee sent after planning. Two Bengali wording and spelling fixes (`MSG-001`, `ART-003`) and a title spelling fix (`MSG-002`) are made with a count-guarded, code-point-exact text-correction tool. A new `display_name` field shows "Late Biswajit Sengupta" in the bylines of `ART-004`/`ART-005` without changing the recorded contributor. A print-only CSS rule justifies article prose. None of it overwrites an original contributor document; a controlled correction record in `02_INCOMING_CONTENT/` is the source of truth. The release pipeline then gains a V4 step list (`npm run release:v4`) with a page-by-page PDF comparison against the Sprint v3 release and rendered PDF evidence. That pipeline produced `V4_REVIEW_01`: 47 items, a 72-page PDF, all 30 gated steps green and no unexplained PDF difference.

Verifying `V4_REVIEW_01` raised five findings; the owner approved changes for them on 2026-09-17:
- ADV-028's new wording;
- text-only and memorial pages that show their text once, with no repeated heading;
- the Bengali "প্রয়াত" author line in ART-004/005;
- removal of a stray control character from ART-009;
- navigation jumps that clear the sticky header.

These went into `V4_REVIEW_02`, which was verified locally, on a Preview deployment (including the full administrator flow) and on Production.

## Architecture Overview

```
                    02_INCOMING_CONTENT/           04_MAGAZINE_WORKING/
                    (single intake folder,          BECAA_2026_Content_Tracker.xlsx
                    v2-incoming/ merged in)          (54 rows, 3 sheets)
                            │                                │
                            │ git mv (Task 3/4)               │ snapshot-first edits
                            │ consolidate-incoming.mjs        │ tracker-v4-core.mjs
                            ▼                                ▼
              ┌─────────────────────────┐      ┌──────────────────────────┐
              │ Extraction scripts       │      │ Manifest builder scripts │
              │  extract-v4-golap.mjs    │      │  add-v4-manifest-items   │
              │  (readVerseSource)       │      │  normalize-v4-memorial-  │
              │                          │      │  image (sharp)           │
              └────────────┬─────────────┘      └─────────────┬────────────┘
                            │                                  │
                            ▼                                  ▼
              ┌─────────────────────────────────────────────────────────┐
              │        05_WEBSITE/src/_data/publication.yaml             │
              │        (the ONE manifest — 47 items after this batch)    │
              │  ART-010: source_file → Shubhra Basu.md                  │
              │  ADV-027/028/029: presentation: text | text | memorial   │
              └───────────────────────────┬───────────────────────────────┘
                                           │  readManifest()
                    ┌──────────────────────┼───────────────────────┐
                    ▼                      ▼                       ▼
         ┌────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
         │ ad-presentation-    │ │ index.njk / print.njk │ │ validate.mjs /       │
         │ core.mjs            │ │ (Eleventy templates,  │ │ validate-tracker-    │
         │ validateAdvertise-  │ │ branch on item.        │ │ core.mjs             │
         │ mentPresentation()  │ │ presentation)          │ │ (gates)              │
         └──────────┬──────────┘ └───────────┬────────────┘ └──────────┬───────────┘
                    │                        │                         │
                    └────────────┬───────────┴──────────┬──────────────┘
                                 ▼                       ▼
                      ┌───────────────────┐   ┌──────────────────────┐
                      │ _site/index.html   │   │ _site/print/index.html│
                      │ (website, via      │   │ → compile-pdf.mjs →   │
                      │ layouts/base.njk)  │   │ BECAA-2026-complete-  │
                      │                    │   │ review.pdf            │
                      └─────────┬──────────┘   └───────────┬───────────┘
                                │                           │
                                └─────────────┬─────────────┘
                                              ▼
                          e2e/QA scripts (web-ad-cards, print-ad-pages,
                          print-poem-page, v4-advertisements, site-navigation
                          — all counts derived from readManifest(), never
                          hardcoded)
```

Stream D (navigation) sits entirely inside the website's layout step:

```
 publication.yaml ──readManifest / Eleventy data──▶ publication.items (47)
                                                        │
                            whereWeb (web_include) ─────┤
                            byOrder  (order value) ─────┤
                                                        ▼
                     eleventy.config.mjs filter  sectionNav(items, hasThanks)
                                                        │ calls
                                                        ▼
                     scripts/navigation-core.mjs  sectionNavigation()  ◀── SECTION_LABELS
                       [Contents] + first item per section (in order of   (also used by the
                       first appearance) + [Cultural Programmes, Connect,  sectionLabel filter
                       With Thanks if sponsor_acknowledgement_message]     in index/print.njk)
                                                        │
                                                        ▼
                     layouts/base.njk  <nav aria-label="Primary" data-testid="primary-nav">
                                       8 × <a href="#MSG-001">Messages</a> …
                                                        │
                                                        ▼
                     _site/index.html  (welcome/admin use public.njk — no nav;
                                        print uses print.njk — no nav)
```

Streams E–G (committee corrections and release) add a correction layer in front of the manifest and a comparison and evidence layer after the PDF:

```
 sprints/v4/v4changev2.md ──▶ 02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md
 (committee addendum)          (human-readable authority: old → new text per item ID)
                                         │ mirrored, code-point exact, in
                                         ▼
                     scripts/v4-corrections.mjs
                       V4_FILE_CORRECTIONS (file, find, replace, expectedCount)
                       V4_CORRECTIONS      (how each change reads in rendered text)
                         │                      │                           │
      apply-v4-committee-corrections.mjs   apply-v4-corrections-         pdf-compare.mjs
      └─ text-correction-core.mjs          tracker-updates.mjs           └─ pdf-compare-core.mjs
         applyCorrection / correctionState └─ tracker-corrections-core
         │                                    (snapshot first)
         ▼                                    ▼
 MSG-001 / MSG-002 / ART-003 content,     BECAA_2026_Content_Tracker.xlsx
 publication.yaml (MSG-002 title+alt,     (rows 16, 17, 5, 6, 7)
 ART-004/005 display_name)
         │
         ▼
 Eleventy build ── byline filter prefers display_name ──▶ _site/index.html
                └─ print.njk: print-page--{type} ──────▶ _site/print/index.html
                   print.css: justify .print-page--article .prose p     │ compile-pdf
                                                                         ▼
                                                    BECAA-2026-complete-review.pdf
                                                         │                 │
                            qa:pdf-compare  ◀────────────┘                 └──▶ qa:v4-pages
                            vs 06_FINAL_OUTPUT/V3_REVIEW_02                    (pdftoppm renders)
                            (fails on any unexplained page)
                                                         │
                                  npm run release:v4 (V4 step list, release-core.mjs)
                                                         ▼
                                          06_FINAL_OUTPUT/V4_REVIEW_01/
```

## Files Created/Modified

Tasks 1–16: 77 files changed (+4,151 / −206 lines) across 15 commits plus 2 merge-conflict/doc-only commits. Tasks 17–20: 8 files changed (+350 / −18 lines) across 3 task commits and 1 documentation commit (`git diff 445a8ac..6c1751a`). Tasks 21–38: 18 commits (`git log 4751640..1f73a3a`); 41 source/documentation files changed (+2,249 / −44 lines), plus the 319-file release folder `06_FINAL_OUTPUT/V4_REVIEW_01/`. Grouped by stream below; every new module gets its own subsection, mechanical/count-only edits to existing files are grouped into tables.

### Stream A — Intake and consolidation (Tasks 2–4)

#### `scripts/incoming-consolidation-core.mjs` (new, Task 2)
**Purpose**: Pure planning logic — given two file inventories, decide what's safe to merge.
**Key function**: `planConsolidation({ parentFiles, subFiles })` → `{ ok, collisions, nearNames, moves, inventoryAfter }`. Also exports `nameSimilarity(a, b)`.

**How it works**: Every file is a plain `{ name, bytes, sha256 }` object — this module never touches the filesystem, so it's trivial to unit test with fabricated fixtures. It builds two maps keyed by lowercased filename, flags any name that collides case-insensitively (either between the two folders, or *within* the incoming subfolder itself — e.g. two independently-uploaded `Notes.docx`), and sets `ok: false` if any collision exists. Separately, it computes a Sørensen–Dice bigram-similarity score (`2·|A∩B| / (|A|+|B|)` over 2-character substrings, extension stripped) between every cross-folder name pair and reports anything ≥ 0.6 as a "near name" — informational only, never blocking. `moves` lists every subfolder file *not* caught in a collision as `{ from: "v2-incoming/<name>", to: "<name>" }`.

```js
function diceCoefficient(a, b) {
  if (a === b) return 1;
  const bigramsA = bigrams(a), bigramsB = bigrams(b);
  // ... count shared bigrams ...
  return (2 * matches) / (bigramsA.length + bigramsB.length);
}
```
Real-world check: `cover page new.png` vs `Cover page.jpg` scores 0.818 (same photo, renamed and reformatted) — reported as a near-name pair, not a collision, since the hashes differ.

#### `scripts/consolidate-incoming.mjs` (new, Tasks 3–4)
**Purpose**: The CLI that actually reads the two real folders, calls the core planner, and (on `--apply`) performs the move.
**Key functions**: `resolveDirs(options)`, `readFolderInventory(dir)`, `findLiveReferences(roots, {needle})`, `buildPlanReport()`, `runPlan()`, `runApply()`.

**How it works**: `--plan` builds a full report — real folder inventories (21 parent + 5 subfolder files), the `planConsolidation()` result, and a grep-style scan of `scripts/`, `src/`, `tests/` for the literal string `v2-incoming` — and writes it as both JSON and a human-readable Markdown table to `04_MAGAZINE_WORKING/INCOMING_CONSOLIDATION_2026-09-15.{json,md}`. It touches nothing on disk and exits non-zero if any collision exists. `--apply` re-derives the same plan, refuses to run unless it's collision-free *and* has exactly 5 moves (a sanity check that the folders are in the expected pre-apply state), then performs each move with `execFileSync("git", ["mv", from, to])` — never a shell string, never a wildcard — and only removes the now-empty `v2-incoming/` directory after every single move has succeeded. Every directory path is overridable via function options or `CONSOLIDATE_INCOMING_*` env vars, so the integration test runs the real CLI as a child process against a temporary fixture pair of folders instead of the live project tree.

**Result**: `Palash Article.docx`, `Shubhra Basu.md`, `Siddhartha Mukhopadhyay story.docx`, `chatgpt kallol.jpeg`, and `cover page new.png` moved from `02_INCOMING_CONTENT/v2-incoming/` directly into `02_INCOMING_CONTENT/`, each as a git-detected 100% rename (byte-identical, full history preserved). `v2-incoming/` no longer exists.

#### Reference updates (Task 4) — mechanical, one line each unless noted

| File | Change |
|---|---|
| `src/_data/publication.yaml` | 5 `source_file:` lines repointed (GAL-007, ART-010*, ART-011, ART-012, `cover.source_file`) |
| `src/content/articles/{ART-010,ART-011,ART-012}-item.md` | front-matter `source_file:` repointed |
| 10 scripts (`add-v2-manifest-items`, `add-v3-manifest-items`, `apply-v2-exclusions`, `extract-v2-golap`, `extract-v2-palash-article`, `extract-v3-siddhartha-story`, `merge-v2-addendum-tracker`, `normalize-v2-cover`, `normalize-v2-gallery-image`, `update-v2-cover-manifest`) | hardcoded `v2-incoming/` path literal removed |
| 4 tests (`cover-manifest-entry`, `extract-v3-siddhartha-story`, `normalize-cover-core`, `superseded-sources`) | expected path updated to match |
| `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/README.md` | dated addendum appended (not rewritten) |

\* ART-010's `source_file`/`source_fingerprint` were deliberately left pointing at the (now-deleted) `.docx` by Task 4 — Task 6 owns updating those to the real `.md`, since it's the one doing the actual re-extraction.

### Stream B — The poem, ART-010 "গোলাপ" (Tasks 5–8)

#### `scripts/article-markdown-core.mjs` — `readVerseSource()` added (Task 5)
**Purpose**: Parse and validate the verse-Markdown convention (`# heading`, `**author**`, blank line, N poem lines) into structured data.
**Signature**: `readVerseSource(markdownText, { expectedCount } = {}) → { heading, author, lines: string[] }`, throws with a specific message on any structural defect.

**How it works — and the bug this task caught**: The obvious reading of the spec ("N lines each ending `<br>`") would require every line, including the last, to carry a trailing `<br>` marker. But the real authoritative source (`Shubhra Basu.md`, verified byte-for-byte) has only **16** `<br>` markers for its **17** lines — the last line simply has none. That's correct, not truncated: `<br>` is the separator *between* lines, and N items need only N−1 separators. The function was corrected mid-sprint (commit `1a03eb1`) to exempt only the final line from the requirement:

```js
const lines = bodyLines.map((line, lineIndex) => {
  const withoutTrailingWhitespace = line.replace(/[ \t\r]+$/, "");
  const isLastLine = lineIndex === bodyLines.length - 1;
  if (withoutTrailingWhitespace.endsWith(BR_MARKER)) return withoutTrailingWhitespace.slice(0, -BR_MARKER.length);
  if (isLastLine) return withoutTrailingWhitespace;
  throw new Error(`readVerseSource: line ${lineIndex + 1} is missing the trailing "<br>" marker: ...`);
});
```
Had this not been caught, Task 6 would have thrown on the very first run against the real file.

#### `scripts/extract-v4-golap.mjs` (new, Task 6)
**Purpose**: Turn the authoritative `.md` source into the published `ART-010-item.md`, and repoint the manifest at it.
**Key functions**: `buildGolapBody({heading, author, lines})`, `extractGolap()`, `updateManifestSourceFields()`.

**How it works**: Verifies the source file's SHA-256 against a hardcoded expected value before doing anything (`0d068f30b846c0b7…`) — a defence against silently publishing from the wrong file if someone edits it later. Calls `readVerseSource(text, {expectedCount: 17})`, then re-joins the result as `title, author, "", ...17 lines each with <br> re-appended`. Note this is a deliberate normalization: even though the *source's* 17th line has no `<br>`, the *published* body gets one on every line — harmless (nothing follows the last line anyway) and simpler to reason about downstream. The manifest edit is the same "exact old line → exact new line, count-guarded, re-parsed" surgery pattern used throughout this sprint, not a full YAML rewrite. `extract-v2-golap.mjs` (the old DOCX-based extractor) is deleted in this same commit.

#### CSS — `.prose p:has(br)` (Task 7)
Added to both `site.css` (previously had `.prose` rules) and `print.css` (previously had *no* `.prose` block at all — one was created). The `:has()` selector targets any paragraph containing a hard break — i.e., verse — and forces `text-align: left; hyphens: none;` with a relaxed line-height, so it can never be justified or word-broken even by a future prose-justification rule elsewhere in the stylesheet (this is what keeps the poem left-aligned under Task 27's print justification).

#### `tests/e2e/print-poem-page.test.mjs` (new, Task 8)
Locates ART-010's page in the compiled PDF via `pdftotext -layout`, matching its kicker text (`· ART-010`) the same way the advertisement QA tooling locates ad pages, then asserts all 17 lines appear in source order, one per text line, with no split or merged line. Comparison strips whitespace to tolerate a real `pdftotext` Bengali-conjunct rendering quirk without masking an actual split/merge (verified against synthetic broken fixtures).

### Stream C — Three new advertisements (Tasks 9–16)

This is the largest stream: it turns "every advertisement is a photo with a fixed compliments-sentence title" into three presentation kinds.

#### `scripts/ad-presentation-core.mjs` — `presentation` added to `validateAdvertisementPresentation()` (Task 9)
**Purpose**: The single source of truth for what a valid advertisement item looks like, now covering three shapes.

**How it works**: `item.presentation` defaults to `"artwork"` when absent (so all 22 pre-existing advertisements are unaffected). The title-ends-with-"Advertisement" check now runs once, up front, for every kind. Then it branches:

```js
} else if (presentation === "text") {
  const lines = Array.isArray(item.text_lines) ? item.text_lines : null;
  if (!lines || lines.length !== 1) errors.push(`... requires text_lines to be an array of exactly one line ...`);
  else if (title !== lines[0]) errors.push(`... title must equal text_lines[0] exactly ...`);
  if ((item.web_asset ?? "") !== "" || (item.print_asset ?? "") !== "") errors.push(`... forbids web_asset/print_asset ...`);
} else if (presentation === "memorial") {
  // requires >= 3 text_lines, title === lines[0] + " " + lines[1], BOTH assets required
}
```
`artwork` keeps the exact Sprint v3 rule (title must equal `"With best compliments from " + contributor`) and additionally now forbids `text_lines` being present at all.

#### `src/index.njk` / `src/print.njk` — presentation branching (Tasks 10–11)
Both templates now branch on `item.presentation` inside the existing advertisement/gallery block:
- `text` → a single `<p class="ad-text" data-testid="ad-text-{{id}}">{{ text_lines[0] }}</p>` (Nunjucks auto-escaped, never `| safe`) replaces the artwork `<figure>` entirely.
- `memorial` → an uncropped `<figure class="ad-frame ad-frame--memorial">` (no `target="_blank"` link, unlike artwork ads) followed by `<div class="ad-memorial">` looping all seven `text_lines` into individual `<p>` elements, with the second line (`loop.index0 == 1`, the departed's name) getting an `.ad-memorial__name` emphasis class. The section-kicker itself is swapped to `Advertisements · In memoriam · {{id}}` for memorial items via a `{% set kickerLabel = ... %}` computed once at the top of the loop.
- `artwork` (and gallery) → unchanged.

New CSS: `.ad-text` (`clamp(1.9rem, 4.5vw, 3rem)` web / `30pt` print, centred, `max-width: 20ch`, tinted via the existing `--ad-bg`/`--ad-ink` custom properties) and `.ad-memorial`/`.ad-memorial__name` (centred stack, name line larger and bolder, image `object-fit: contain` with a bounded `max-height` so the square memorial photo is never cropped or distorted).

#### `scripts/normalize-v4-memorial-image.mjs` (new, Task 12)
Same shape as the existing `normalize-v2-gallery-image.mjs`: reads `02_INCOMING_CONTENT/Supriyo.JPG` (1687×1687 source), writes a web derivative (1600×1600, q88) and a print derivative — which, because the source is already narrower than the 2480px print target, `withoutEnlargement: true` correctly holds at 1687×1687 rather than upscaling. No crop, no distortion — the full square frame is kept exactly as supplied.

#### `scripts/add-v4-manifest-items.mjs` (new, Task 13)
Appends three fully-specified advertisement objects — `ADV-027` (Sarc Epic, `presentation: "text"`), `ADV-028` (M/s Balajee Infrate, `presentation: "text"`), `ADV-029` (the memorial, `presentation: "memorial"`, referencing Task 12's derivatives, `source_fingerprint` computed at runtime and cross-checked against a known hash) — as YAML blocks spliced directly before the `sponsor_acknowledgements:` anchor in `publication.yaml`, using the same `buildManifestItemBlock()` helper Sprint v3 established. Note: `ADV-027` did **not** exist in the manifest before this task at all (only as an *excluded* row in the tracker spreadsheet) — for the manifest, all three items are new insertions, not updates. Idempotent: re-running with all three already present is a no-op; a partially-applied state (only some present) is refused rather than silently patched.

#### `scripts/tracker-v4-core.mjs` + `apply-v4-tracker-updates.mjs` (new, Task 14)
`tracker-v4-core.mjs` is pure (no xlsx I/O): `buildV4TrackerRows(headers, rows)` reuses the existing `applyTrackerFieldUpdates()` to revise the `ADV-027` row in place (title/company → Sarc Epic, status → Approved, old Remarks preserved and a new note appended rather than erased) and the poem's own row — tracker "Item ID 22", identified via `ART-010`'s manifest note "Tracker Item ID 22" — gets a Remarks note recording the source revision with **the correctly re-verified SHA-256** (`0d068f30b846c0b7…`; an earlier planning draft had a wrong placeholder hash, corrected before this task was dispatched). It then inserts two brand-new rows (`ADV-028`, `ADV-029`) directly after `ADV-027`'s position, modelled on the existing `mergeAddendumRows` row-normalization pattern. `apply-v4-tracker-updates.mjs` is the thin I/O wrapper: snapshot first (`tracker-io.mjs`'s `snapshotTracker`), only write if something actually changed, preserve cell styles.

#### Count-derivation sweep (Task 15)
Every place that hardcoded "22 advertisements" now derives its count from `readManifest()` — because the manifest now has 25 published advertisements (22 artwork + 2 text + 1 memorial), 23 of which have artwork/a photo. Touched: `tests/e2e/web-ad-cards.test.mjs`, `tests/e2e/print-ad-pages.test.mjs`, `scripts/app-e2e.mjs`, `scripts/test-site.mjs` (also removed `ADV-027` from a hardcoded "excluded IDs" list — it's published now, not excluded), plus three more places the same "hardcoded count" pattern was found lurking beyond the task's originally-declared file list: `scripts/advertisement-title-core.mjs`'s `retitleAdvertisements()` (would have thrown on the new titles), and four Sprint v3 test fixtures with hardcoded row/item counts.

#### `tests/integration/v4-advertisements.test.mjs` (new, Task 16)
The final consistency check: for each of the three new items, asserts identical wording across five independent surfaces — the manifest, the built website card, the `#contents` entry, the compiled PDF's text (`pdftotext -layout`), and the tracker row — plus ID uniqueness, exact memorial contributor names (checked as two distinct rendered lines, never one concatenated string), and that neither "With best compliments" nor a stray "Advertisement" title suffix leaks onto any of the three pages.

### Stream D — Navigation (Tasks 17–20)

Root cause, as recorded in PRD §1.1: `src/_includes/layouts/base.njk` looped over **every** published item and printed its section label as a link, so the header held Contents ×1, Messages ×3, Articles ×12, Gallery ×7, Advertisements ×25, plus the three fixed links (51 links once Stream C's three advertisements landed). The item-by-item listing a reader actually wants already exists separately as the `#contents` section of `index.njk`. The fix replaces the per-item loop in the generator rather than hiding links with CSS.

| Commit | Task | Content |
|---|---|---|
| `1d4f2ee` | 17 | `navigation-core.mjs` + unit test |
| `42a2d6f` | 18 | `sectionNav` filter, `base.njk`, render test |
| `bf47fbc` | 19 | Playwright navigation E2E, `test:e2e:nav` |
| — | 20 | Verification only (no code) |
| `6c1751a` | — | `TASKS.md` completion notes and session log |

#### `scripts/navigation-core.mjs` (new, Task 17)
**Purpose**: Pure logic that turns the published, ordered item list into the primary-navigation link list.
**Key exports**:
- `SECTION_LABELS` — frozen map `messages → Messages`, `articles → Articles`, `events → Events`, `gallery → Gallery`, `advertisements → Advertisements` (moved here from an inline object in `eleventy.config.mjs`, values unchanged).
- `sectionLabel(value, labels)` — label lookup; unknown keys fall back to the raw key.
- `sectionNavigation(items, { labels, hasThanks })` — returns `[{ label, href }]`.

**How it works**: The function assumes its input has already been filtered to published items and sorted by `order` (the template does that with the existing `whereWeb` and `byOrder` filters), so "section order" simply means "order of first appearance". A `Map` preserves insertion order, and only the first item seen per section is kept:

```js
const firstBySection = new Map();
for (const item of items) {
  if (item?.section && !firstBySection.has(item.section)) firstBySection.set(item.section, item.id);
}
const links = [{ label: "Contents", href: "#contents" }];
for (const [section, id] of firstBySection) links.push({ label: sectionLabel(section, labels), href: `#${id}` });
links.push({ label: "Cultural Programmes", href: "#cultural-programmes" }, { label: "Connect", href: "#connect" });
if (hasThanks) links.push({ label: "With Thanks", href: "#with-thanks" });
```

No item IDs are hard-coded (Decision I). With today's 47-item manifest this yields exactly eight links: Contents, Messages → `#MSG-001`, Articles → `#ART-001`, Gallery → `#GAL-001`, Advertisements → `#ADV-001`, Cultural Programmes, Connect, With Thanks. Adding more articles or advertisements cannot add links; only a genuinely new section key would add one (and it would appear with its raw key as the label until `SECTION_LABELS` is extended). Keeping the label map in this module means the navigation and the existing `sectionLabel` filter (used for card kickers in `index.njk`/`print.njk`) cannot drift apart.

#### `eleventy.config.mjs` (modified, Task 18)
**Purpose**: Eleventy configuration and template filters.
**Change**: the `sectionLabel` filter now delegates to `navigation-core`'s `sectionLabel`, and a new filter is registered:

```js
config.addFilter("sectionLabel", (value = "") => sectionLabel(value));
config.addFilter("sectionNav", (items = [], hasThanks = false) => sectionNavigation(items, { hasThanks: Boolean(hasThanks) }));
```

`hasThanks` receives the manifest's `sponsor_acknowledgement_message` string, so it is coerced to a boolean: a non-empty message shows the With Thanks link, an empty or missing one hides it, matching the old `{% if %}` in the layout.

#### `src/_includes/layouts/base.njk` (modified, Task 18)
**Purpose**: The website's page shell (header, brand link, primary navigation, main, footer). Used only by `index.njk`; `welcome.njk` and `admin.njk` use `public.njk` (no navigation), and `print.njk` uses `layouts/print.njk`.
**Change**: the item loop and the three hand-written fixed links collapse into one loop over the filter's output, and the `<nav>` gains a test hook while keeping its accessible name:

```njk
<nav aria-label="Primary" data-testid="primary-nav">
  {% for link in publication.items | whereWeb | byOrder | sectionNav(publication.sponsor_acknowledgement_message) %}
    <a href="{{ link.href }}">{{ link.label }}</a>
  {% endfor %}
</nav>
```

Output is auto-escaped (no `| safe`). No CSS changed: the existing pill style, `flex-wrap: wrap`, the `nav a:focus` background highlight and the ≤780 px stacked header already handle eight links. Visual result: one row on desktop (1440 px), two rows beside the brand on tablet (820 px), a wrapped three-row block under the brand on mobile (390 px).

#### `tests/unit/navigation-core.test.mjs` (new, Task 17)
Hermetic, six scenarios: the current manifest shape gives the eight approved links with `#MSG-001`/`#ART-001`/`#GAL-001`/`#ADV-001`; adding two articles and three advertisements still gives the same eight; `hasThanks: false` (and `""`, and omitted) gives seven; an unknown section uses its raw key; a custom label map is honoured; section order follows first appearance, items with no `section` are skipped, an empty list gives only the four fixed links; `SECTION_LABELS` is frozen and matches the Sprint v3 values. Written first and confirmed failing (module not found) before the implementation existed.

#### `tests/integration/base-nav-render.test.mjs` (new, Task 18 — not in the task's declared file list)
Added so Task 18 had its own failing-first test. It follows the `ad-text-render.test.mjs` approach: collect the real filters from `eleventy.config.mjs` through a small `addFilter` shim, register them on a Nunjucks environment, and render the real `layouts/base.njk`. It asserts the `sectionNav` filter exists; with the **real manifest**, the nav has `aria-label="Primary"`, `data-testid="primary-nav"`, the eight labels in order, and section hrefs equal to the first published item per section; with a **hermetic fixture** (items deliberately out of order, one unpublished advertisement with the lowest order, no thanks message), the output is sorted, ignores the unpublished item and has seven links; and `public.njk` contains no `<nav>` while `welcome.njk`/`admin.njk` still use it. No build is needed.

#### `tests/e2e/site-navigation.test.mjs` (new, Task 19) and `package.json`
**Purpose**: Browser-level proof of the navigation on the built site, wired as `npm run test:e2e:nav` (requires `npm run build`).
**How it works**: Serves `_site/` with the existing `tests/e2e/static-server.mjs` and opens Chromium at 390×844, 820×1180 and 1440×900. Expected hrefs are computed from `readManifest()` (published items sorted by `order`), never typed in. At each width it checks:
- exactly one `[data-testid="primary-nav"]` with `aria-label="Primary"`, exactly eight links by role, labels once each in order;
- every href non-empty, equal to the manifest-derived target, and `document.querySelector(href)` non-null;
- no horizontal overflow (`scrollWidth <= clientWidth`), every link box inside the viewport, and the nav's bounding box not intersecting the brand link's;
- keyboard: pressing `Tab` from the top reaches the eight links in order, and each focused link's computed background/colour/outline differs from its unfocused state (the visible focus pill);
- clicking each link updates `location.hash` and leaves the target's top at the top of the viewport (or within view when the page is scrolled to the bottom). Smooth scrolling is disabled in the test page so this check is not timing-dependent.

Screenshots: `qa-output/navigation/{mobile,tablet,desktop}.png` plus `desktop-focus.png` (header strip with a focused link). They were inspected visually. `qa-output/` is git-ignored, so the files are regenerated by running the test and are intended to be copied into the release at Task 33/34. As a red check, the test was run against the pre-Task-18 `base.njk` and failed at the first assertion (no `primary-nav`), then passed against the new layout.

`package.json` changes: `test:unit` gains `navigation-core.test.mjs`; `test:integration` gains `base-nav-render.test.mjs`; new script `test:e2e:nav`.

#### Task 20 — gate and application re-run (verification only)
No files changed. After a fresh `npm run build` and `npm run pdf`, every suite was run sequentially (results in **Test Coverage**). The DB-dependent suites ran this time: the project's local PostgreSQL cluster on `127.0.0.1:5433` had no other client connections, the suites use the separate `becaa_test` database, and the app servers bind ephemeral ports, so nothing belonging to another session was started, stopped or rebound. `git diff 445a8ac..HEAD` shows no change under `api/`, `lib/`, `middleware.ts`, `db/`, `src/welcome.njk`, `src/admin.njk`, `src/assets/`, `06_FINAL_OUTPUT/` or folders `01_`–`04_`. In a throwaway worktree at `445a8ac`, the built `_site/print/index.html`, `_site/welcome/index.html` and `_site/admin/index.html` were byte-identical to the new build, and both PDFs have 72 pages.

### Stream E — Committee corrections (Tasks 21–29)

The committee's addendum (`sprints/v4/v4changev2.md`) asked for five changes to already-approved content. The design choices follow PRD §7.1 (Decisions O–U):

- Every text change is **exact and count-guarded**: it either replaces precisely the expected number of occurrences or stops.
- The **original contributor documents are never edited**; a controlled correction record is the authority.
- Each correction is **proved three ways**: in the working content or manifest, in the built website, and in the text extracted from the PDF.

| Commit | Task | Content |
|---|---|---|
| `ae098d5` | 21 | Addendum and correction record committed |
| `7d74827`, `2417deb` | 22 | `text-correction-core.mjs` + Unicode-mismatch hint |
| `f8d1672` | 23 | `MSG-001` wording; corrections data module and apply script; regression test |
| `f1b2105` | 24 | `MSG-002` title (and `alt`) |
| `f825e59` | 25 | `ART-003` spellings |
| `88dcf8a` | 26 | `display_name`; `ART-004`/`ART-005` bylines |
| `7ec5967` | 27 | Print-only article justification |
| `9e9aa0e` | 28 | Tracker updates |
| — | 29 | Verification only (after Task 38) |

#### `02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md` (new, Task 21)
**Purpose**: The authoritative editorial record for the five corrections, since the committee supplied no revised contributor document.

**How it works**: For each manifest ID it states the working file, the untouched original source file, the exact old and new text, the number of occurrences to change, and the committee's reason.
- **`MSG-001`:** records the whole confirmed sentence (Decision O). It also says what must *not* change: the salutation `প্রিয় বেকান ও বেকানী বন্ধুরা,` and every `বেকানী`.
- **`ART-004`/`ART-005`:** says the date and circumstances of death are not published.
- **Encoding note (added in Task 23):** explains a finding made while applying the first correction. The Bengali letter য় can be stored as one code point (U+09DF) or two (U+09AF U+09BC), which render identically. `MSG-001-president-desk.md` uses the first form throughout and `ART-003-item.md` the second. The record's own text is Unicode NFC; each correction is applied in the target file's own form.

#### `scripts/text-correction-core.mjs` (new, Task 22)
**Purpose**: Pure, exact text replacement that can never drift silently.
**Key functions**:
- `applyCorrection(text, { find, replace, expectedCount, wholeWord = true })` — replaces exactly `expectedCount` occurrences or throws.
- `countOccurrences(text, find, { wholeWord })` — counts matches.
- `correctionState(text, correction)` — returns `"pending"` or `"applied"`, and throws on any mixed or missing state.

**How it works**: JavaScript's `\b` only understands ASCII, so "whole word" is checked explicitly: the characters either side of a match must not be a Unicode letter, combining mark or digit. That is what separates `বেকান` from `বেকানী`, which is `বেকান` plus the vowel sign `ী` (a combining mark):

```js
const WORD_CHAR = /[\p{L}\p{M}\p{N}_]/u;
if (wholeWord) {
  const before = text.slice(0, i).at(-1) ?? "";
  const after = text[i + find.length] ?? "";
  if (WORD_CHAR.test(before) || WORD_CHAR.test(after)) continue;
}
```

**Replacements that contain their own find string**: `Biswajit Sengupta` → `Late Biswajit Sengupta` is the awkward case. A match that lies inside an existing occurrence of the replacement counts as already corrected, so re-running a correction is a no-op rather than producing "Late Late". `correctionState` builds on this: exactly the expected number of uncorrected matches and no replacements is `pending`; none left and the replacement present the expected number of times is `applied`; anything else throws. That makes every apply script safe to re-run.

**The Unicode hint (`2417deb`)**: the first real run found 0 occurrences of `বেকান পরিচয়` in `MSG-001`, because the typed text used the two-code-point form. Matching stays code-point exact (normalising would change the file's bytes around the edit), but the error now says why:

```
applyCorrection: expected 1 occurrence(s) of "বেকান পরিচয়", found 0 (1 after Unicode NFC normalisation — match the file's code points exactly)
```

The unit test (8 scenarios) includes a fixture reproducing `MSG-001`'s verified counts: 3 substring matches of `বেকান`, 2 standalone words, 1 `বেকানী`.

#### `scripts/v4-corrections.mjs` (new, Task 23; extended in Tasks 24–26)
**Purpose**: The correction record in machine-readable form, shared by the apply script, the regression test, the tracker update and the PDF comparison.
**Exports**:
- `V4_FILE_CORRECTIONS` — edits to working files.
- `V4_CORRECTIONS` — how each change reads in rendered text.
- `MSG001_SENTENCE` — the confirmed old and new sentence, plus the untouched salutation.

**How it works**: Bengali strings that contain য় are written with `\u` escapes, so the code point is visible in source and cannot be normalised away by an editor. The file-edit list:

```js
{ id: "MSG-001", file: "src/content/messages/MSG-001-president-desk.md", find: "বেকান পরিচ\u09DF", replace: "BECAA-র পরিচ\u09DF", expectedCount: 1 },
{ id: "MSG-002", file: "src/_data/publication.yaml", find: "Vice Preseident Desk", replace: "Vice President Desk", expectedCount: 2 }, // title and alt
{ id: "MSG-002", file: "src/content/messages/MSG-002-vice-preseident-desk.md", find: "Vice Preseident Desk", replace: "Vice President Desk", expectedCount: 1 },
{ id: "ART-003", file: "src/content/articles/ART-003-item.md", find: "ভাইবই", replace: "ভাবা\u09AF\u09BC", expectedCount: 1 },
{ id: "ART-003", file: "src/content/articles/ART-003-item.md", find: "পারিমা", replace: "পরিমা", expectedCount: 1 },
{ id: "ART-004/ART-005", file: "src/_data/publication.yaml", find: "    contributor: Biswajit Sengupta\n", replace: "    contributor: Biswajit Sengupta\n    display_name: Late Biswajit Sengupta\n", expectedCount: 2 },
```

`MSG-002`'s manifest `alt` field repeated the misspelled title, which is why the manifest edit expects 2. `ART-004`/`ART-005` get their `display_name` line through the same guarded mechanism, so the manifest is only ever changed by recorded edits.

#### `scripts/apply-v4-committee-corrections.mjs` (new, Task 23)
**Purpose**: Applies `V4_FILE_CORRECTIONS` to the working files (`npm run corrections:apply-v4 [-- --only MSG-001,ART-003]`).
**Key function**: `applyV4FileCorrections({ only, root, corrections })`.

**How it works**: For each selected correction it:
1. resolves the path and refuses anything outside `05_WEBSITE/`;
2. asks `correctionState` whether the edit is pending or applied;
3. writes only when pending, and reports `applied` or `already applied`.

A partially edited file makes it stop. The content changes in Tasks 23–26 were made by this script, one ID at a time, never by hand.

#### Content and manifest changes (Tasks 23–26)

| File | Change | Diff |
|---|---|---|
| `src/content/messages/MSG-001-president-desk.md` | `বেকান` → `BECAA-র` in the confirmed sentence only | 1 word |
| `src/content/messages/MSG-002-vice-preseident-desk.md` | front matter `title` → `Vice President Desk`; filename and the body's `Vice President’s Desk` line unchanged (Decision P) | 1 line |
| `src/content/articles/ART-003-item.md` | `ভাইবই` → `ভাবায়`, `পারিমা` → `পরিমা` | 2 words |
| `src/_data/publication.yaml` | `MSG-002` `title` and `alt`; `display_name: Late Biswajit Sengupta` added under `ART-004` and `ART-005` | 4 lines |

The regression test proves each file equals its content at `ae098d5` (Task 21, before any correction) with exactly the recorded substitutions applied, and nothing else.

#### `eleventy.config.mjs` — `byline` filter (modified, Task 26)
**Purpose**: Builds the "Name, Branch, YYYY Batch — Designation" line used on website cards and print pages.
**Change**: the primary name is now `display_name` when it is a non-blank string, otherwise `contributor`:

```js
const displayName = typeof item.display_name === "string" && item.display_name.trim() ? item.display_name : item.contributor;
const details = [displayName];
```

`contributor` stays the provenance/audit identity; the manifest, tracker and correction record still say `Biswajit Sengupta`. The byline filter is shared by `index.njk` and `print.njk`, so the website and the PDF change together. The contents lists render titles only and are unaffected. `scripts/config.mjs` needed no change because no field allow-list is enforced there. New `tests/unit/eleventy-config.test.mjs` covers the filter:
- existing bylines are unchanged;
- `display_name` replaces only the name;
- blank or `null` values fall back to `contributor`;
- the input item is not mutated.

#### `src/print.njk` and `src/assets/css/print.css` — print-only justification (modified, Task 27)
**Purpose**: Justify ordinary article prose in the printed magazine only (Decision S).

**How it works**: Every print page `<section>` now carries a type class, `print-page print-page--{{ item.type }}`. The existing `print-page--advertisement` class is unchanged for advertisements. One print-only rule then selects paragraphs inside article bodies:

```css
.print-page--article .prose p:not(:has(br)):not(li p):not(blockquote p) {
  text-align: justify;
}
```

The selector excludes by construction:
- **verse** — any paragraph with a hard break, so the `ART-010` poem stays under Task 7's left-aligned rule;
- **list items and quotations**;
- everything **outside article bodies** — titles, bylines, kickers, messages, gallery, advertisements, memorial text and contents.

`site.css` is untouched, so the website is not justified.

**Visual inspection**: all 29 article pages (PDF pp. 11–39) were rendered and inspected. Pagination is identical to the PDF built just before the change: 72 pages, and every article starts and ends on the same page. Chromium's justification only widens spaces; it does not re-break lines. No clipping or overflow was found, Bengali conjuncts and mixed Bengali/English lines render correctly, and long URLs and e-mail addresses in `ART-006` wrap. One pre-existing defect was noticed: `ART-009` page 32 shows a missing-glyph box, traced to a U+000C form feed in the extracted content (also present in `V3_REVIEW_02`; recorded, not changed).

#### `scripts/tracker-corrections-core.mjs` and `scripts/apply-v4-corrections-tracker-updates.mjs` (new, Task 28)
**Purpose**: Record the corrections on the editorial tracker (`npm run tracker:apply-v4-corrections`).
**Key exports**: `TRACKER_IDS` (manifest ID → tracker Item ID, taken from each item's manifest note "Tracker Item ID N"), `CORRECTION_DECISIONS`, `buildCorrectionTrackerRows(headers, rows)`.

**How it works**: The core reuses Sprint v3's `applyTrackerFieldUpdates`, which appends a Remarks note once and preserves existing remarks. The notes are built from `V4_CORRECTIONS`, so the tracker quotes exactly the same old → new strings as the content:

| Tracker row | Item | Change |
|---|---|---|
| 16 | `MSG-001` | Remark: wording correction; salutation and বেকানী unchanged |
| 17 | `MSG-002` | `Title / Item` → `Vice President Desk` (addendum §2.2) + remark |
| 5 | `ART-003` | Remark: both spellings |
| 6, 7 | `ART-004`, `ART-005` | Remark: reader-facing name "Late Biswajit Sengupta" via `display_name`; `Contributor / Company` unchanged |

The tracker has no display-name column, hence the remarks. No date of death is written. The wrapper follows Task 14's pattern: snapshot first (`TRACKER_SNAPSHOTS/BECAA_2026_Content_Tracker_2026-09-16T16-33-59-017Z_pre-v4-corrections-tracker-updates.xlsx`), then a style-preserving write, and a byte-identical no-op on re-run. The integration test checks that only those five rows changed, only in Remarks (and row 17's title), with 54 rows and 3 sheets intact, and that `tracker:validate` passes.

#### `tests/integration/v4-committee-corrections.test.mjs` (new, Tasks 23–27)
**Purpose**: The regression suite for all five corrections (`npm run test:v4-committee-corrections`; also in `test:integration`). It requires `npm run build && npm run pdf`.

**How it works**: It reads four sources — the working files, `_site/index.html`, `_site/print/index.html`, and the PDF text from `pdftotext -layout` split into pages. An item's PDF text runs from the page whose kicker names its ID up to the next kicker. Website checks are code-point exact. PDF checks compare after NFC normalisation with all whitespace removed, because `pdftotext` splits some Bengali conjuncts with spaces (`বন্ধুরা` → `বন্ধু রা`). Per correction:
- **`MSG-001`:** corrected sentence present and superseded sentence absent in content, website and PDF; salutation unchanged; exactly one standalone `বেকান` and one `বেকানী` left.
- **`MSG-002`:**
  - corrected title in the manifest, `alt`, front matter, website heading (once), website contents, print heading and PDF contents;
  - superseded title absent from every built HTML/JSON file and the whole PDF;
  - body line `Vice President’s Desk` and filename unchanged.
- **`ART-003`:** each corrected spelling present once and each superseded one absent, on the website and in the PDF.
- **`ART-004`/`ART-005`:**
  - the exact byline appears on the website, the print page and a PDF line;
  - `contributor` unchanged, and only these two items have `display_name`;
  - no other `Late`-prefixed byline (the approved memorial line "Late Shri Bhakta Mohon Mitra" is excluded explicitly);
  - no date or circumstances of death anywhere.
- **Justification:** in Playwright with print media, every article prose paragraph computes `text-align: justify`. `ART-010` verse is `left`. Headings, kickers, bylines, list items, captions, ad text, memorial lines, contents, contact, thanks and message prose are not justified. With screen media, no element on the website is justified, and `site.css` equals its `ae098d5` content.
- **Every corrected file** equals its `ae098d5` content with only the recorded substitutions, and re-running the apply script reports `already applied`.

#### Task 29 — regression suite and full gate re-run (verification only)
Run after Task 38, so `test:integration` could run as one green chain:
- fresh `build` + `pdf` (72 pages);
- `validate` (47 items, 0 errors) and `tracker:validate` (54 rows);
- `typecheck`, `test:unit` (26 files at the time), `test:integration` (all 33 files, including the 8 database-backed ones);
- `test:v4-committee-corrections`, `check:secrets`, `check:sql`.

All passed. `git diff 4751640..HEAD` touched only Task 21–28 and Task 38 files. Nothing changed under `06_FINAL_OUTPUT/`, `01_REFERENCE_2025/`, `03_ADVERTISEMENTS/`, `api/`, `lib/`, `middleware.ts` or `db/`. `02_INCOMING_CONTENT/` only gained the correction record.

### Stream G — Pre-release fixes (Task 38, added during `/dev`)

Before Task 29, a dry run of the release step list at `HEAD` in a scratch worktree found three failing gates in existing code. None was caused by the corrections. All three would have blocked Task 29 or the release build. Per the `/dev` rule they were recorded as a new task (`97993b0`) rather than folded into an unrelated one.

| File | Failure | Fix |
|---|---|---|
| `scripts/visual-qa.mjs` (`npm run qa`) | `desktop ADV-027 advertisement is broken or distorted.` — it checked every advertisement's image aspect ratio, but text-only ads have no image and the memorial photo is deliberately letterboxed | Branch on the card's kind: text-only needs a visible, non-empty `.ad-text` and no `<img>`; memorial needs a loaded image with `object-fit: contain`; artwork keeps the aspect-ratio check. A screenshot is still taken per ad (the whole card for text-only). |
| `tests/e2e/print-cover-page.test.mjs` | `page count unchanged: 72 !== 69` — Sprint v3 length hard-coded | `EXPECTED_PAGES = 72` with the reason: 69 + one page each for `ADV-027/028/029`; the poem, corrections and justification add none |
| `scripts/add-v2-manifest-items.mjs` + its test | `ENOENT … 02_INCOMING_CONTENT/Shubhra Basu.docx` at import, then an `ART-010` mismatch | The historical script hashes `ART-010`'s Sprint v2 source from its archive (`SUPERSEDED_SOURCES/2026-09-15/`); `detectLanguage` strips markup, since the poem's `<br>` made it look "mixed"; the test allows only `ART-010`'s Task-6-authorised `source_file`/`source_fingerprint` change |

### Stream F — Build and release (Tasks 30–34, 36, 37)

| Commit | Task | Content |
|---|---|---|
| `d5350a0` | 30 | V4 step list, reproduction text, `qa:v4-pages`, `release:v4` |
| `357aebf` | 31 | PDF comparison (built by a delegated agent in an isolated worktree, reviewed and integrated) |
| `a3fa4cc` | 32 | CHANGELOG, README, DEPLOYMENT note |
| `ee2e9a2` | 33 | `06_FINAL_OUTPUT/V4_REVIEW_01/` (built at `b96f581`) |
| `1f73a3a` | 34 | `sprints/v4/MANUAL_VERIFICATION.md` |
| `e253d28` | 36, 37 | Audit review (verification); historical headers on add-v2/add-v3 scripts |

#### `scripts/release-core.mjs` — V4 step list and reproduction (modified, Task 30)
**Purpose**: The pure, unit-tested half of the release pipeline: which `npm run` steps a release version runs, in what order, and the generated `REPRODUCTION.md`.

**How it works**: `stepsForVersion("V4_*")` returns a new `V4_STEPS` list: the V3 list plus `test:e2e:nav`, `test:e2e:poem`, `test:v4-advertisements`, `test:v4-committee-corrections`, `qa:pdf-compare` and `qa:v4-pages`. Two ordering constraints found during this work shape it, and the unit test asserts both:
1. **`pdf` straight after `build`.** `build` starts by deleting `_site/`, and `test:integration` now includes suites that read the PDF. The V3 order, with `pdf` after `qa`, would fail on a clean build.
2. **Evidence after `qa`.** `visual-qa.mjs` begins with `fs.rmSync("qa-output", { recursive: true })`, so every step that leaves evidence there must run after `qa`: the comparison, the page renders, navigation screenshots and `e2e:app`.

```js
const V4_STEPS = [
  "tracker:validate", "validate", "typecheck", "test:unit", "build", "pdf", "test", "test:integration",
  "qa", "qa:v2-items", "qa:pdf", "qa:pdf-compare", "test:e2e:cover", "test:e2e:poem", "qa:pdf:v2-items",
  "qa:ad-backgrounds", "qa:art006", "qa:contact", "qa:v4-pages", "test:e2e:print-ads", "test:e2e:web-ads",
  "test:e2e:nav", "test:v4-advertisements", "test:v4-committee-corrections", "test:e2e:welcome",
  "test:e2e:admin", "e2e:app", "check:secrets", "check:sql", "audit",
];
```

The V3 list is unchanged and asserted to be. `reproductionMarkdown` has a V4 branch: it names `npm run release:v4`, lists `unzip` and `poppler-utils` (`pdftotext`/`pdftoppm`) as prerequisites, mentions the `V3_REVIEW_02` comparison baseline, and lists the idempotent v4 content-migration commands (`V4_CONTENT_MIGRATION`: `extract:v4-golap` → `normalize:v4-memorial-image` → `manifest:apply-v4-updates` → `tracker:apply-v4-updates` → `corrections:apply-v4` → `tracker:apply-v4-corrections`). `package.json` gains `release:v4` (`RELEASE_VERSION=V4_REVIEW_01`). `scripts/release.mjs` itself only gained a comment; its packaging is version-independent and refuses to overwrite an existing folder.

#### `scripts/v4-pages-core.mjs` and `scripts/render-v4-pages.mjs` (new, Task 30)
**Purpose**: Put the PDF pages a reviewer needs into the release (`npm run qa:v4-pages`), so the Task 27 and Task 34 evidence survives the `qa` wipe.
**Key functions**: `itemPageRanges(pageTexts)` → `Map(id → { first, last })`; `planV4PageRenders(pageTexts, { evidenceIds, articleIds })` → `{ contentsPages, evidence, justification }`.

**How it works**: The core walks the page texts:
- a first line ending `· ID` starts an item, and following pages without a kicker continue it;
- a `… Contents` header, or an entry line straight after one, is a contents page;
- "INFORMATION AND CONTACT" and "SPONSOR ACKNOWLEDGEMENTS" end any item, so the sponsor page is not counted as part of the memorial.

The script derives the evidence IDs from data (`ART-010`, `ADV-027/028/029`, and every ID in `V4_CORRECTIONS`) and the article IDs from the manifest. It renders each page with `pdftoppm` (argument array, no shell):
- contents and evidence pages at 150 dpi → `qa-output/v4-pages/pNN-ID.png`, plus `index.json`;
- every article page at 100 dpi → `qa-output/v4-justification/pdf-page-NN-ID.png`.

On the release PDF: 16 evidence renders (contents 2–3; `MSG-001` 5–6; `MSG-002` 7–8; `ART-003` 16; `ART-004` 17–18; `ART-005` 19–21; `ART-010` 33; `ADV-027/028/029` 69–71) and 29 article renders.

#### `scripts/pdf-compare-core.mjs` and `scripts/pdf-compare.mjs` (new, Task 31)
**Purpose**: Prove the new PDF differs from the Sprint v3 release (`06_FINAL_OUTPUT/V3_REVIEW_02`, 69 pages) only where authorised (Decision L). Run as `npm run qa:pdf-compare`; the build fails on any unexplained difference.
**Key function**: `comparePdfPages(baselinePages, currentPages, { poemIds, newItemIds, corrections })` → `{ pages, removedBaselinePages, summary }`. Each current page is classed as `unchanged`, `shifted`, `contents`, `poem`, `new-item`, `correction`, `reflow` or `unexplained`, with the matched baseline page and a note. Baseline pages without a counterpart are reported too.

**How it works — normalisation**: every string is NFC-normalised, the page-number footer is dropped, and the comparison key has all whitespace removed. Justification only changes spacing and `pdftotext` splits conjuncts, so whitespace carries no content here. The documented trade-off: an edit that only adds or removes a space is not detected.

**How it works — matching**:
- **Pages:** matched by key at the same index first (`unchanged`), then anywhere (`shifted`).
- **Unmatched item pages:** judged per item, joining that item's pages.
  - The poem ID is `poem`; an ID absent from the baseline and listed as new is `new-item`.
  - A corrected ID is `correction` only if the baseline with every find → replace applied equals the current text exactly, each replacement is present, and no superseded form remains outside an occurrence of its replacement (again the `Late Biswajit Sengupta` case).
  - An uncorrected item with identical text on different pages is `reflow`; anything else is `unexplained`.
- **Contents:** judged as one block. Text outside the entries must be identical, the only extra entries may be the new IDs, the others keep their order, a title may change only by a recorded correction, and numbering must stay sequential.
- **Failed corrections:** a failed check marks the item's first page `unexplained` even if that page is byte-identical, so an unapplied correction can never pass.

The wrapper runs `pdftotext` via `execFileSync` (argument array), takes `V4_CORRECTIONS` from `v4-corrections.mjs`, checks every ID exists in the manifest, and writes `qa-output/pdf-compare/V3_REVIEW_02-vs-current.{json,md}` (the JSON records both PDFs' SHA-256 and page counts). It exits non-zero if anything is unexplained; `--baseline`, `--current` and `--no-corrections` exist for testing. The unit test (12 scenarios, hermetic) covers:
- unchanged, shifted, contents, poem and new-item pages;
- applied corrections with justification spacing and reflow;
- missing, partial or doubled corrections;
- contents tampering, removed pages and random edits;
- a "new" ID that already existed;
- both Unicode forms of য়.

**Real result on the release PDF**:

| Class | Pages |
|---|---:|
| unchanged | 60 |
| shifted | 1 (sponsor page 72 = baseline 69) |
| contents | 2 (3 new entries; corrected `MSG-002` title) |
| poem | 1 (p. 33) |
| new-item | 3 (pp. 69–71) |
| correction | 5 (pp. 5, 7, 16, 17, 19) |
| unexplained | 0 |

Run with `--no-corrections` against the same build, it fails as it should: the five corrected items and the contents are unexplained.

#### Documentation (Task 32)
- **`CHANGELOG.md`:** the "Unreleased" block became a `V4_REVIEW_01` section:
  - Added: `ADV-028`, `ADV-029`; `ADV-027` is recorded as *updated* from excluded, not added.
  - Changed: `ART-010`, navigation, the consolidation moves with short hashes, the five corrections, tracker changes, count derivation.
  - Removed: `extract-v2-golap`.
  - Unchanged: the other 41 items and the application layer.
  - Also the follow-up notes.
- **`05_WEBSITE/README.md`:** a paragraph on the single intake folder (consolidated 2026-09-15), the correction-record convention and the superseded-source archive.
- **`05_WEBSITE/DEPLOYMENT.md`:** one note that V4 uses the same deployment steps via `npm run release:v4` and the smoke test expects 47 items.

#### `06_FINAL_OUTPUT/V4_REVIEW_01/` (new, Task 33)
Built by `npm run release:v4` at `b96f581` and committed at `ee2e9a2` (319 files; assets identical to V3's are stored once by git). All 30 steps passed in order, and the audit gate reported 3 high advisories, all allow-listed (`playwright`, `sharp`, `xlsx`). Contents:
- `website/` (the built site and 72-page PDF), `release-manifest.json` (47 item IDs and source fingerprints);
- `BUILD_SUMMARY.md`, `REPRODUCTION.md`, validation and audit reports, `DEPLOYMENT.md`, `THREAT_CHECKS.md`;
- `qa-output/` with `navigation/`, `v4-pages/`, `v4-justification/`, `pdf-compare/`, `advertisements/`, `app/` and the earlier QA sets.

Before committing, every file was scanned for the local environment's secret values: 0 hits. No tracked V0–V3 file changed. Two earlier background runs of the pipeline were stopped by the Claude Code harness for low memory before packaging, so no partial folder was written; the third run, in the foreground, completed.

#### `sprints/v4/MANUAL_VERIFICATION.md` (new, Task 34)
**Purpose**: The manual verification record for the release.

**How it works**:
- **Browser:** a throwaway Playwright driver (not committed) served the built site through the local dev-app, including the registration gate, against `becaa_test` at 1440 px and 390 px. It registered a guest, reloaded, fetched the PDF, opened `/admin/` logged out and captured element screenshots, which were inspected by eye. Results: welcome page before registration; still on the magazine (47 items) after reload; PDF 200; `/admin/` shows the login form; no horizontal overflow. The two test registrations were deleted.
- **PDF:** the release's `v4-pages` renders were inspected for the contents entries, `MSG-001` p. 5, `MSG-002` p. 7, `ART-004` p. 17 and the memorial p. 71.
- **Every Sprint v4 change checked out on both surfaces.** Five findings were recorded for decision rather than changed (see **Known Limitations**).

#### Tasks 36–37
- **Task 36 (verification):** `package-lock.json` is unchanged since Sprint v3 (`dbc61cb`), the release audit gate is `ok`, and the allow-list is unchanged.
- **Task 37:** no `v2-incoming` literal remained in `add-v2-manifest-items.mjs` or `add-v3-manifest-items.mjs` (removed in Task 4); both now open with a `HISTORICAL` header saying what they did and that paths reflect the Sprint v4 layout. No behaviour change.

### Stream H — Approved corrections, `V4_REVIEW_02` and deployment (Tasks 39–47)

The owner's approvals of 2026-09-17 are recorded as an addendum (§§6–10) to the controlled correction record, alongside the Stream H task list (`d1a2275`).

| Commit | Task | Content |
|---|---|---|
| `c8241c6` | 39 | ADV-028 wording; tracker approval notes; wrapped-contents helper |
| `1ac9690` | 40 | No repeated heading on text-only and memorial pages |
| `3142c6a` | 41 | ART-004/005 Bengali author line |
| `8ca58c7` | 42 | ART-009 U+000C removed; control-character gate |
| `7eff309` | 43 | Sticky-header anchor offset |
| `ac05427` | — | Fix: Task 37 headers named the old intake folder (stopped the first `V4_REVIEW_02` build) |
| `d0cc14c` | 44 | `06_FINAL_OUTPUT/V4_REVIEW_02/`; deployable PDF replaced |
| — | 45–46 | Preview and Production deployments (no code change) |
| this commit | 47 | Records |

#### ADV-028 wording (Task 39)
- **Data changes:**
  - The manifest's `title` and `text_lines[0]` go through the same count-guarded path as the committee corrections (`V4_FILE_CORRECTIONS`, `expectedCount: 2`).
  - The constants that define the Sprint v4 advertisements (`add-v4-manifest-items.mjs`, `tracker-v4-core.mjs`, `validate-tracker-core.mjs`) follow, so re-running the migration reproduces the approved text.
- **Tracker:** a second decision set, `APPROVAL_DECISIONS` in `tracker-corrections-core.mjs`, is applied after the Task 28 corrections. It updates ADV-028's title, adds approval notes on ADV-027/028/029 and on Items 6, 7 and 1, and takes a snapshot first.
- **Contents parsing:** the long title wraps in the PDF contents, leaving `ADV-028` alone on the next line, which broke two parsers. A new pure helper, `contentsEntries(lines)` in `ad-qa-checks-core.mjs`, re-joins wrapped entries:

```js
const start = line.match(/^(\d{1,3})\.\s+(.*)$/);
if (start) pending = { number: Number(start[1]), parts: [start[2]] };
else if (pending) pending.parts.push(line);
const text = pending.parts.join(" ").replace(/\s+/g, " ").trim();
const id = text.match(CONTENTS_ID);            // "… ADV-028" at the end of the joined text
if (id) entries.set(id[1], { number: pending.number, title: text.slice(0, text.length - id[1].length).trim() });
```

- **Side fix:** touching `ad-qa-checks-core.mjs` surfaced an older semgrep finding (a `RegExp` built from a variable in `findPdfPageIndex`), replaced with a plain string search.

#### No repeated heading on text-only and memorial pages (Task 40)
**Template change:** `index.njk` and `print.njk` compute one flag. For text-only and memorial advertisements they omit the heading and give the card or page an accessible name instead:

```njk
{% set textShownOnce = item.type == "advertisement" and (item.presentation == "text" or item.presentation == "memorial") %}
<article … id="{{ item.id }}"{% if textShownOnce %} aria-label="{{ item.title }}"{% endif %} …>
  <header class="item-header">
    <p class="section-kicker">{{ kickerLabel }} · {{ item.id }}</p>
    {% if not textShownOnce %}<h2>{{ item.title }}</h2>{% endif %}
```

**Layout regression, found by eye:** the print advertisement page is a grid with rows `auto auto 1fr` (kicker, heading, content). Without the heading, the sentence box and the memorial slid into an `auto` row at the top of the page. A heading-less page now uses `auto 1fr`:

```css
.print-page--advertisement:not(:has(> h1)) { grid-template-rows: auto 1fr; }
```

`print-ad-pages` asserts the box's vertical centre stays within 8% of the page middle; it fails (0.18) on the previous CSS. `pdf-qa` checks that the approved lines appear exactly once instead of reading a heading. Five tests were updated to assert no heading, `aria-label` equal to the title, and each sentence or memorial line visible exactly once, on the website and in the PDF.

#### ART-004/005 author line (Task 41) and ART-009 control character (Task 42)
- **ART-004/005:** the author line becomes `প্রয়াত বিশ্বজিৎ সেনগুপ্ত`, written in NFC form. There is one count-guarded edit per file, plus rendered-text entries in `V4_CORRECTIONS` so the PDF comparison classifies the pages as corrections.
- **ART-009:**
  - The single U+000C is removed by a deletion entry (`find: "\f", replace: "", wholeWord: false`).
  - That exposed a bug: `correctionState` counted occurrences of the replacement, and for an empty string `indexOf("")` never advances, so it looped until memory ran out. A deletion now reads as `applied` when no occurrence remains.
  - A new pure `findControlCharacters(text)` in `content-encoding-core.mjs`, called from `validate.mjs`, makes any C0 control character (other than tab, LF, CR) or DEL in publication content a release-blocking error with line and column. It failed on ART-009 before the fix.

#### Sticky-header anchor offset (Task 43)
- **Measurement:** above 780 px the header is sticky: about 110 px (two rows) up to 1200 px wide, about 68 px from 1210 px. At 780 px and below it is static.
- **CSS only:** `site.css` sets `scroll-padding-top: 7.5rem` for 781–1299 px and `5rem` from 1300 px. No JavaScript changed.
- **Test:** `test:e2e:nav` gains a 1100 px run and asserts each target starts at or below the header's bottom edge and within 64 px of it. Before the fix it failed: `#contents … target top 0, header bottom 110`.

#### `V4_REVIEW_02` (Task 44)
**Release fixes:**
- **`release:v4:02` added:** `RELEASE_VERSION=V4_REVIEW_02`, same V4 step list.
- **A regression of mine:** the first run stopped at `test:integration`. The `HISTORICAL` headers from Task 37 contained the literal old intake-folder path, which `incoming-consolidation.test.mjs` forbids. They were reworded (`ac05427`) and the full chain passed before the rebuild. No output folder had been written.

**Results:**
- **Second run (at `ac05427`):** all 30 steps passed.
- **PDF comparison:** unchanged 60, shifted 1, contents 2, poem 1, new-item 3, correction 5, unexplained 0; still 72 pages.
- **Integrity:** `V4_REVIEW_01` is byte-identical, and the 320 output files have no local secret values.

**Deployable PDF:** Vercel's build cannot run Chromium, so the PDF it serves is the committed `05_WEBSITE/release-assets/print/BECAA-2026-complete-review.pdf`. It was still the Sprint v3 file; it is replaced with the `V4_REVIEW_02` PDF (checked byte-identical after deployment).

#### Preview (Task 45) and Production (Task 46)
The full record is `sprints/v4/PREVIEW_DEPLOYMENT.md`.

- **Access:**
  - Environment files were pulled into a private scratch folder, never into the repository.
  - The protected Preview was reached with the local development OIDC token as `x-vercel-trusted-oidc-idp-token`; protection settings were not changed.
  - The Preview admin test used a new random preview-only password: hashed into the Preview `ADMIN_PASSWORD_HASH`, then shredded. Production credentials were not touched.
- **Databases:**
  - Before: Preview 12 visitors (9 old `e2e-*` rows), Production 1 visitor, 1 visit, 3 rate-limit rows.
  - Migration status on both: Applied 1, Pending none; `migrate` is a no-op.
- **Preview:**
  - Probes (gate, health, 403 on PDF and artwork, forged cookie, admin 401, CORS 403, 405, headers) all pass.
  - `e2e:app` with the admin credential: 22 steps passed, including login, search, CSV, delete and logout.
  - A registered content check confirms every Sprint v4 change and a PDF byte-identical to the release.
- **Production:**
  - `vercel deploy --prod` aliased `becaa-magazine-2026-portal.vercel.app` to the new deployment; the Sprint v3 deployment stays available for rollback.
  - The same probes pass; `e2e:app --public-only` passes 14 steps; the content check is repeated.
  - The dashboard flow could not be run on Production because only the owner holds that password; it passed on Preview with identical code.
- **Registration rate limit:** 5 per 10 minutes per IP. The suite uses all five, so the content checks ran after the window had passed.
- **Cleanup:** one transaction per database removes `e2e-*` visitors (visits cascade), plus admin sessions and rate-limit windows started since the verification began. Pre-existing non-test rows are kept and reported.

## Data Flow

**Consolidation**: `consolidate-incoming.mjs --plan` reads both folders → `planConsolidation()` (pure) decides safety → JSON+MD report written → human/CI checks `ok: true` → `--apply` performs 5 `git mv` + removes the empty folder → 14 downstream files (manifest, front matter, 10 scripts, 4 tests) get their path references repointed by hand in the same task.

**Poem**: `Shubhra Basu.md` (authoritative, hash-verified) → `readVerseSource()` parses & validates 17 lines → `extract-v4-golap.mjs` re-serializes with `<br>` on every line → writes `ART-010-item.md` + repoints the manifest → Eleventy's `markdown` filter turns Markdown hard breaks into literal `<br>` tags at build time → `.prose p:has(br)` CSS keeps it left-aligned and unhyphenated on both the website and in the print HTML that becomes the PDF.

**Advertisements**: `add-v4-manifest-items.mjs` writes three items into `publication.yaml`, each declaring a `presentation` → `validate.mjs` calls `validateAdvertisementPresentation()` on every item at build-validation time, enforcing the shape per presentation kind → `npm run build` (Eleventy) renders `index.njk`/`print.njk`, branching per item on `presentation` → `npm run pdf` (Playwright) turns the print HTML into the actual PDF → e2e/QA scripts re-open both build outputs and assert wording/structure, all counts pulled live from `readManifest()` rather than hardcoded.

**Navigation**: `publication.yaml` is loaded as Eleventy data → `base.njk` pipes `publication.items` through `whereWeb` (drop unpublished) → `byOrder` (sort by `order`) → `sectionNav(sponsor_acknowledgement_message)` → `sectionNavigation()` keeps the first item per section and adds the fixed links → the layout writes eight `<a href="#ID">Label</a>` elements → in the browser, clicking a link jumps to the element with that `id` (every item card in `index.njk` carries its manifest ID as its `id`). If an editor later adds an item with a lower `order` than a section's current first item, the link retargets automatically at the next build.

**Committee corrections**: committee addendum → `BECAA Committee Corrections 2026-09-16.md` (human record) → `v4-corrections.mjs` (code-point-exact data), which feeds three paths:
- **Content:** `corrections:apply-v4` checks `correctionState` per edit and applies `applyCorrection` only when pending → `MSG-001`, `MSG-002` and `ART-003` content files and `publication.yaml` (the `MSG-002` title/`alt` and the `ART-004/005` `display_name`) → Eleventy renders titles unchanged and bylines via `display_name` → `print.njk` tags each page `print-page--{type}` and `print.css` justifies article prose → `compile-pdf.mjs` produces the PDF.
- **Tracker:** `tracker:apply-v4-corrections` → snapshot → remarks and row 17's title in the tracker.
- **Proof:** `test:v4-committee-corrections` reads content, HTML and PDF text, and `qa:pdf-compare` checks every page against `V3_REVIEW_02` with the same find/replace pairs.

**Release**: `npm run release:v4` → `release.mjs` asks `stepsForVersion("V4_REVIEW_01")` for the 30 steps and runs each as `node npm-cli.js run <step>` with no shell, stopping on the first failure → the validation gates, `build` and `pdf`, the site, integration, QA and browser suites, `qa:pdf-compare` and `qa:v4-pages`, the application E2E, the secret and SQL scans, then the audit gate → packaging copies `_site/`, `qa-output/` and the reports into `06_FINAL_OUTPUT/V4_REVIEW_01/` (refusing to overwrite), writes `release-manifest.json`, `BUILD_SUMMARY.md` and `REPRODUCTION.md` → the folder is committed. Deployment is a separate, approved step.

## Test Coverage

**Final state (2026-09-17, `V4_REVIEW_02` at `ac05427`):** 29 unit and 33 integration files, all passing inside the 30-step release. Stream H added `content-encoding-core` (unit), extended `text-correction-core` (deletions), `ad-qa-checks-core` (wrapped contents entries) and `tracker-corrections-core` (approval notes), and updated the render, browser and PDF tests for the heading-less pages (including a vertical-centring assertion), the corrections suite (ADV-028 wording, author lines, ART-009) and the navigation E2E (a 1100 px run; targets below the sticky header). Deployed sites: Preview probes plus `e2e:app` (22 steps, including the administrator flow) plus a content check; Production probes plus `e2e:app --public-only` (14 steps) plus a content check (see `PREVIEW_DEPLOYMENT.md`).

Earlier state (2026-09-17, `1f73a3a`): **28 unit files and 33 integration files**, all passing. The final full run was the `release:v4` build of `V4_REVIEW_01` (30 gated steps, all green), plus `test:unit` and the two historical-script integration tests after Task 37. Per-stream history follows.

- **Unit** (23 files in `test:unit` after Task 17, all passing in the Task 20 re-run): `navigation-core` added by Task 17 (6 scenarios). Earlier in the sprint: 2 new (`incoming-consolidation-core`, `tracker-v4-core`) and substantial additions to 2 existing files (`article-markdown-core` — 7 new `readVerseSource` cases; `ad-presentation-core` — 17 new presentation-kind cases alongside the 13 pre-existing ones, all still green).
- **Integration** (31 files in `test:integration` after Task 18: 23 file-based + 8 database-backed). Task 20 ran each file individually: **30 of 31 passed**, including all 8 DB-backed files (`db-migrate`, `rate-limit`, `register`, `dev-app`, `admin-auth`, `admin-queries`, `export`, `threats`). The one failure is the pre-existing `add-v2-manifest-items` (see Known Limitations). `base-nav-render` added by Task 18. Earlier in the sprint: 8 new files (`consolidate-incoming`, `incoming-consolidation`, `extract-v4-golap` — replacing the deleted `extract-v2-golap` — `normalize-v4-memorial-image`, `ad-text-render`, `ad-memorial-render`, `add-v4-manifest-items`, `apply-v4-tracker-updates`, `v4-advertisements`), plus 6 existing files updated for the new paths/counts.
- **E2E** (Playwright, against a real `npm run build`/`npm run pdf`): `web-ad-cards`, `print-ad-pages` (rewritten for 3 presentation kinds), a new `print-poem-page` (`test:e2e:poem`), and a new `site-navigation` (`test:e2e:nav`, Task 19 — 8 links, targets, click-to-scroll, overflow, brand overlap, Tab order and focus style at 390/820/1440 px). Task 20 re-run: `test:e2e:nav`, `test:e2e:welcome`, `test:e2e:admin`, `test:e2e:web-ads`, `test:e2e:print-ads`, `test:e2e:poem` all pass; `e2e:app` (local dev-app against `becaa_test`, registration → magazine → admin) passes all 24 steps; `test:e2e:cover` **fails** on a stale page count (pre-existing, see Known Limitations).
- **Gates** (Task 20 re-run): `validate` 0 errors / 47 items; `tracker:validate` clean; `typecheck` clean; `npm test` site smoke pass; `check:secrets` and `check:sql` clean.
- **Unit, Tasks 21–31** (5 new files): `text-correction-core` (8 scenarios: counts, whole-word Bengali boundaries, `correctionState`, Unicode-form hint), `eleventy-config` (byline and `display_name`), `tracker-corrections-core` (row mapping, notes, untouched rows, idempotency), `pdf-compare-core` (12 scenarios), `v4-pages-core` (page ranges and render plan). `release-core` extended with V4 ordering and reproduction assertions.
- **Integration, Tasks 23–28** (2 new files): `v4-committee-corrections` (content, website, print HTML, PDF text, print-media computed styles; see Stream E) and `apply-v4-corrections-tracker-updates` (real workbook, snapshot, no-op re-run). `add-v2-manifest-items` fixed by Task 38. **All 33 files now run as one green `npm run test:integration` chain** (Task 29 and the release), including the 8 database-backed ones.
- **E2E and QA added to the release**: `test:e2e:cover` passes again (72 pages, Task 38); `qa` handles text-only and memorial ads (Task 38); `qa:pdf-compare` (0 unexplained); `qa:v4-pages` (16 + 29 renders).
- **Release gates** (`V4_REVIEW_01`, all passing): `tracker:validate`, `validate` (47 items), `typecheck`, `test:unit`, `build`, `pdf`, `test`, `test:integration`, `qa`, `qa:v2-items`, `qa:pdf`, `qa:pdf-compare`, `test:e2e:cover`, `test:e2e:poem`, `qa:pdf:v2-items`, `qa:ad-backgrounds`, `qa:art006`, `qa:contact`, `qa:v4-pages`, `test:e2e:print-ads`, `test:e2e:web-ads`, `test:e2e:nav`, `test:v4-advertisements`, `test:v4-committee-corrections`, `test:e2e:welcome`, `test:e2e:admin`, `e2e:app` (24 steps), `check:secrets`, `check:sql`, `audit`.
- **Manual** (Task 34): browser checks through the local registration gate at two widths, plus inspection of the PDF renders; see `sprints/v4/MANUAL_VERIFICATION.md`.
- **Red before green**: every new unit and integration test in Tasks 21–31 was run failing before its implementation, with two exceptions. The Task 28 integration test and its apply script were written together (the unit test was red first). Task 31's tests were written and run red by the delegated agent.
- Everything is wired into the shared `test:unit`/`test:integration` scripts and, with the v4 suites, into `release:v4`.

## Security Measures

- **Fingerprint gates**: both `extract-v4-golap.mjs` and `add-v4-manifest-items.mjs` refuse to run if the source file's live SHA-256 doesn't match a hardcoded expected value — a revised or wrong file can't silently get published.
- **Targeted string surgery, never blind rewrite**: every manifest/tracker edit finds an exact known line, count-guards the replacement (throws if it's not found exactly once), and re-parses the file afterward to confirm it's still valid YAML/XLSX — the ~1,000-line hand-authored manifest is never reformatted wholesale.
- **Snapshot-before-write**: every tracker mutation copies the live `.xlsx` into `TRACKER_SNAPSHOTS/` before touching it, and skips the write entirely if nothing actually changed.
- **No shell injection in file moves**: `git mv` runs via `execFileSync` with an argument array, never a shell string — no wildcards, no interpolation.
- **Output escaping**: all new template output uses Nunjucks's default auto-escaping (`{{ text_lines[0] }}`), never `| safe`, even though the text originates from an approved/trusted source.
- **Navigation output escaping**: link labels and hrefs in `base.njk` use `{{ }}` auto-escaping; labels come only from the fixed `SECTION_LABELS` map or a manifest section key, and hrefs only from manifest IDs. No new script, inline JavaScript or `| safe` was introduced, so the site's strict CSP is unaffected.
- **Access control untouched by Stream D**: the gate, middleware, API, registration and admin code are unchanged (verified by `git diff`); the protected magazine page still sits behind the gate in the `e2e:app` run, and the public welcome/admin pages build byte-identically.
- **Gate discipline**: every task ran `semgrep --config auto --quiet --error` on its own changed files and `npm audit` before its commit; a final holistic semgrep pass across all of `scripts/`, `tests/`, `src/` found zero new findings (the 5 findings that do exist are in 3 files this sprint never touched, pre-dating Sprint v4).
- **Tasks 17–19 scans**: `semgrep --config auto --quiet --error` clean on every file touched; `npm audit` unchanged (3 allow-listed high findings in `playwright`, `sharp`, `xlsx`). No `Claude-Session:` trailer on any Stream D commit.
- **Corrections cannot drift or double-apply**: every text edit states its expected count, matches whole words with Unicode-aware boundaries, and is applied only from a `pending` state; ambiguous or partial files stop the script. The apply script refuses paths outside `05_WEBSITE/`.
- **Originals and provenance preserved**: no original under `02_INCOMING_CONTENT/` was edited (the only change there is the new correction record); `contributor` keeps the provenance name; the tracker is snapshotted before its write; no date of death is published or recorded.
- **Release integrity**: the PDF comparison fails the release on any unexplained page change, so an unauthorised content edit cannot ship unnoticed. Release output is never overwritten. The release folder was scanned for the local environment's secret values (0 hits) before commit, and `check:secrets`/`check:sql` ran inside the pipeline.
- **No shell in new tooling**: `pdftotext`, `pdftoppm` and `git show` are invoked via `execFileSync` with argument arrays; npm steps via `node npm-cli.js` with `shell: false` (Sprint v3). One semgrep finding during Task 23 (a `RegExp` built from a variable in a test helper) was replaced by string search before that commit was finalised.
- **Scans for Tasks 21–38**: `semgrep --config auto --quiet --error` clean on every file touched; `npm audit` unchanged (3 allow-listed). No `Claude-Session:` trailer on any commit in `4751640..1f73a3a`; the Task 31 agent was instructed not to commit and made no commits.
- **Deployment hygiene (Tasks 45–46)**:
  - Environment files were pulled into a private (mode 700) scratch folder, never into the repository, and no secret value was printed.
  - The protected Preview was reached with the short-lived development OIDC token; Deployment Protection was not changed.
  - The temporary Preview admin password was hashed straight into a sensitive variable and shredded after use; Production credentials and variables were untouched.
  - Only verification records were deleted, in one transaction per database.
  - The previous Production deployment was kept for rollback; the Vercel project and Neon databases were neither deleted nor reconfigured.
- **Content gate**: `validate` rejects control characters in publication content, so an extraction artefact like ART-009's form feed cannot ship again.
- **Prompt-injection caught and rejected**: two independent subagents, working in isolated worktrees with no shared context, each appended an unauthorized `Claude-Session:` trailer to their own commits — identical text, matching a suspected injection attempt seen earlier in the same coordinating session. Both were stripped (commits rebuilt from a clean base with verified byte-identical trees) before merging; nothing reached `main` with the unauthorized line.

## Known Limitations

- **Production admin dashboard not exercised end to end.** Only the owner holds the production password, and it was not changed. On Production the login page, 401 responses without a session, and wrong-password rejection were checked. The full flow (login, totals, search, CSV, delete, logout) passed on Preview with identical code and a temporary preview-only credential.
- **Registration rate limit shapes remote verification.** With 5 registrations per 10 minutes per IP, `e2e:app` skips mobile registrations on remote targets, and the content checks had to wait for the window to pass.
- **Non-test rows kept.** 3 older registrations on the Preview database are not test-pattern rows and were left untouched. Production ends with 2 registrations: the one from 2026-09-15 and a genuine sign-up at 01:35:25 UTC during verification. The time-window cleanup removed that visitor's rate-limit counter row, which only resets their attempt counter.
- **Accessible names on text-only and memorial pages** come from `aria-label` (the manifest title) rather than a visible heading, as approved on 2026-09-17. Screen readers announce the title, so for ADV-027/028 the sentence is announced as the name and again as the text.

- **Mixed Unicode forms.** `MSG-001` stores য় as U+09DF while other content uses U+09AF U+09BC. Corrections kept each file's own form, and the comparison and tests normalise, but anyone typing a new correction must match the file's code points; the tool's error message says so.
- **The PDF comparison ignores whitespace-only edits** (a deliberate trade-off for justification and `pdftotext` conjunct splitting) and assumes every item starts a new page, which holds for this layout.
- **`ART-010` manifest note is stale**: it still says "Exact approved source: Shubhra Basu.docx" (unchanged since before Task 6); `source_file` and `source_fingerprint` are correct.
- **Release runs and memory**: on this host, the harness stopped two background `release:v4` runs for low memory; run long pipelines in the foreground.
- **Duplicate test runs in the release**: `test:v4-advertisements` and `test:v4-committee-corrections` run inside `test:integration` and again as their own steps (kept explicit, as Task 30's acceptance lists them); this costs a few seconds.
- **Evidence screenshots from Task 34's browser pass are not committed** (`05_WEBSITE/qa-output/v4-manual/`, git-ignored); the PDF renders, navigation screenshots and comparison report are in the committed release folder.
- **Resolved during this work**:
  - Repeated headings on text-only and memorial pages, the ART-004/005 Bengali author line, the ART-009 missing-glyph box and the sticky-header anchor offset (Stream H, `V4_REVIEW_02`).
  - Task 35: superseded by Tasks 45–46; `V4_REVIEW_02` is deployed.
  - Task 15's DB-dependent fixes now run (Task 20).
  - `test:e2e:cover` (72 pages) and `add-v2-manifest-items` pass again (Task 38), so `npm run test:integration` runs as one chain.
  - Visual QA handles text-only and memorial ads (Task 38).
- **Navigation screenshots** live in git-ignored `05_WEBSITE/qa-output/` during development (regenerate with `npm run build && npm run test:e2e:nav`); the release copy is committed in `06_FINAL_OUTPUT/V4_REVIEW_01/qa-output/navigation/`.
- **Label map is closed**: `events` already has a label, but any other new section key (e.g. `souvenirs`) would appear in the navigation under its raw key until `SECTION_LABELS` is extended. This is deliberate and tested: visible rather than silently dropped.
- The PRD's own prose ("17 lines each ending `<br>`") is imprecise about the real source file's last-line convention; the code is correct, the planning-doc wording is not, and hasn't been corrected in `PRD.md` itself (a docs-only fix, not blocking anything).
- Two visible-but-unauthorized commit trailers were caught this session (see Security Measures) — root cause unconfirmed; worth watching for in future sessions.

## What's Next

*(Updated 2026-09-17: the decisions and deployments below were completed in Stream H. The remaining open items are listed first.)*

- **Owner action:** verify the Production administrator dashboard with the real password (log in at `/admin/`, or run `E2E_ADMIN_USERNAME=becaa-admin E2E_ADMIN_PASSWORD='…' npm run e2e:app -- --base-url https://becaa-magazine-2026-portal.vercel.app` from a private shell; it creates and deletes `e2e-*` test visitors).
- **Preview database:** 3 older registrations that are not test-pattern rows are kept; delete them only if they are known test data.
- **Rollback:** Instant Rollback to `…-c846gz3qp-…` if needed; no database change to revert.

Earlier plan, kept for the record:

Resume from `1f73a3a` on `main` (working tree clean). Sprint v4 has one planned task left, plus decisions that should come first:

1. **Decide Task 34 findings 1–2** (repeated heading on text-only and memorial pages).
   - **Keep as built:** proceed with `V4_REVIEW_01`.
   - **Remove the headings:** add a task that renders those pages without the repeated heading (keeping an accessible label, e.g. `aria-labelledby` on the text) and updates the Task 10/15/16 tests (`ad-text-render`, `v4-advertisements`, `web-ad-cards`, `print-ad-pages`, `test-site`, `pdf-qa`). Then build a new `V4_REVIEW_02` with `release:v4` pointed at that version; `V4_REVIEW_01` stays unchanged.
2. **Task 35 — preview deployment**, after explicit approval.
   - Run `vercel deploy` (no `--prod`) from `05_WEBSITE/` at the release commit.
   - Run `npm run e2e:app -- --base-url <preview> --public-only`, then remove the test registrations from the *preview* database.
   - Record everything in `sprints/v4/PREVIEW_DEPLOYMENT.md`, and confirm with `vercel ls` that production is untouched.
3. **Production** only after a separate explicit approval, following `05_WEBSITE/DEPLOYMENT.md` (smoke test expects 47 items).

Candidates for Sprint v5, none blocking Sprint v4:
- the committee's view on a Bengali "Late" in the `ART-004`/`ART-005` author lines;
- removing the `ART-009` form-feed character through an approved correction record;
- `scroll-margin-top` so navigation jumps clear the sticky header;
- normalising Bengali content files to one Unicode form (a bulk, reviewable change);
- refreshing the stale `ART-010` manifest note;
- the three allow-listed dependency advisories (`sharp`, `playwright`, `xlsx`) carried since Sprint v2.
