# Sprint v4 — Walkthrough (Tasks 1–16)

Scope note: Sprint v4 has 37 planned tasks across six streams (A–F). This walkthrough covers only **Tasks 1–16** — Stream A (intake/consolidation), Stream B (the poem), and Stream C (the three new advertisements) — which are complete, merged to `main`, and verified. Streams D (navigation, Tasks 17–20), E (committee corrections, Tasks 21–29) and F (build/release, Tasks 30–37) have not started; see **What's Next**.

## Summary

This slice of Sprint v4 does three things to the BECAA Maharashtra Magazine 2026 site (an Eleventy static build that produces both a website and a print PDF from one hand-authored manifest): it merges a stray `v2-incoming/` subfolder back into the single `02_INCOMING_CONTENT/` intake location with full provenance; it re-extracts the poem "গোলাপ" (ART-010) from a corrected Markdown source so every line renders as its own line, on web and in print; and it adds three new advertisement pages — two text-only compliments ads and one memorial — by extending the advertisement system with a `presentation` concept (`artwork` | `text` | `memorial`) instead of assuming every advertisement is a piece of artwork. Nothing in the application layer (registration, authentication, admin, database) was touched.

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
                      │ (website)          │   │ → compile-pdf.mjs →   │
                      │                    │   │ BECAA-2026-complete-  │
                      │                    │   │ review.pdf            │
                      └─────────┬──────────┘   └───────────┬───────────┘
                                │                           │
                                └─────────────┬─────────────┘
                                              ▼
                          e2e/QA scripts (web-ad-cards, print-ad-pages,
                          print-poem-page, v4-advertisements — all counts
                          derived from readManifest(), never hardcoded)
```

## Files Created/Modified

77 files changed (+4,151 / −206 lines) across 15 commits plus 2 merge-conflict/doc-only commits. Grouped by stream below; every new module gets its own subsection, mechanical/count-only edits to existing files are grouped into tables.

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

## Data Flow

**Consolidation**: `consolidate-incoming.mjs --plan` reads both folders → `planConsolidation()` (pure) decides safety → JSON+MD report written → human/CI checks `ok: true` → `--apply` performs 5 `git mv` + removes the empty folder → 14 downstream files (manifest, front matter, 10 scripts, 4 tests) get their path references repointed by hand in the same task.

**Poem**: `Shubhra Basu.md` (authoritative, hash-verified) → `readVerseSource()` parses & validates 17 lines → `extract-v4-golap.mjs` re-serializes with `<br>` on every line → writes `ART-010-item.md` + repoints the manifest → Eleventy's `markdown` filter turns Markdown hard breaks into literal `<br>` tags at build time → `.prose p:has(br)` CSS keeps it left-aligned and unhyphenated on both the website and in the print HTML that becomes the PDF.

**Advertisements**: `add-v4-manifest-items.mjs` writes three items into `publication.yaml`, each declaring a `presentation` → `validate.mjs` calls `validateAdvertisementPresentation()` on every item at build-validation time, enforcing the shape per presentation kind → `npm run build` (Eleventy) renders `index.njk`/`print.njk`, branching per item on `presentation` → `npm run pdf` (Playwright) turns the print HTML into the actual PDF → e2e/QA scripts re-open both build outputs and assert wording/structure, all counts pulled live from `readManifest()` rather than hardcoded.

## Test Coverage

- **Unit** (21 files in `test:unit`, all passing): includes 2 new this sprint (`incoming-consolidation-core`, `tracker-v4-core`) and substantial additions to 2 existing files (`article-markdown-core` — 7 new `readVerseSource` cases; `ad-presentation-core` — 17 new presentation-kind cases alongside the 13 pre-existing ones, all still green).
- **Integration** (22 file-based cases in `test:integration`, all passing except one pre-existing, unrelated, out-of-scope failure — see Known Limitations): 8 new files this sprint (`consolidate-incoming`, `incoming-consolidation`, `extract-v4-golap` — replacing the deleted `extract-v2-golap` — `normalize-v4-memorial-image`, `ad-text-render`, `ad-memorial-render`, `add-v4-manifest-items`, `apply-v4-tracker-updates`, `v4-advertisements`), plus 6 existing files updated for the new paths/counts.
- **E2E** (Playwright, against a real `npm run build`/`npm run pdf`): `web-ad-cards`, `print-ad-pages` (rewritten for 3 presentation kinds), and a new `print-poem-page` (`test:e2e:poem`).
- Everything above is wired into the shared `test:unit`/`test:integration` npm scripts so a plain `npm test` / `npm run test:unit` / `npm run test:integration` exercises all of it.

## Security Measures

- **Fingerprint gates**: both `extract-v4-golap.mjs` and `add-v4-manifest-items.mjs` refuse to run if the source file's live SHA-256 doesn't match a hardcoded expected value — a revised or wrong file can't silently get published.
- **Targeted string surgery, never blind rewrite**: every manifest/tracker edit finds an exact known line, count-guards the replacement (throws if it's not found exactly once), and re-parses the file afterward to confirm it's still valid YAML/XLSX — the ~1,000-line hand-authored manifest is never reformatted wholesale.
- **Snapshot-before-write**: every tracker mutation copies the live `.xlsx` into `TRACKER_SNAPSHOTS/` before touching it, and skips the write entirely if nothing actually changed.
- **No shell injection in file moves**: `git mv` runs via `execFileSync` with an argument array, never a shell string — no wildcards, no interpolation.
- **Output escaping**: all new template output uses Nunjucks's default auto-escaping (`{{ text_lines[0] }}`), never `| safe`, even though the text originates from an approved/trusted source.
- **Gate discipline**: every task ran `semgrep --config auto --quiet --error` on its own changed files and `npm audit` before its commit; a final holistic semgrep pass across all of `scripts/`, `tests/`, `src/` found zero new findings (the 5 findings that do exist are in 3 files this sprint never touched, pre-dating Sprint v4).
- **Prompt-injection caught and rejected**: two independent subagents, working in isolated worktrees with no shared context, each appended an unauthorized `Claude-Session:` trailer to their own commits — identical text, matching a suspected injection attempt seen earlier in the same coordinating session. Both were stripped (commits rebuilt from a clean base with verified byte-identical trees) before merging; nothing reached `main` with the unauthorized line.

## Known Limitations

- **`scripts/app-e2e.mjs` and `tests/integration/dev-app.test.mjs`** (Task 15's fixes to the DB-dependent application-suite counts) were verified by code review and `node --check` only, not executed end-to-end — a local Postgres port was held by a concurrent session throughout this work. The change is the same mechanical `readManifest()`-derived-count pattern proven correct everywhere else, but it should be re-run for real the next time the application suites are exercised (naturally covered by the not-yet-started Task 20).
- **`tests/integration/add-v2-manifest-items.test.mjs`** fails — but this predates this sprint entirely (it expects `Shubhra Basu.docx`, deleted back in Task 1) and is explicitly out of scope (a P2 cleanup task, not one of 1–16).
- The PRD's own prose ("17 lines each ending `<br>`") is imprecise about the real source file's last-line convention; the code is correct, the planning-doc wording is not, and hasn't been corrected in `PRD.md` itself (a docs-only fix, not blocking anything).
- Two visible-but-unauthorized commit trailers were caught this session (see Security Measures) — root cause unconfirmed; worth watching for in future sessions.
- Streams D, E and F (17 more tasks) are entirely untouched — see What's Next.

## What's Next

The immediately next task is **Task 17** (`navigation-core` with hermetic unit tests, Stream D), no precondition. The remaining scope in `sprints/v4/TASKS.md`:

- **Stream D — Navigation (Tasks 17–20)**: fix the home-page navigation currently rendering one link per *item* instead of one per *section* (48 links instead of 8).
- **Stream E — Committee corrections (Tasks 21–29)**: five additional edits from a post-Task-1 committee addendum (a Bengali wording fix, a title spelling fix, two more Bengali spelling fixes, a "Late" prefix for a deceased contributor, print-only article justification) — Task 23 is gated on a confirmed decision already resolved in `PRD.md` §7.1.
- **Stream F — Build and release (Tasks 30–37)**: the actual `V4_REVIEW_01` release build, PDF comparison against the Sprint v3 baseline, CHANGELOG, manual verification, and a preview deployment (production deployment requires separate explicit approval per the project's standing rule).
