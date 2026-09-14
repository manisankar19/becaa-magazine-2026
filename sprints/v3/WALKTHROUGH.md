# Sprint v3 — Walkthrough (Streams A and B)

Scope of this report: **Part A** covers Stream A, Tasks 1–17 (publication updates; verified 2026-09-14 and unchanged since). **Part B** (added later the same day) covers Stream B, Tasks 18–35 (viewer registration application). Stream C (release, Tasks 36–42) has **not been started**; no `06_FINAL_OUTPUT/V3_REVIEW_01/` folder exists and this sprint has deployed nothing. Part B also records one pre-existing public deployment discovered during verification (§B-Limitations).

---

# Part A — Stream A (Tasks 1–17)


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


---

# Part B — Stream B (Tasks 18–35): viewer registration application

Verification date: 2026-09-14 (after the Stream B commits `837362a` … `c45edbd`)
Verifier method: independent re-derivation — the schema was rolled back and re-created from the migration files and read back from the catalogue; every gate and suite was re-run cold from a deleted `_site/`; the running application was probed with plain `curl` (not Playwright) for the gate, headers, registration, a tampered cookie, admin login, CSV and logs; Stream A artefacts and the V0/V1/V2 release files were re-hashed against the pre-sprint commit; the Vercel account was inspected read-only.

## B-Summary

Stream B turned the static Eleventy site into a gated publication: visitors register once on a public `/welcome/` page, the details go into PostgreSQL through parameterised handlers, a signed HttpOnly cookie opens the magazine, and a single administrator signs in at `/admin/` to see totals, batch/department breakdowns, search registrations, delete one, and download a CSV of approved fields. It added 18 commits and 77 files (5,153 lines): 20 TypeScript modules under `api/`, `lib/` and `middleware.ts` (1,131 lines), one migration with its reverse file, six operational scripts, three templates and two page scripts, 25 test files, and three documents. Nothing was deployed by this sprint; a **pre-existing** public deployment of the V1 site was found and is recorded below.

## B-Independent verification results

| Check | Method | Result |
|---|---|---|
| Schema | `db:rollback 1` then `db:migrate` on `becaa_test`; read `information_schema` and `pg_indexes` | 5 tables exactly as PRD §5.4 (amended): `visitors` (15 columns, `email text`, `department varchar(80)`), `visits`, `admin_sessions`, `rate_limits`, `schema_migrations`; unique index on `lower(email)`; category / mobile / batch-year checks; **no extensions** beyond `plpgsql` |
| Gates | `typecheck`, `check:secrets` (189 files), `check:sql` (26 files) | all pass |
| Unit | `npm run test:unit` | 19 suites green (13 Stream A + 6 Stream B; the validator suite alone has 46 cases) |
| Integration | `npm run test:integration` after a build | 22 PASS lines green (9 Stream B files: migrations, rate limit, register, dev-app, admin auth, admin queries, export, threats + Stream A ones). First cold attempt failed only because I ran it before `build`: `dev-app` and `threats` need `_site/` — see limitations |
| Browser | `test:e2e:welcome`, `test:e2e:admin`, `e2e:app` | all green; `e2e:app` = 22 steps at 1440 px and 390 px, 14 screenshots + 2 CSVs in `qa-output/app/` |
| Live `curl` probes | dev server on :8093 with a throw-away admin credential | `/` → 200 welcome form, `no-store`, CSP, `nosniff`, zero magazine text; ad image and PDF → 403; print HTML → no ad pages; cover → 200; register → 200 with `becaa_v … HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`; with that cookie `/` shows 44 items and the ad image is 200; cookie with two characters changed → welcome page (0 items); `/api/admin/stats` unauth 401; wrong password and unknown user both 401; admin login sets `HttpOnly; SameSite=Strict; Path=/`; stats JSON and CSV header (BOM + 12 approved columns) returned; server log contained no email and no cookie |
| Built output | `ls _site` | `admin assets index.html print welcome`; no `content/`, no `api/`, no `lib/` |
| Stream A regression | `git diff 577fb30..HEAD` on manifest, content, print template/CSS, tracker, sources, release folders | only `src/content/content.11tydata.js` added (Task 24, intended); `index.njk` unchanged |
| Baselines | SHA-256 vs `db5b6ab` | V0, V1 and V2 key files identical; `git status` clean |
| Secrets hygiene | `git check-ignore`, `git ls-files` | `.env.local` and `.pgdata/` ignored and untracked; no `.vercel/` |
| Dependencies | `npm audit` | unchanged: 4 high in build tooling (`js-yaml` transitive, `playwright`, `sharp`, `xlsx`); 0 from the 6 new packages |
| Vercel (read-only) | `vercel whoami`, `project ls`, `project inspect`, `ls` | logged in; **`mani125slm/becaa-magazine-2026` exists since 02 Aug 2026 with a live Production deployment** — not created by this sprint (see limitations) |

## B-Architecture

```
 browser ──HTTPS──▶ Vercel (or scripts/dev-app.mjs locally, same decision code)
                    │
                    ├─ middleware.ts ─── lib/gate.ts ──── lib/session.ts (HMAC verify, Web Crypto)
                    │    matcher: / /index.html /print/* /content/* /assets/normalized/{advertisements,images}/*
                    │    no session: page → rewrite /welcome/ · asset → 403 · public paths untouched
                    │
                    ├─ static _site/ (Eleventy)      /welcome/ (public.njk + welcome.js)   /admin/ (admin.js)
                    │                                 /  magazine (gated)    /print/ (gated)
                    │
                    └─ api/ (Web Request/Response handlers, Node 22)
                         register.ts ──▶ lib/http (origin, 8 KB, form|json) → honeypot → fill-time
                                        → lib/rate-limit (pg upsert) → lib/validate-registration → lib/visitors (upsert + visit)
                                        → lib/session (sign cookie)
                         health.ts
                         admin/login.ts ──▶ rate-limit + lockout → lib/hash (argon2id, constant cost) → lib/admin-session (rotate)
                                           → lib/csrf (token for this session)
                         admin/logout.ts, admin/stats.ts, admin/visitors.ts, admin/visitors/[id].ts, admin/export.csv.ts
                                        ──▶ lib/require-admin (cookie → session row; CSRF for mutations) → lib/admin-queries / lib/csv-core
                                                │
                                                ▼  lib/db.ts (pg pool, parameterised only; enforced by scripts/check-sql.mjs)
                                          PostgreSQL: visitors · visits · admin_sessions · rate_limits · schema_migrations
                                          (db/migrations/001_init.sql, db/rollback/001_init.sql; scripts/db-migrate.mjs, db-purge.mjs)
```

## B-Files created/modified

### 05_WEBSITE/package.json, package-lock.json, tsconfig.json (Task 18)
**Purpose**: six pinned packages (`pg`, `argon2`; dev `typescript`, `tsx`, `@types/node`, `@types/pg`), strict TypeScript config for `api/`, `lib/`, `middleware.ts`, and 26 new npm scripts (`db:*`, `check:*`, `dev:app`, `admin:hash`, `e2e:app`, `test:e2e:*`, `typecheck`). Tests import `.ts` through `node --import tsx`; scripts load `.env.local` with Node's `--env-file-if-exists`.

### 05_WEBSITE/.env.example, .gitignore (Task 18)
**Purpose**: the eight variable names with generation hints (values empty), and ignore rules for `.env`, `.env.*` (except the example), `.pgdata/`, `.vercel/`.

### 05_WEBSITE/scripts/db-local.mjs (Task 18)
**Purpose**: a user-owned PostgreSQL 16 cluster for development and tests. **How it works**: `initdb` into `.pgdata/`, `listen_addresses = '127.0.0.1'`, port 5433, a `pg_hba.conf` that trusts loopback only, then creates `becaa_dev` and `becaa_test`. `start|stop|status` subcommands.

### 05_WEBSITE/scripts/check-secrets-core.mjs, check-secrets.mjs (Task 18)
**Purpose**: fail the build if credential-shaped strings appear in tracked files or `_site/`. Rules: PostgreSQL URLs with a real password (documentation placeholders like `USER:PASSWORD` are exempt because the password part must contain a lowercase letter or digit), `SESSION_SECRET=`/`IP_HASH_SALT=` values, argon2 hashes, `ADMIN_PASSWORD_HASH=`; one finding per line; findings never echo the value; any tracked `.env*` other than the example is itself a finding.

### 05_WEBSITE/db/migrations/001_init.sql, db/rollback/001_init.sql (Task 19)
**Purpose**: the whole schema, forward and reverse. The email column is `text` with `create unique index visitors_email_lower_key on visitors (lower(email))` because `citext` is not available on every PostgreSQL install (this host has no contrib package); the application lower-cases emails on write. `department` is `varchar(80)` after the register test proved two approved names exceed 40 characters. No raw IP columns anywhere; `visits.ip_hash` and `admin_sessions.token_hash` are SHA-256 hex.

### 05_WEBSITE/scripts/db-migrate.mjs, db-purge.mjs, lib/db.ts (Task 19)
**Purpose**: `migrate` applies pending `NNN_*.sql` files each in a transaction and records the version; `status` lists applied/pending; `rollback <n>` runs the reverse file and deletes the ledger row; `purge` clears `visits.ip_hash` older than 30 days, deletes `rate_limits` rows older than a day and expired admin sessions, and with `--email` deletes one visitor (visits cascade). `lib/db.ts` is a lazy `pg.Pool` with `query`, `withTransaction`, `closePool`.

### 05_WEBSITE/src/_data/registration.json, lib/config.ts (Tasks 20, 25)
**Purpose**: the one editorial source for the 11 departments, batch-year floor 1950, privacy-notice version 1, retention date and contact address, read by Eleventy templates and by `lib/config.ts` (which also holds limits, session lifetimes, rate-limit constants, the 2-second minimum fill time and the 8 KB body cap).

### 05_WEBSITE/lib/validate-registration.ts (Task 20)
**Purpose**: every PRD §5.3 rule as a pure function. **How it works**: allow-list the fields, normalise (trim, collapse whitespace, lower-case email, strip `+91`/`0`/spaces/hyphens from the mobile), then validate per category — alumni need a four-digit year in `[1950, current]` and a department from the list (`Other` needs 2–80 characters of free text); sponsors need organisation and mobile; guests may give both; consent must be true. Errors are fixed strings that never echo the input. The email check accepts any TLD with at least two labels (`user@example.co.in` passes, `a@b` fails).

### 05_WEBSITE/lib/session.ts (Task 21)
**Purpose**: the stateless visitor cookie. `signVisitorSession` produces `base64url(payload).base64url(HMAC-SHA256(SESSION_SECRET, payload))` with Web Crypto only, so `middleware.ts` can verify it on the edge; `verifyVisitorSession` rejects malformed, tampered, wrong-secret, future-dated and >30-day-old values. Cookie builder: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`, `Secure` dropped only when `NODE_ENV=development`.

### 05_WEBSITE/lib/admin-session.ts, lib/csrf.ts, lib/hash.ts, lib/ip.ts (Task 21)
**Purpose**: administrator sessions (256-bit random token; only `sha256(token)` stored; 12 h absolute and 60 min idle expiry with the row deleted on expiry; creating a session deletes all others because there is one administrator; cookie `SameSite=Strict` without `Max-Age`), a synchroniser CSRF token `HMAC(secret, "csrf:" + sessionHash)`, argon2id hashing with a dummy-hash path so a missing or malformed configured hash still costs one verification, and salted IP hashing from `x-forwarded-for` / `x-real-ip`.

```ts
export async function verifyPassword(hash, password) {
  const candidate = typeof hash === "string" && hash.startsWith("$argon2id$") ? hash : await DUMMY_HASH_PROMISE;
  let ok = false;
  try { ok = await argon2.verify(candidate, password); } catch { ok = false; }
  return candidate === hash && ok;     // a dummy match can never authenticate
}
```

### 05_WEBSITE/lib/rate-limit.ts, lib/http.ts (Task 22)
**Purpose**: a PostgreSQL-backed window with one atomic statement, and the shared response builders. The upsert resets an elapsed window and increments in the same `INSERT … ON CONFLICT`, so 20 concurrent hits on a limit-10 bucket admit exactly 10 (proved through an 8-connection pool). `http.ts` sets CSP `default-src 'self'`, `nosniff`, referrer policy on every response, `no-store` on `/api/*` and `/admin*`, `X-Frame-Options: DENY` on admin, HSTS in production; `assertSameOrigin` compares `Origin` (then `Referer`) with the forwarded host for state-changing methods; `readJsonBody` caps at 8 KB (413), rejects malformed/non-object JSON (400) and other types (415), and accepts classic form posts for the no-JavaScript path.

```sql
insert into rate_limits (bucket, window_start, count) values ($1, $2, 1)
on conflict (bucket) do update set
  count = case when rate_limits.window_start < $3 then 1 else rate_limits.count + 1 end,
  window_start = case when rate_limits.window_start < $3 then $2 else rate_limits.window_start end
returning count, window_start
```

### 05_WEBSITE/api/register.ts, api/health.ts, lib/visitors.ts, lib/env.ts (Task 23)
**Purpose**: registration and liveness. Order in `register.ts`: method → `REGISTRATION_ENABLED` (503 when `false`) → same-origin (403) → body (413/400/415) → honeypot field `website` (silent 200, no write, no cookie) → `form_started_at` at least 2 s ago (422) → per-IP limit 5/10 min (429 with `Retry-After`) → validation (422 with field errors) → one upsert keyed on `lower(email)` that refreshes editable fields and increments `visit_count`, plus a `visits` row (salted IP hash, user agent ≤ 255) → cookie. Form posts get 303 to `/` (success) or `/welcome/?error=…`. `health.ts` runs `select 1`.

### 05_WEBSITE/src/content/content.11tydata.js, scripts/test-site.mjs (Task 24)
**Purpose**: Eleventy no longer emits a page per Markdown file under `/content/` (15 such pages existed and would have bypassed the gate); the smoke test fails if any reappear.

### 05_WEBSITE/src/_includes/layouts/public.njk, src/welcome.njk, src/assets/js/welcome.js, src/assets/css/site.css (Task 25)
**Purpose**: the public landing page. A layout without the magazine navigation (`noindex`, absolute asset paths), the cover, title, subtitle, introduction, the privacy notice (retention 31 December 2027, contact address) and the form: name, email, category radios, an alumni fieldset (year, department select from `registration.json`, `Other` free text) and a sponsor/guest fieldset (organisation, mobile), consent, an off-screen `aria-hidden` honeypot and a hidden `form_started_at`. `welcome.js` toggles the fieldsets and their `required`/`disabled` state so hidden values are never posted, posts JSON, renders field errors with `textContent`, redirects to `/` on success, and shows a generic notice for the no-JavaScript `?error=` round trip. The CSS adds the form styles and a global `[hidden] { display: none !important }`.

### 05_WEBSITE/lib/gate.ts, middleware.ts, vercel.json (Task 26)
**Purpose**: the gate as a pure decision (`classifyPath` → page / asset / public; `decide` → pass / rewrite `/welcome/` / forbid; fails closed without a secret) and its two hosts: the Vercel middleware, which answers with the platform's headers (`x-middleware-next: 1` to continue, `x-middleware-rewrite` to rewrite, a 403 body for assets) without any extra dependency, and the local server. `vercel.json`: no framework, `npm run build` → `_site`, trailing slashes, global CSP/nosniff/referrer headers, `no-store` + `DENY` on `/admin/`, no rewrites.

### 05_WEBSITE/scripts/dev-app.mjs, lib/node-adapter.ts (Task 27)
**Purpose**: a local server that mirrors production routing: gate first, then `/api/*` resolved Vercel-style (`api/a/b.ts`, else `api/a/[id].ts`) through a Node→Web `Request` adapter with streaming bodies and separate `Set-Cookie` headers, then static files with the security headers. The access log is method, path, status, milliseconds only.

### 05_WEBSITE/scripts/admin-hash.mjs, api/admin/login.ts, api/admin/logout.ts, lib/require-admin.ts (Task 28)
**Purpose**: the single-administrator credential. The hash tool masks interactive input (or reads stdin non-interactively) and prints only the argon2id hash. Login: same-origin → body → per-IP 5/15 min → per-username lockout after 10 failures → username compared in constant time and the password always verified → on success the session is rotated and the response carries the CSRF token; every failure is the same 401 body. Logout needs same-origin + CSRF and revokes the row. `requireAdmin` resolves the cookie to a live session (refreshing idle expiry); `requireAdminMutation` adds origin + CSRF (body field or `x-csrf-token` header).

### 05_WEBSITE/lib/admin-queries.ts, api/admin/stats.ts, api/admin/visitors.ts, api/admin/visitors/[id].ts (Task 29)
**Purpose**: read and delete. `stats` = totals, category counts, alumni by batch and by department (`Other` grouped), latest ten with IST timestamps; `searchVisitors` = escaped `ILIKE` over name/email/organisation, 50 per page, approved fields only; `deleteVisitor` by UUID with cascading visits. The two queries that splice a fixed WHERE fragment carry reviewed `// check-sql: allow` markers — the fragment is one of two constant strings and every user value still travels in `params`.

### 05_WEBSITE/lib/csv-core.ts, api/admin/export.csv.ts (Task 30)
**Purpose**: the export. Every cell quoted, double quotes doubled, cells starting `= + - @ TAB CR` prefixed with `'`, CRLF rows, UTF-8 BOM so Excel decodes Bengali; `EXPORT_COLUMNS` is the only allow-list and `buildCsv` throws for anything else. The handler streams `text/csv` as an attachment with `no-store` and logs one audit line (timestamp, session display id, row count).

### 05_WEBSITE/src/admin.njk, src/assets/js/admin.js (Task 31)
**Purpose**: the administrator page. A static shell (login form, dashboard) with no inline scripts or handlers; `admin.js` probes `/api/admin/stats` to detect an existing session, logs in, keeps the CSRF token in memory, renders tiles, bar tables (widths set through the CSSOM, which the strict CSP allows), a searchable paginated table with confirm-guarded delete, the CSV link, refresh and logout — all inserted with `textContent`/`createElement`.

### 05_WEBSITE/scripts/check-sql-core.mjs, check-sql.mjs, tests/integration/threats.test.mjs, sprints/v3/THREAT_CHECKS.md (Task 32)
**Purpose**: the SQL gate (template literals with SQL keywords and `${}`; `+`-joined SQL strings; marker on the literal's line or the adjacent lines suppresses after review), the end-to-end threat checks not covered elsewhere, and the table mapping every PRD §5.7 row to a test or a recorded manual check.

### 05_WEBSITE/scripts/app-e2e.mjs (Task 33)
**Purpose**: the live-browser suite (`npm run e2e:app`, `--base-url` for previews with `E2E_ADMIN_*` credentials). Locally it starts the dev server with an ephemeral administrator and resets the per-IP register limiter between attempts; remotely the mobile pass reuses the desktop registrations because all requests share one IP. Writes `qa-output/app/app-e2e.json`, screenshots and the downloaded CSVs.

### 05_WEBSITE/DEPLOYMENT.md, README.md (Task 34)
**Purpose**: operations. Variables with generation commands, Neon via Marketplace with a least-privilege application role, preview then production procedures gated on the release pipeline and explicit approval, rollback (instant rollback, additive migrations with reverse files, PITR, dump restore, `REGISTRATION_ENABLED=false`), retention/purge, weekly encrypted `pg_dump`, checklist. README gains prerequisites and a map of the application.

### sprints/v3/PREVIEW_DEPLOYMENT.md (Task 35)
**Purpose**: the rehearsal record. Stopped before creating anything: the team/project choice and the Neon plan/terms are the owner's decisions. Lists the exact commands. Corrected in this walkthrough with the pre-existing project facts (below).

### Test files (25)
`tests/unit/`: `check-secrets-core`, `validate-registration` (46 cases), `session`, `gate`, `csv-core`, `check-sql-core`. `tests/integration/`: `db-migrate`, `rate-limit`, `register`, `dev-app`, `admin-auth`, `admin-queries`, `export`, `threats`. `tests/e2e/`: `welcome-page`, `admin-page`, plus `static-server.mjs` helper. All plain `node:assert` scripts, run by `npm run test:unit` / `test:integration` / `test:e2e:*`.

## B-Data flow

1. Visitor requests `/` → middleware (or dev server) finds no valid `becaa_v` → rewrites to `/welcome/` (URL unchanged, `no-store`).
2. Visitor fills the form → `welcome.js` posts JSON to `/api/register` (or the browser posts the form) → checks in order: enabled, origin, size, honeypot, fill time, per-IP limit, validation → upsert `visitors` + insert `visits` → `Set-Cookie: becaa_v=<payload>.<hmac>` → browser goes to `/`.
3. `/`, `/print/…`, images: middleware verifies the HMAC with `SESSION_SECRET` → `x-middleware-next` → static file served. Tampered/expired cookie → welcome again; asset → 403.
4. Administrator opens `/admin/` → `admin.js` gets 401 from `/api/admin/stats` → login form → `/api/admin/login` (limits, argon2id, rotate session) → `becaa_a` cookie + CSRF token → dashboard fetches `stats`, `visitors?q=&page=`; delete sends `DELETE /api/admin/visitors/:id` with `x-csrf-token`; CSV is a same-site GET; logout revokes the row.
5. Owner operations: `db:migrate` / `db:status` / `db:rollback` / `db:purge`, `admin:hash`, `check:secrets`, `check:sql`, `e2e:app --base-url`.

## B-Test coverage (re-run cold in this walkthrough — all green after `npm run build`)

- **Unit:** 6 new hermetic suites (19 total with Stream A): secret-scanner rules; 46 validator cases + helpers; sessions/admin sessions (fake store)/CSRF/argon2 (incl. dummy path)/IP hashing; gate decisions and middleware protocol; CSV cells and allow-list; SQL-gate heuristics.
- **Integration (real PostgreSQL, 8 new files, 22 PASS lines total):** schema from scratch/idempotent/constraints/purge/rollback; atomic rate limit under concurrency + lockout + HTTP helpers; register (15 scenarios); dev server over real HTTP incl. log hygiene; admin auth (15 scenarios); admin queries with seeded aggregates and injection strings; CSV export parsed end-to-end; threat checks.
- **Browser:** welcome page (desktop + mobile, intercepted API); admin page through the real server (XSS as text, no CSP violations, no overflow); `e2e:app` 22 steps on both viewports.
- **Gates:** `typecheck`, `check:secrets`, `check:sql`; `npm audit` unchanged.

## B-Security measures

Parameterised SQL only (enforced by a gate); allow-listed input; server-side validation duplicating browser validation; HMAC-signed HttpOnly visitor cookie with 30-day expiry; argon2id administrator credential from environment variables with constant-cost verification and uniform failures; hashed, rotating, idle/absolute-expiring server-side admin sessions; per-IP and per-username limits with lockout in one atomic statement; same-origin checks and synchroniser CSRF tokens on every state change; honeypot and minimum fill time; 8 KB body cap; CSP `default-src 'self'`, `nosniff`, referrer policy, `no-store`, `DENY`, HSTS in production; no inline scripts and `textContent`-only rendering; salted IP hashes, no raw IPs, purge command; CSV allow-list and formula guard; audit line without data; secrets only in `.env.local`/Vercel and scanned for; gate fails closed without a secret; per-item content pages removed from the build; server code never published as static files.

## B-Known limitations

- **A public, ungated deployment of the V1 magazine already exists** at `https://becaa-magazine-2026.vercel.app` (team **Mani**, project `becaa-magazine-2026`, created 02 August 2026, Production, 40 items, artwork directly reachable). It predates Sprints v2 and v3, is not recorded in `CHANGELOG.md` or any sprint document, and was not created or changed by this sprint. Until V3 is approved and deployed, the registration gate protects nothing there; a production deploy of V3 to that project would replace it. This needs your decision (leave, pause, or replace) before Stream C's deployment step. `PREVIEW_DEPLOYMENT.md` has been corrected accordingly; its first draft wrongly said no such project existed.
- `citext` replaced by a `lower(email)` unique index (recorded in PRD §5.4). Equivalent for uniqueness; Neon does support `citext`, but the code no longer depends on it.
- Two integration tests (`dev-app`, `threats`) need `_site/` from a prior `npm run build`; `npm run test:integration` therefore belongs after `build` (the release pipeline in Task 36 must order it so). Task 33's suite builds nothing either.
- The Vercel middleware response protocol (`x-middleware-next` / `x-middleware-rewrite`) and argon2's native binary on Vercel's Node runtime are exercised only by unit tests and locally; both are verified for real only when the preview in Task 35 is run. The existing project is configured for Node 24.x with root `.`, which does not match `vercel.json`'s expectations — settings to fix at link time.
- The browser tests run with `bypassCSP` because Playwright's `waitForFunction` injects an `eval`; the CSP header itself is asserted, and the browser console is checked for violations.
- All E2E requests share one IP, so the per-IP register limit shapes the suite (reset locally; reduced mobile pass remotely).
- No email verification, no visitor accounts, one administrator, no automated purge, no admin audit-log UI — all by design (Decisions H, Q and PRD §7).
- Design choice worth knowing: an HttpOnly admin cookie cannot be read by `admin.js`, so a page reload after login re-uses the server session but the in-memory CSRF token is gone; the dashboard shows a notice and a fresh login restores it.
- The four pre-existing `npm audit` findings in build tooling remain (Task 36/37).

## B-What's next

1. Decide what to do with the live V1 deployment (leave / pause / replace) and which Vercel project the V3 preview should use; then run the seven steps in `sprints/v3/PREVIEW_DEPLOYMENT.md` (Task 35's deployment half) and record the preview result there.
2. Stream C (Tasks 36–42): `release:v3` ordering `build` before the integration and E2E suites, audit allow-list and secret/SQL gates, corrected `REPRODUCTION.md`, `js-yaml` fix, `V3_REVIEW_01`, baseline check, `CHANGELOG.md` (including the pre-existing deployment note), and the two P2 carry-overs.
3. Full-sprint `/walkthrough` after Stream C, then the production decision.

## B-Verdict

**Stream B complete and correct locally; not deployed.** Every Task 18–35 acceptance criterion is confirmed by re-run and by independent `curl` probes, the schema matches the amended PRD, Stream A output and the V0/V1/V2 releases are untouched, and no resource was created on the Vercel account. The one open matter is not a defect in this work but a fact about the environment: the V1 magazine has been publicly reachable without a gate since 2 August, and that must be decided on before V3 goes live.

## B-Exact paths for manual review

- Local run: `npm run db:local:start && npm run build && npm run dev:app` → http://127.0.0.1:8087 (`/`, `/welcome/`, `/admin/`)
- Browser evidence: `05_WEBSITE/qa-output/app/` (after `npm run e2e:app`), `05_WEBSITE/tests/screenshots/` (git-ignored)
- Documents: `05_WEBSITE/DEPLOYMENT.md`, `sprints/v3/THREAT_CHECKS.md`, `sprints/v3/PREVIEW_DEPLOYMENT.md`
- Live V1 site (pre-existing, outside this sprint): https://becaa-magazine-2026.vercel.app
