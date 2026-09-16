# Sprint v4 — Walkthrough (Tasks 1–20)

Scope note: Sprint v4 has 37 planned tasks across six streams (A–F). This walkthrough covers **Tasks 1–20**: Stream A (intake/consolidation), Stream B (the poem), Stream C (the three new advertisements), and Stream D (navigation, Tasks 17–20, added 2026-09-16 at commit `6c1751a`). All are complete, on `main`, and verified. Streams E (committee corrections, Tasks 21–29) and F (build/release, Tasks 30–37) have not started; see **What's Next**.

## Summary

This slice of Sprint v4 does three things to the BECAA Maharashtra Magazine 2026 site (an Eleventy static build that produces both a website and a print PDF from one hand-authored manifest): it merges a stray `v2-incoming/` subfolder back into the single `02_INCOMING_CONTENT/` intake location with full provenance; it re-extracts the poem "গোলাপ" (ART-010) from a corrected Markdown source so every line renders as its own line, on web and in print; and it adds three new advertisement pages — two text-only compliments ads and one memorial — by extending the advertisement system with a `presentation` concept (`artwork` | `text` | `memorial`) instead of assuming every advertisement is a piece of artwork. Finally, it fixes the website's top navigation, which printed one section label per *item* (51 links with the current manifest: "Articles" ×12, "Advertisements" ×25…; PRD §1.1 counted 48 before Stream C's three advertisements), so that it shows one link per *section* (8 links), each pointing to that section's first published item and derived from the manifest at build time. Nothing in the application layer (registration, authentication, admin, database) was touched, and the print/PDF, welcome and admin pages build byte-identically before and after the navigation change.

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

## Files Created/Modified

Tasks 1–16: 77 files changed (+4,151 / −206 lines) across 15 commits plus 2 merge-conflict/doc-only commits. Tasks 17–20: 8 files changed (+350 / −18 lines) across 3 task commits and 1 documentation commit (`git diff 445a8ac..6c1751a`). Grouped by stream below; every new module gets its own subsection, mechanical/count-only edits to existing files are grouped into tables.

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
Added to both `site.css` (previously had `.prose` rules) and `print.css` (previously had *no* `.prose` block at all — one was created). The `:has()` selector targets any paragraph containing a hard break — i.e., verse — and forces `text-align: left; hyphens: none;` with a relaxed line-height, so it can never be justified or word-broken even by a future prose-justification rule elsewhere in the stylesheet (this matters directly for the not-yet-started Task 27).

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

## Data Flow

**Consolidation**: `consolidate-incoming.mjs --plan` reads both folders → `planConsolidation()` (pure) decides safety → JSON+MD report written → human/CI checks `ok: true` → `--apply` performs 5 `git mv` + removes the empty folder → 14 downstream files (manifest, front matter, 10 scripts, 4 tests) get their path references repointed by hand in the same task.

**Poem**: `Shubhra Basu.md` (authoritative, hash-verified) → `readVerseSource()` parses & validates 17 lines → `extract-v4-golap.mjs` re-serializes with `<br>` on every line → writes `ART-010-item.md` + repoints the manifest → Eleventy's `markdown` filter turns Markdown hard breaks into literal `<br>` tags at build time → `.prose p:has(br)` CSS keeps it left-aligned and unhyphenated on both the website and in the print HTML that becomes the PDF.

**Advertisements**: `add-v4-manifest-items.mjs` writes three items into `publication.yaml`, each declaring a `presentation` → `validate.mjs` calls `validateAdvertisementPresentation()` on every item at build-validation time, enforcing the shape per presentation kind → `npm run build` (Eleventy) renders `index.njk`/`print.njk`, branching per item on `presentation` → `npm run pdf` (Playwright) turns the print HTML into the actual PDF → e2e/QA scripts re-open both build outputs and assert wording/structure, all counts pulled live from `readManifest()` rather than hardcoded.

**Navigation**: `publication.yaml` is loaded as Eleventy data → `base.njk` pipes `publication.items` through `whereWeb` (drop unpublished) → `byOrder` (sort by `order`) → `sectionNav(sponsor_acknowledgement_message)` → `sectionNavigation()` keeps the first item per section and adds the fixed links → the layout writes eight `<a href="#ID">Label</a>` elements → in the browser, clicking a link jumps to the element with that `id` (every item card in `index.njk` carries its manifest ID as its `id`). If an editor later adds an item with a lower `order` than a section's current first item, the link retargets automatically at the next build.

## Test Coverage

Results below for Tasks 1–16 are as recorded at the time; the Tasks 17–20 results come from the Task 20 full re-run on 2026-09-16.

- **Unit** (23 files in `test:unit` after Task 17, all passing in the Task 20 re-run): `navigation-core` added by Task 17 (6 scenarios). Earlier in the sprint: 2 new (`incoming-consolidation-core`, `tracker-v4-core`) and substantial additions to 2 existing files (`article-markdown-core` — 7 new `readVerseSource` cases; `ad-presentation-core` — 17 new presentation-kind cases alongside the 13 pre-existing ones, all still green).
- **Integration** (31 files in `test:integration` after Task 18: 23 file-based + 8 database-backed). Task 20 ran each file individually: **30 of 31 passed**, including all 8 DB-backed files (`db-migrate`, `rate-limit`, `register`, `dev-app`, `admin-auth`, `admin-queries`, `export`, `threats`). The one failure is the pre-existing `add-v2-manifest-items` (see Known Limitations). `base-nav-render` added by Task 18. Earlier in the sprint: 8 new files (`consolidate-incoming`, `incoming-consolidation`, `extract-v4-golap` — replacing the deleted `extract-v2-golap` — `normalize-v4-memorial-image`, `ad-text-render`, `ad-memorial-render`, `add-v4-manifest-items`, `apply-v4-tracker-updates`, `v4-advertisements`), plus 6 existing files updated for the new paths/counts.
- **E2E** (Playwright, against a real `npm run build`/`npm run pdf`): `web-ad-cards`, `print-ad-pages` (rewritten for 3 presentation kinds), a new `print-poem-page` (`test:e2e:poem`), and a new `site-navigation` (`test:e2e:nav`, Task 19 — 8 links, targets, click-to-scroll, overflow, brand overlap, Tab order and focus style at 390/820/1440 px). Task 20 re-run: `test:e2e:nav`, `test:e2e:welcome`, `test:e2e:admin`, `test:e2e:web-ads`, `test:e2e:print-ads`, `test:e2e:poem` all pass; `e2e:app` (local dev-app against `becaa_test`, registration → magazine → admin) passes all 24 steps; `test:e2e:cover` **fails** on a stale page count (pre-existing, see Known Limitations).
- **Gates** (Task 20 re-run): `validate` 0 errors / 47 items; `tracker:validate` clean; `typecheck` clean; `npm test` site smoke pass; `check:secrets` and `check:sql` clean.
- Everything above is wired into the shared `test:unit`/`test:integration` npm scripts. Note that `test:integration` is an `&&` chain, so while `add-v2-manifest-items` still fails, a plain `npm run test:integration` stops at that file (7th of 31) and the rest must be run individually.

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
- **Prompt-injection caught and rejected**: two independent subagents, working in isolated worktrees with no shared context, each appended an unauthorized `Claude-Session:` trailer to their own commits — identical text, matching a suspected injection attempt seen earlier in the same coordinating session. Both were stripped (commits rebuilt from a clean base with verified byte-identical trees) before merging; nothing reached `main` with the unauthorized line.

## Known Limitations

- **Resolved in Task 20:** `scripts/app-e2e.mjs` and `tests/integration/dev-app.test.mjs` (Task 15's DB-dependent count fixes), previously verified by code review only, have now been executed and pass (`e2e:app` 24 steps; `dev-app` pass).
- **`tests/e2e/print-cover-page.test.mjs` fails** with `page count unchanged: 72 !== 69`. It hard-codes the Sprint v3 PDF length; the PDF has had 72 pages since Stream C added the three advertisement pages. It fails identically at `445a8ac` (before Stream D), and the print HTML is byte-identical before and after Stream D, so it is not a navigation regression. It was not fixed because it is outside Tasks 17–20 and was not in Task 15's declared file list. **It will fail the cover step of `release:v4` (Task 33)**, so a small fix (derive the count, or update it to 72 with the reason) is needed before then.
- **`tests/integration/add-v2-manifest-items.test.mjs`** still fails (it expects `02_INCOMING_CONTENT/Shubhra Basu.docx`, retired in this sprint) — out of scope, aligns with the P2 Task 37. Because `test:integration` is an `&&` chain, it halts the chain at that file.
- **Anchor jumps under the sticky header**: on desktop and tablet (header `position: sticky`, ≈68 px tall) a navigation click puts the target's top edge at the top of the viewport, so the first ~68 px of the section — typically its kicker — sits behind the header. This behaviour predates Stream D (the old per-item links did the same) and is not in the PRD's scope; a `scroll-margin-top` on item cards would fix it if wanted. On mobile the header is static, so it does not occur.
- **Navigation screenshots are not committed**: `qa-output/` is git-ignored. Regenerate with `npm run build && npm run test:e2e:nav`.
- **Label map is closed**: `events` already has a label, but any other new section key (e.g. `souvenirs`) would appear in the navigation under its raw key until `SECTION_LABELS` is extended. This is deliberate and tested: visible rather than silently dropped.
- The PRD's own prose ("17 lines each ending `<br>`") is imprecise about the real source file's last-line convention; the code is correct, the planning-doc wording is not, and hasn't been corrected in `PRD.md` itself (a docs-only fix, not blocking anything).
- Two visible-but-unauthorized commit trailers were caught this session (see Security Measures) — root cause unconfirmed; worth watching for in future sessions.
- Streams E and F (17 more tasks) are entirely untouched — see What's Next.

## What's Next

Resume from `6c1751a` on `main`. The immediately next task is **Task 21** (committee-corrections intake and provenance, Stream E), with no code precondition — it commits the intentionally untracked `sprints/v4/v4changev2.md` and creates the controlled correction record. Before Task 33, fix the stale `test:e2e:cover` page count (Known Limitations). The remaining scope in `sprints/v4/TASKS.md`:

- **Stream E — Committee corrections (Tasks 21–29)**: five additional edits from a post-Task-1 committee addendum (a Bengali wording fix, a title spelling fix, two more Bengali spelling fixes, a "Late" prefix for a deceased contributor, print-only article justification) — Task 23 is gated on a confirmed decision already resolved in `PRD.md` §7.1.
- **Stream F — Build and release (Tasks 30–37)**: the actual `V4_REVIEW_01` release build, PDF comparison against the Sprint v3 baseline, CHANGELOG, manual verification, and a preview deployment (production deployment requires separate explicit approval per the project's standing rule).
