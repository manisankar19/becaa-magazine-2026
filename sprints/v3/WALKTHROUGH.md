# Sprint v3 — Walkthrough (Stream A only)

Scope of this report: **Stream A, Tasks 1–17** of `sprints/v3/TASKS.md` (publication updates). Stream B (viewer registration application, Tasks 18–35) and Stream C (release, Tasks 36–42) have **not been started**; no `06_FINAL_OUTPUT/V3_REVIEW_01/` folder exists and nothing has been deployed. This document must be superseded by a full-sprint walkthrough once Streams B and C are done.

Verification date: 2026-09-14
Verifier method: independent re-derivation, not re-reading task notes — fresh `mammoth` extraction diffed against the shipped Markdown, manifest and tracker diffed field-by-field against the pre-sprint commit `db5b6ab` and the first v3 tracker snapshot, the whole pipeline re-run cold from a deleted `_site/` and `qa-output/`, every advertisement PDF page re-rendered and pixel-sampled, and the protected V0/V1/V2 release files re-hashed against both `HEAD` and `db5b6ab`.

## Summary

Stream A replaced the Secretary's Desk message with Abir Banerjee's revised text, published Siddhartha Mukhopadhyay's Bengali story "প্যাঁড়া" as `ART-012`, retitled all 22 published advertisements to "With best compliments from [Company]", and gave every advertisement page and web card a background colour matched to its artwork. It touched 63 files across 17 commits (`2126a13` … `577fb30`), added 13 unit suites, 9 integration tests and 2 Playwright suites, and left every earlier release folder byte-identical. All 17 tasks are independently confirmed done and correct. One PRD claim was found wrong by a red test and corrected (see §"contrast-core.mjs").

## Architecture Overview

No new stack. Everything below is an extension of the V0–V2 Eleventy/YAML pipeline. New pieces are marked `*`.

```
02_INCOMING_CONTENT/                       04_MAGAZINE_WORKING/
  secretary desk.docx (revised)              BECAA_2026_Content_Tracker.xlsx
  v2-incoming/Siddhartha … story.docx        TRACKER_SNAPSHOTS/*_pre-v3-*.xlsx   *
        │                                    SUPERSEDED_SOURCES/2026-09-14/      *
        │ mammoth.convertToHtml                       ▲
        ▼                                             │ snapshot-first writes (tracker-io.mjs *)
  docxHtmlToParagraphText *  ──► src/content/{messages/MSG-003, articles/ART-012}.md
        │                                             │
        ▼                                             │
  add-v3-manifest-items *  ─────────────────────────► src/_data/publication.yaml
  retitle-advertisements *  (manifest + tracker)          │  44 items; ADV-* carry title,
  apply-v3-tracker-updates * (rows 18, 24)                │  page_background, page_background_mode, page_ink
  sample-ad-backgrounds *  (sharp edge sampling)          │
  apply-v3-ad-overrides *  (ADV-019, ADV-023)             │
                                                          ▼
   validate-tracker-core *  ◄── tracker      validate.mjs ──► ad-presentation-core * ──► contrast-core *
                                                          │
                                         eleventy (filters adPageStyle / adInkClass *)
                                                          │
                              ┌───────────────────────────┴───────────────────────────┐
                              ▼                                                       ▼
                     _site/index.html                                       _site/print/index.html ──► compile-pdf ──► PDF (69 pp)
                   (tinted .ad-frame cards)                                  (tinted .print-page--advertisement)
                              │                                                       │
              test-site.mjs + tests/e2e/web-ad-cards *                 pdf-qa.mjs + tests/e2e/print-ad-pages *
                              └──────────────── ad-qa-checks-core * ──────────────────┘
                                                          │
                                        ad-backgrounds-qa * ──► qa-output/ad-backgrounds/{AD_BACKGROUND_REVIEW.md, contact-sheet.png}
```

## Independent verification results

| Check | Method | Result |
|---|---|---|
| MSG-003 body verbatim | Fresh `mammoth.convertToHtml` → `docxHtmlToParagraphText` → compare with shipped body | Byte-identical (3,496 chars); every non-whitespace character of `extractRawText` present in order; no U+FFFD |
| ART-012 body verbatim | Same | Byte-identical (4,804 chars); no U+FFFD; first line "প্যাঁড়া/ সিদ্ধার্থ মুখোপাধ্যায়", last sentence intact |
| Source fingerprints | `sha256sum` of live DOCX vs manifest | MSG-003 `ed3fd766…`, ART-012 `9bbe16d1…` — both match |
| Superseded originals | `sha256sum` of archive vs `git show db5b6ab:…` | `df446f44…` and `a13de2ba…` — both match; README lists all four hashes |
| Manifest diff vs `db5b6ab` | Field-by-field per item | 43 → 44 items; MSG-003: only `source_fingerprint`; 20 ads: exactly `title,page_background,page_background_mode,page_ink`; ADV-019/ADV-023: those plus `notes`; ART-012 new (order 220); cover block identical; IDs unique |
| Tracker diff vs first v3 snapshot | Row-by-row, all columns | 52 → 52 rows; 24 rows changed: Item 18 `[Remarks]`, Item 24 `[Title, Received Date, Permission, Status, Web Include, Print Include, Remarks]`, 22 ADV rows `[Title / Item, Remarks]`; `Lists` and `Instructions` identical; excluded ADV-009/016/024/025/027 untouched |
| Cold pipeline | `rm -rf _site qa-output` then 12 steps | All green (see §Test Coverage) |
| Website | Built HTML | 44 items; 22 `<h2>` starting "With best compliments from"; 0 headings ending "Advertisement" |
| PDF | `pdfinfo`, `pdftotext`, pixel sampling | 69 pages, exactly A4; zero text-empty pages; all 22 ad pages titled correctly on page and in contents; content-box pixel within ±6 of `page_background` on all 22 |
| White space on ad pages | Near-white pixel fraction of rendered page, V2 vs V3 | ADV-003: 89 % → 35 %; ADV-018: 72 % → 34 % |
| Artwork untouched | `git diff db5b6ab..HEAD -- 03_ADVERTISEMENTS src/assets/normalized` | Empty |
| V0/V1/V2 releases | SHA-256 of 7 key files vs `HEAD` and vs `db5b6ab` | All identical; `git status` clean under every protected folder |
| Dependencies | `npm audit` | Unchanged: 4 high (`js-yaml` transitive, `playwright`, `sharp`, `xlsx`); no dependency added or changed |

## Files Created/Modified

### 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/ (Task 1)
**Purpose**: Byte-exact copies of the two `02_INCOMING_CONTENT` files as they were before the editor dropped the revised versions over them, plus a `README.md` with old/new SHA-256 pairs.
**How it works**: The pipeline never writes into `02_INCOMING_CONTENT`; these copies were exported from git blob `db5b6ab`. The intake commit `2126a13` also committed the revised DOCX files themselves so a `git checkout` can no longer destroy them. `tests/integration/superseded-sources.test.mjs` pins both archive hashes and both live hashes.

### 05_WEBSITE/scripts/article-markdown-core.mjs (Task 2, extended)
**Purpose**: Pure Markdown construction for extracted articles; now also converts mammoth HTML to paragraph text.
**Key functions**: `buildArticleMarkdown()` (unchanged from v2) — `docxHtmlToParagraphText(html)` — `decodeHtmlEntities(text)`.
**How it works**: `mammoth.extractRawText()` silently drops DOCX soft line breaks (`<w:br/>`), which in V1 concatenated the Secretary's closing into "SecretaryBECAA Maharashtra". The new function feeds `mammoth.convertToHtml()` output through a tiny, dependency-free converter instead:

```js
.split(/<\/(?:p|h[1-6]|li)\s*>/i)              // block boundaries
.map((b) => b.replace(/<br\s*\/?>/gi, "  \n")   // soft break → Markdown hard break
             .replace(/<img\b[^>]*>/gi, "")     // images never inlined
             .replace(/<[^>]+>/g, ""))          // strip every other tag
.map(decodeHtmlEntities) … .filter(Boolean).join("\n\n");
```
Nothing is reworded: the walkthrough confirmed the non-whitespace characters of both bodies equal the raw extraction exactly.

### 05_WEBSITE/scripts/extract-v3-secretary-desk.mjs → src/content/messages/MSG-003-secretary-desk.md (Task 3)
**Purpose**: Rewrite MSG-003's body from the revised DOCX.
**How it works**: Same shape as the v2 extractors. Title stays "Secretary Desk" (Decision C); the document heading "From the Secretary's Desk" is kept verbatim as the first body line; the 162×65 px scanned signature is not imported (Decision B); closing renders as "With warm regards," / "Abir Banerjee" / "ETC '92" / "Secretary" / "BECAA Maharashtra" on separate lines.

### 05_WEBSITE/scripts/extract-v3-siddhartha-story.mjs → src/content/articles/ART-012-item.md (Task 4)
**Purpose**: Extract the approved story to Markdown with `id: ART-012`, `title: "প্যাঁড়া"`.
**How it works**: Identical pattern; text-only (the DOCX has no media). The author's own "প্যাঁড়া/ সিদ্ধার্থ মুখোপাধ্যায়" line stays in the body, as Palash Biswas's byline line did in v2.

### 05_WEBSITE/scripts/add-v3-manifest-items.mjs (Task 5)
**Purpose**: Two targeted edits to `publication.yaml`: swap MSG-003's fingerprint line, insert the `ART-012` block after `ART-011`.
**How it works**: String edits, not a YAML round-trip, so the other ~1,000 hand-authored lines are untouched (`git diff` = 1 line changed + 25 inserted). Refuses to run if ART-012 already exists or if `secretary desk.docx` is not the 2026-09-14 file. Language is detected as `bn` (no Latin letters in the body).

### 05_WEBSITE/scripts/advertisement-title-core.mjs + retitle-advertisements.mjs (Tasks 6–7)
**Purpose**: Retitle every published advertisement to `With best compliments from <contributor>`.
**Key functions**: `deriveComplimentsTitle(item)` — `retitleAdvertisements(items, trackerRows)` — `retitleAdvertisementsOnDisk()`.
**How it works**: The pure core only rewrites titles matching `^(.+) Advertisement$` or `^Advertisement from (.+)$`, takes the company name from the manifest `contributor` field verbatim, and throws on an empty contributor, on any manifest/tracker company mismatch, or on an unrecognised title (surfaced, never silently rewritten). Unpublished (excluded) advertisements are skipped. The disk script replaces exactly one `    title:` line per item (via `js-yaml`'s own scalar quoting) and updates the same 22 tracker rows after a snapshot, appending a dated `Remarks` note. Two names are carried exactly as recorded and were approved as-is: "Tata Capital Ltd. (Retail Finance)" and "Clover Blakefield Reality LLP".

### 05_WEBSITE/scripts/tracker-io.mjs (Task 7, new shared module)
**Purpose**: One snapshot-first, style-preserving tracker write path for every tracker-editing script (factored out of v2's `apply-v2-exclusions.mjs`).
**Key functions**: `snapshotTracker(label)`, `openTracker()`, `readSheetRows()`, `writeSheetPreservingStyles()`, `saveTracker()`.

### 05_WEBSITE/scripts/tracker-v3-core.mjs + apply-v3-tracker-updates.mjs (Task 8)
**Purpose**: Approve Item 24 and record Item 18's revision.
**How it works**: `applyTrackerFieldUpdates(rows, decisions)` sets named columns (only columns that already exist) and appends a remarks note once (idempotent); the script wraps it with a snapshot. Item 24 becomes Approved / Print and web / Yes / Yes / 14.09.2026 with title "প্যাঁড়া (Siddhartha Mukhopadhyay story)" and its v2 remark preserved.

### 05_WEBSITE/scripts/validate-tracker-core.mjs + validate-tracker.mjs (Task 9)
**Purpose**: Tracker rules as a pure, unit-testable function.
**How it works**: `validateTrackerRows(rows, sheetNames)` returns an error list. The stale v2 rule "Item 24 must remain excluded" is replaced by "Item 24 must be Approved and included"; Item 20 must still be excluded; every web-enabled `ADV-` row's `Title / Item` must equal `With best compliments from <Contributor / Company>`.

### 05_WEBSITE/scripts/contrast-core.mjs (Task 10)
**Purpose**: WCAG 2.x luminance/contrast maths and ink resolution.
**Key functions**: `relativeLuminance`, `contrastRatio`, `resolveInkColour(bg, family)`, `chooseInk(bg)`, `isHexColour`, `rgbToHex`.
**How it works**: Dark family = the site's `--ink` `#20201d`, light family = `--paper` `#fbfaf7`. **Finding during TDD:** the PRD claimed one of these two always reaches 4.5:1; the red test proved that false for mid-tones (`#7b7b7b`: 3.8 and 4.1). The fix falls back to pure black / pure white within the family, which always reaches ≥ 4.58:1:

```js
export function resolveInkColour(background, family) {
  const token = family === "dark" ? INK_DARK : INK_LIGHT;
  const tokenRatio = contrastRatio(background, token);
  if (tokenRatio >= AA_MIN_RATIO) return { ink: family, colour: token, ratio: tokenRatio };
  const pure = family === "dark" ? "#000000" : "#ffffff";
  return { ink: family, colour: pure, ratio: contrastRatio(background, pure) };
}
```
PRD §4.4 was corrected in the same commit. In practice only ADV-008 (grey `#8b8c8a`) uses the fallback (pure black, 4.83:1).

### 05_WEBSITE/scripts/ad-presentation-core.mjs + validate.mjs + config.mjs (Task 10)
**Purpose**: Validator rules for published advertisements.
**How it works**: `validateAdvertisementPresentation(item)` errors when a published advertisement title ends in "Advertisement" or is not exactly the compliments form; when `page_background` is not `#rrggbb`; when `page_background_mode`/`page_ink` are outside `auto|manual|none` / `auto|dark|light`; when a colour is missing in `auto`/`manual` mode; or when the resolved ink reaches < 4.5:1. `validate.mjs` records `page_background`, `page_ink` and `contrast_ratio` per advertisement in `validation-report.json`. `config.mjs` gains an `advertisementPage` block (modes, `edgeSampleFraction: 0.02`, `minContrastRatio: 4.5`).

### 05_WEBSITE/scripts/ad-background-core.mjs + sample-ad-backgrounds.mjs (Task 11)
**Purpose**: Sample each advertisement's edge colour and record it in the manifest.
**Key functions**: `edgeRegions(w, h, fraction)`, `edgeColourFromStats(stats)`, `manifestFieldsFor(hex)`, `insertAdvertisementFields(yamlText, id, fields)`.
**How it works**: For every published advertisement whose mode is absent or `auto`, `sharp` reads the four 2 % edge strips of the print asset (never the web asset, never modifying anything), averages their channel means, and the three presentation fields are inserted after that item's `notes:` line by targeted text edit. Items in `manual`/`none` mode are skipped; unchanged values write nothing (second run is byte-identical). Colours are committed data, so builds are reproducible and the choice is reviewable in a diff. All 22 sampled values sit within ±2/channel of the PRD §4.4 survey.

### 05_WEBSITE/scripts/apply-v3-ad-overrides.mjs (Task 12)
**Purpose**: The two approved manual overrides (Decision F), as a reproducible script rather than a hand edit.
**How it works**: ADV-023 `#baecec` (sampled cyan `#58d6db` mixed 60 % toward `--paper`), ADV-019 `#2b2f31` (deep neutral charcoal instead of near-black), both `page_background_mode: manual`, override reason appended to `notes`. The sampler now reports both as skipped.

### 05_WEBSITE/eleventy.config.mjs, src/print.njk, src/assets/css/print.css (Task 13)
**Purpose**: Tinted A4 advertisement pages.
**How it works**: Two filters, `adPageStyle` (→ `--ad-bg: …; --ad-ink: …;`) and `adInkClass`, are backed by the same `resolveInk` the validator uses, so build and validation cannot disagree. Every print section gets `data-testid="print-page-<ID>"`. The tint is painted on the section's content box **inside** the 18 mm `@page` margins — the page number lives in the margin box and stays on white — rather than full-bleed with negative margins (the technique behind the still-open v2 cover-clipping bug):

```css
.print-page--advertisement {
  display: grid; grid-template-rows: auto auto 1fr;
  min-height: 261mm; padding: 8mm 8mm 10mm;
  background: var(--ad-bg, #fff); color: var(--ad-ink, #20201d);
  print-color-adjust: exact;
}
.print-page--advertisement figure { align-self: center; justify-self: center; }
.print-page--advertisement .print-ad { max-height: 215mm; }   /* still object-fit: contain */
```

### 05_WEBSITE/src/index.njk, src/assets/css/site.css (Task 14)
**Purpose**: The same tint on the website card; advertisement byline removed.
**How it works**: Advertisement `<article>`s carry `data-testid="ad-card-<ID>"`, the ink class and the CSS variables. The header block and `.ad-frame` are both painted with `--ad-bg` and the header width is matched to the 740 px frame so they read as one card (a first screenshot showed a stepped edge). The `.byline` is no longer rendered for advertisements because the company name is now the heading. Gallery cards keep the white frame and their byline.

### 05_WEBSITE/scripts/ad-qa-checks-core.mjs, test-site.mjs, pdf-qa.mjs (Task 15)
**Purpose**: Make the acceptance criterion ("no published title still ends with Advertisement") an automated gate on rendered output, not just on the manifest.
**How it works**: `test-site.mjs` collects every advertisement card heading, contents entry and nav label from the built page and fails on any that ends in "Advertisement" or differs from the manifest title, and on any advertisement byline. `pdf-qa.mjs` locates each page by whole-token kicker match (`· ADV-018`), checks the page heading and the contents-page entry (the contents list spans two pages — the first run caught that the parser read only one), and samples the pixel 5 px inside the top-left margin of the rendered page, requiring it to match `page_background` within ±6/channel. Results (title, colour, sampled RGB, page) go to `qa-output/pdf-advertisement-qa.json`.

### 05_WEBSITE/scripts/ad-review-core.mjs + ad-backgrounds-qa.mjs (Task 16)
**Purpose**: One review sheet so a human can inspect all 22 pages in one pass.
**How it works**: `npm run qa:ad-backgrounds` (after `qa` and `qa:pdf`) renders each desktop web card with Playwright, writes a swatch SVG per advertisement, composes a 6-column `contact-sheet.png` of the 22 rendered PDF pages with `sharp`, and writes `qa-output/ad-backgrounds/AD_BACKGROUND_REVIEW.md` (ID, title, swatch + hex, mode with manual in bold, resolved ink + ratio, linked PDF-page and web-card thumbnails). Inspected in Task 16 and again in this walkthrough: every mount matches its artwork, headings legible, artwork complete and centred, page numbers on white, nothing clipped.

### 05_WEBSITE/package.json
New scripts: `extract:v3-secretary-desk`, `extract:v3-siddhartha-story`, `manifest:apply-v3-updates`, `retitle:advertisements`, `tracker:apply-v3-updates`, `sample:ad-backgrounds`, `manifest:apply-v3-ad-overrides`, `qa:ad-backgrounds`, `test:e2e:print-ads`, `test:e2e:web-ads`; `test:unit` and `test:integration` chains extended. No dependency added.

### .gitignore
`05_WEBSITE/tests/screenshots/` ignored (Playwright debugging screenshots; release evidence lives in `qa-output/`).

## Data Flow

1. Editor drops revised DOCX files in place → Task 1 exports the previous blobs to `SUPERSEDED_SOURCES/` and commits both versions.
2. `extract:v3-*` → `mammoth.convertToHtml` → `docxHtmlToParagraphText` → `buildArticleMarkdown` → `src/content/**.md` (verbatim, hard line breaks kept).
3. `manifest:apply-v3-updates` → MSG-003 fingerprint + ART-012 block; `retitle:advertisements` → 22 titles in manifest **and** tracker (snapshot first); `tracker:apply-v3-updates` → rows 18 and 24 (snapshot first).
4. `sample:ad-backgrounds` → `sharp` edge stats → `page_background/mode/ink` per advertisement; `manifest:apply-v3-ad-overrides` → ADV-019/ADV-023 manual.
5. `tracker:validate` + `validate` gate the data (titles, hex, enums, ≥ 4.5:1 ink).
6. `build` → Eleventy filters resolve `--ad-bg/--ad-ink` per advertisement → tinted cards (`index.html`) and tinted pages (`print/index.html`) → `pdf` (Chromium, `printBackground: true`).
7. `test`, `qa`, `qa:pdf`, `qa:ad-backgrounds`, `test:e2e:*` verify the rendered output, pixel-sample the PDF pages and produce the review sheet.

## Test Coverage (re-run cold in this walkthrough — all green)

- **Unit (hermetic, 13 suites, 43 PASS lines):** `article-markdown-core` (8 incl. 5 new line-break/entity cases), `advertisement-title-core`, `tracker-v3-core`, `validate-tracker-rules` (52-row fixture, 7 groups), `contrast-core` (WCAG reference values; fallback cases), `ad-presentation-core` (13 assertions), `ad-background-core`, `ad-qa-checks-core`, `ad-review-core`, plus the 4 pre-existing v2 suites.
- **Integration (real files, idempotent, 9 new + 5 v2 + archive check = 14 PASS):** `superseded-sources`, `extract-v3-secretary-desk`, `extract-v3-siddhartha-story`, `add-v3-manifest-items`, `retitle-advertisements`, `apply-v3-tracker-updates`, `sample-ad-backgrounds`, `apply-v3-ad-overrides`; each runs the real script against the real manifest/tracker and proves the second run is a no-op.
- **E2E (Playwright, 2 suites):** `print-ad-pages` (22 sections: background = manifest colour, kicker/heading = resolved ink, title, aspect ratio, grid; article pages white) and `web-ad-cards` (desktop + mobile: 22 cards, no advertisement byline, gallery unchanged, no overflow).
- **Pipeline gates:** `tracker:validate`, `validate` (0 errors / 7 pre-existing warnings), `test` (smoke + 22 titles + bylines + nav), `qa`, `qa:pdf` (22 pages, titles, pixels), `qa:ad-backgrounds`.

## Security Measures

- Every new script was scanned with `semgrep --config auto` (0 findings); `npm audit` unchanged (no dependency added).
- No source file in `01_*`, `02_*` (beyond committing the editor's own drop), `03_*`, or any `06_FINAL_OUTPUT/` folder was written by any script; artwork and normalized derivatives are byte-identical to `db5b6ab`.
- Every tracker write is preceded by a timestamped snapshot; scripts refuse to run on unexpected state (wrong fingerprint, duplicate ID, unrecognised title pattern, company mismatch, unknown column).
- Manifest edits are targeted line/block edits with re-parse checks, never a lossy YAML round-trip.
- Company names come only from recorded data; no name was guessed or re-spelled.

## Known Limitations

- **Stream B and C are not started.** In particular the 15 per-item HTML pages under `_site/content/` (14 in V2 + ART-012) are still emitted; Task 24 removes them. The stale `REPRODUCTION.md` template and the `js-yaml` audit fix are Tasks 36–37.
- No `V3_REVIEW_01` release folder exists yet (Task 38); the QA evidence currently lives only in the git-ignored `05_WEBSITE/qa-output/`.
- The tint is on the content box, not full-bleed — a deliberate choice (page number stays on white; avoids the cover-clipping technique), but a full-bleed look would need the v2 Task 19 fix first.
- ADV-008's heading uses pure black rather than the palette ink (only case where the palette token fails AA); ADV-023's title wraps to two lines in print. Both are cosmetic.
- The v2 cover-page clipping artifact (Task 41) and `shell: true` in `release.mjs` (Task 42) remain open, as do the carried-over editorial items: Item 20 (source file still not received) and the Palash Biswas "Civil"/"Mech" branch discrepancy.
- The web-card screenshot of a tall message section captures the sticky site header mid-element; this is a screenshot artefact, not a layout defect.

## What's Next

1. Authorise **Stream B** (Tasks 18–35): local PostgreSQL cluster, migrations, validators, session/CSRF utilities, `/api/register`, gate middleware, `/welcome/` page, admin login/dashboard/CSV, threat tests, Playwright E2E, deployment docs, preview-only Vercel rehearsal. Values still needed from you before deployment (not before `/dev`): administrator username (N) and Vercel account/team (O).
2. Then **Stream C** (Tasks 36–42): `release:v3` with audit/secret gates and a correct `REPRODUCTION.md`, `js-yaml` audit fix, assemble `V3_REVIEW_01`, baseline check, `CHANGELOG.md`, and the two P2 carry-overs if time allows.
3. Run `/walkthrough` again for the whole sprint before any deployment decision.

## Verdict (Stream A)

**Complete and correct; ready for Stream B.** Every Stream A acceptance criterion in `TASKS.md` and every Group A requirement in `PRD.md` §4 (including the corrected advertisement-title requirement and its "no title ends with Advertisement" acceptance criterion) is independently confirmed on the actual rendered website and PDF, the tracker and manifest changed only in the intended fields, and V0/V1/V2 outputs are provably untouched. Nothing is released or deployed.

## Exact paths for manual review

- Website build: `05_WEBSITE/_site/index.html` (rebuild with `npm run build`)
- Print PDF: `05_WEBSITE/_site/print/BECAA-2026-complete-review.pdf` (rebuild with `npm run pdf`)
- Advertisement review sheet: `05_WEBSITE/qa-output/ad-backgrounds/AD_BACKGROUND_REVIEW.md` and `contact-sheet.png` (after `npm run qa && npm run qa:pdf && npm run qa:ad-backgrounds`)
- Revised content: `05_WEBSITE/src/content/messages/MSG-003-secretary-desk.md`, `05_WEBSITE/src/content/articles/ART-012-item.md`
- Superseded originals: `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/`
- Tracker snapshots: `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/*_pre-v3-*.xlsx`
