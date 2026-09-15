# Sprint v4 — PRD: Publication Updates, Intake Consolidation and Navigation Correction

Status: **Approved** (decisions A–N resolved 2026-09-15)
Prepared: 2026-09-15
Baseline: `06_FINAL_OUTPUT/V3_REVIEW_02/` (protected; 44 items, 69-page PDF) and production `https://becaa-magazine-2026-portal.vercel.app` at commit `d707355`
Requirements source: `sprints/v4/Changev4.md`
Proposed output: `06_FINAL_OUTPUT/V4_REVIEW_01/`
Preserve unchanged: every folder under `06_FINAL_OUTPUT/` (V0–V3), every file in `01_REFERENCE_2025/` and `03_ADVERTISEMENTS/`, `BECAA_Magazine_2026_Master.docx`, the database, migrations, Neon resources, environment variables, authentication, gate, middleware, registration and administrator code.

---

## 1. Overview

Sprint v4 is a small publication-and-presentation sprint on top of the deployed Sprint v3 portal. It does five things: (1) updates the extracted form of Shubhra Basu's poem "গোলাপ" (`ART-010`) from the authoritative `Shubhra Basu.md` source, preserving its 17 lines and `<br>` line breaks exactly with no added stanza gaps; (2) adds a text-only advertisement page for M/s Balajee Infrate; (3) adds a text-only advertisement page for Sarc Epic; (4) adds a memorial page for Late Shri Bhakta Mohon Mitra with the supplied photograph; (5) merges the `02_INCOMING_CONTENT/v2-incoming` folder into `02_INCOMING_CONTENT` and fixes the home-page navigation so each section appears once. Nothing in the application layer (registration, gate, admin, database) changes. The sprint ends with a new review release `V4_REVIEW_01`, a preview deployment for manual approval, and a separately authorised production deployment.

### 1.1 Verified findings (2026-09-15)

| Topic | Finding |
|---|---|
| Navigation defect | Confirmed in the built site and in `src/_includes/layouts/base.njk` lines 14–22: the `<nav aria-label="Primary">` loops over **every** published item (`publication.items \| whereWeb \| byOrder`) and prints `sectionLabel` for each, so the nav holds 48 links: Contents ×1, Messages ×3, Articles ×12, Gallery ×7, Advertisements ×22, Cultural Programmes ×1, Connect ×1, With Thanks ×1. The item-level list that *should* enumerate items is the separate `#contents` section in `src/index.njk`. |
| Revised poem source | Authoritative source: `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md` (untracked, SHA-256 `0d068f30b846c0b7…`, 1,533 bytes), 17 Bengali lines each ending with `<br>`, no stanza gaps. The previously committed `Shubhra Basu.docx` (SHA-256 `83ae8311a1db…`, 14,342 bytes) has been deleted from the working tree and will be archived before the intake commit. No DOCX parsing is required: the poem body is read directly from the `.md` file and its content written verbatim into `ART-010-item.md` after a front-matter update. |
| Poem line set | The `.md` file contains 17 lines with the same words and punctuation as the superseded version's 17 lines (split at the original soft breaks); no editorial change is implied. The `.md` is the final canonical form. |
| Advertisement IDs | Manifest: 22 published advertisements `ADV-001…ADV-026` with 009, 016, 024, 025 excluded. Tracker: 27 rows `ADV-001…ADV-027`. **`ADV-027` already exists**: "Aniket Pal Advertisement", contributor "Aniket Pal (company name unavailable)", *Excluded – Source artwork not available*, Notes "Source: Debojit Dutta Biswas…". The Sarc Epic request's note "Source: AniketPal (Debojit da)" almost certainly refers to the same sponsor, whose company name is now known. Highest used order among advertisements: 760 (`ADV-026`). No tracker row mentions Balajee, Keya Mukhopadhya, Sarc Epic, Bhakta Mohon Mitra, Subrata/Soma Mitra or a memorial. |
| Memorial image | `02_INCOMING_CONTENT/Supriyo.JPG` exists (untracked): JPEG 1687×1687 px, RGB, 484,751 bytes, SHA-256 `d15810866b6b…`, Google PhotoScan capture of a black-and-white studio portrait of a man in spectacles and a light shirt; a white border strip along the top and a dark photo-corner at the top-right/bottom corners are part of the scan. Nothing meaningful is lost by keeping the full square frame; no crop is needed. Print derivative will be 1687 px wide (above the validator's 1,116 px A4 warning threshold). |
| Folder consolidation | `v2-incoming` holds 5 files: `Palash Article.docx`, `Shubhra Basu.docx`, `Siddhartha Mukhopadhyay story.docx`, `chatgpt kallol.jpeg`, `cover page new.png`. Parent folder holds 21 files. **No case-insensitive filename collision.** Closest name pair is `cover page new.png` (v2) vs `Cover page.jpg` (parent) — different files (SHA-256 `29a12bcb…` vs `d8dfb14b…`), both must survive. Live references to `v2-incoming`: manifest (`GAL-007`, `ART-010`, `ART-011`, `ART-012`, `cover.source_file`), three content files' front matter, 10 scripts, 5 tests, and `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/README.md`; plus historical sprint documents (v2, v3). No reference inside `06_FINAL_OUTPUT/` or `source-inventory.json`. |
| Safety rule tension | `INSTRUCTION.md` §4.1 forbids moving files in `02_INCOMING_CONTENT`. `Changev4.md` §7 explicitly instructs the move. The change request is the later, specific instruction and is treated as the authorisation; the move is done with `git mv` so byte identity and history are preserved, and every hash is recorded. |
| Title rule | `validateAdvertisementPresentation()` (Sprint v3) requires every published advertisement title to equal `"With best compliments from " + contributor`. That wording is wrong for a text-only page whose sole content is "Best Compliment from …" and impossible for a memorial. The validator needs a presentation kind (§5). |
| Counting assumptions | `tests/e2e/web-ad-cards.test.mjs`, `tests/e2e/print-ad-pages.test.mjs` and `scripts/app-e2e.mjs` hard-code 22 advertisements / 22 loaded images. They must derive counts from the manifest (published ads → 25; ads with artwork → 23). |
| Release pipeline | `release-core.stepsForVersion()` returns the V3 step list only for versions starting with `V3`; `V4_REVIEW_01` must map to the same list. |

## 2. Goals

- `ART-010` renders the complete revised poem with a line break after every source line, on the website and in the PDF; the four-line example renders as exactly four lines.
- Three new advertisement items are published consistently (tracker, manifest, website, contents, PDF) with exact approved wording; two text-only, one memorial with the supplied photograph, none inventing any information.
- `02_INCOMING_CONTENT` is the only incoming location; every live reference is updated; nothing is lost; both poem versions remain recoverable.
- The main navigation shows exactly eight links, once each, in the approved order, each pointing at the section start or the first published item, derived from the manifest.
- `V4_REVIEW_01` passes the full gated pipeline; the PDF differs from `V3_REVIEW_02` only where authorised; a preview is reviewed before a separately approved production deployment.

## 3. User stories

- As a reader, I want the poem's lines where the poet put them, so the verse reads as verse on screen and on paper.
- As a sponsor without artwork, I want my compliments shown cleanly and prominently, without invented details.
- As the family of a departed alumnus, I want the memorial wording exactly as supplied, with the photograph intact, and not presented as a company advertisement.
- As a reader on desktop or phone, I want one link per section at the top of the page instead of 48 repeated labels.
- As the editor, I want one incoming folder and a traceable record of every revised or superseded source.

## 4. Work packages

### 4.1 Intake and preservation (first commit of the sprint)

1. Export the superseded poem bytes from git `HEAD` (SHA-256 `83ae8311a1db…`) to `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-15/Shubhra Basu.docx` with a `README.md` in the 2026-09-14 format (old/new SHA-256, reason, published item). Extend `tests/integration/superseded-sources.test.mjs` to assert the new archive.
2. Commit the revised `Shubhra Basu.docx`, `Supriyo.JPG`, the archive folder and `sprints/v4/` together as the intake commit. Nothing else is written into `02_INCOMING_CONTENT/` by this sprint except the consolidation moves in §4.5.

### 4.2 Poem `ART-010` — source update and CSS verse rendering

- **Authoritative source** (Decision A, B): `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md` (SHA-256 `0d068f30b846c0b7…`, 1,533 bytes) is already in the correct Markdown form: a `# গোলাপ` heading, a `**শুভ্রা বসু**` author line, a blank line, and 17 poem lines each ending with `<br>`. No DOCX parsing is needed. `docxDocumentXmlToParagraphs` is **not** added in this sprint; the DOCX-based `extract-v2-golap.mjs` is retired.
- **Script** `scripts/extract-v4-golap.mjs` reads `Shubhra Basu.md` using `fs.readFileSync`, validates the structure (finds heading, author, and exactly 17 `<br>`-terminated lines), then writes `ART-010-item.md` keeping the existing front matter with the updated `source_file` path and `source_fingerprint` `0d068f30b846c0b7…` (after §4.5 the path becomes `02_INCOMING_CONTENT/Shubhra Basu.md`). Validation: count the `<br>` occurrences and compare to 17; throw if wrong so the pipeline fails rather than silently publishing fewer lines.
- **Rendered form** (Decision A): title line, author line, blank line, then the 17 poem lines each ending in a hard break, no stanza gaps. Markdown-it already renders trailing `<br>` as `<br>`; no template change is required.
- **CSS** (web and print): `.prose p:has(br)` forces left alignment, normal line-height and no hyphenation so verse never justifies; no template or manifest change.
- **Verification**: an integration test reads the committed `ART-010-item.md` and asserts 17 `<br>`-separated lines and the four-line example verbatim; the site test counts 17 `<br>` inside `#ART-010 .prose`; the PDF test uses `pdftotext -layout` and asserts the 17 lines in source order, each on its own text line.

### 4.3 Text-only advertisements — M/s Balajee Infrate and Sarc Epic

Both pages contain only the approved sentence, in large type, centred, on a restrained tinted page identical in chrome to other advertisement pages (section kicker, tinted box, page number). No logo, address, contact, slogan or artwork.

| | M/s Balajee Infrate | Sarc Epic |
|---|---|---|
| Approved sentence (exact) | `Best Compliment from M/s Balajee Infrate` | `Best Compliment from Sarc Epic` |
| ID (Decision C) | `ADV-028` | `ADV-027` |
| Order (Decision D) | 780 | 770 |
| Tracker note (verbatim from the change request) | `Source: Keya Mukhopadhya. Intended for magazine printing. No design available.` | `Source: AniketPal (Debojit da). No design available.` |
| Tracker remark | Text-only advertisement; no source artwork supplied; published as ADV-028. | ADV-027 row updated: company name confirmed as Sarc Epic (same sponsor as the excluded "Aniket Pal" entry, source via Debojit da); status changed from Excluded to Approved. Text-only advertisement; no source artwork supplied. |

Manifest entry: `type: advertisement`, `presentation: text` (new field, §5), `title` = the approved sentence, `contributor` = company name as written, `source_file: ""`, `web_asset`/`print_asset: ""`, `text_lines: [<sentence>]`, `notes` recording "Text-only advertisement; no source artwork supplied", `page_background` a manual neutral tint (Decision F), `page_background_mode: manual`, `page_ink: auto`, `permission: Print and web`, `editorial_status: Approved`, `verification: verified`, `web_include: true`, `print_include: true`, `alt: ""`.

### 4.4 Memorial page — Late Shri Bhakta Mohon Mitra

- ID `ADV-029`, order 790 (Decisions C, D), `presentation: memorial`.
- Text, exactly and in this line structure (rendered as seven lines):
  ```
  In fond memory of
  Late Shri Bhakta Mohon Mitra
  B E (Mechanical) April 1951
  Bengal Engineering College, Shibpur, Howrah.
  With Love from
  Subrata Mitra (son)
  Soma Mitra (daughter)
  ```
  `title: "In fond memory of Late Shri Bhakta Mohon Mitra"` (first two lines joined; the phrase "In fond memory of" is kept unchanged), `contributor: "Subrata Mitra (son), Soma Mitra (daughter)"`, `designation: "Memorial contribution"`, `text_lines` = the seven lines.
- Image: `source_file: 02_INCOMING_CONTENT/Supriyo.JPG` (fingerprint `d15810866b6b…`), derivatives by the established convention (`normalizeImageVariant`: web 1600 px q88, print 2480 px q94, `withoutEnlargement`, no crop): `assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg` and `…/print/ADV-029-…-print.jpg`; `alt: "Portrait of Late Shri Bhakta Mohon Mitra"`; no caption or credit is invented (the tracker records the source).
- Tracker row: Source `SUPRIO CHOUDHURY`, Source File Name `Supriyo.JPG`, Contributor / Company `Subrata Mitra (son), Soma Mitra (daughter)`, Notes "Memorial contribution sponsored by the son and daughter; not a company advertisement.", Received Date 15.09.2026 (Decision M).
- Presentation: the page is visibly labelled as a memorial (kicker reads `Advertisements · In memoriam · ADV-029`), the photograph is shown complete and undistorted above the seven centred lines, on a neutral tint; the website card and PDF page use the same structure.

### 4.5 Incoming-content consolidation (its own commit)

Steps, in order, each backed by a script or test so the result is auditable:
1. `scripts/consolidate-incoming.mjs --plan` writes `04_MAGAZINE_WORKING/INCOMING_CONSOLIDATION_2026-09-15.md` and `.json`: inventory of both folders (name, bytes, SHA-256), case-insensitive collision check (expected: none), near-name pairs with hashes, and the planned `git mv` list.
2. `--apply` performs `git mv` for the five files into `02_INCOMING_CONTENT/` (byte-identical; git history preserved) and removes the then-empty directory. No wildcard deletes.
3. Reference updates: manifest `source_file` values (5), three content front matters, the extract/normalise/manifest scripts and their tests (paths and any `"v2-incoming"` literals), and a dated addendum line in `SUPERSEDED_SOURCES/2026-09-14/README.md`. Historical sprint documents (v2, v3), `INSTRUCTION.md` and `05_WEBSITE/README.md` (which does not name the subfolder) are left as records (Decision H).
4. `tests/integration/incoming-consolidation.test.mjs`: every inventoried file exists at its new path with the recorded hash; `v2-incoming` does not exist; `grep` over live code, data, tests and content finds no `v2-incoming`; the manifest fingerprints still match the moved files.
5. `npm run validate` and the full suites pass before the commit.

### 4.6 Navigation correction

- **Root cause**: the per-item loop in `base.njk` (§1.1). Fix the generator: a pure `sectionNavigation(items, { hasThanks })` in `scripts/navigation-core.mjs` returns the eight entries `[Contents → #contents] + one per section in order of first appearance among published items (label via the existing sectionLabel map, href → first published item id) + [Cultural Programmes → #cultural-programmes, Connect → #connect, With Thanks → #with-thanks (when the message exists)]`. Exposed to Nunjucks as a `sectionNav` filter; `base.njk` renders `{% for link in publication.items | whereWeb | byOrder | sectionNav(publication.sponsor_acknowledgement_message) %}`. Section order is data-driven (item order values), which yields Messages, Articles, Gallery, Advertisements today and stays correct if items are added.
- **Presentation**: keep the pill style; nav already wraps (`flex-wrap`). Add `data-testid="primary-nav"` and keep `aria-label="Primary"`. No dropdown. Verify no overlap with the brand link at 390, 820 and 1440 px and no horizontal overflow.
- **Tests** (`tests/unit/navigation-core.test.mjs`, `tests/e2e/site-navigation.test.mjs`): exactly eight links; labels once each in order; hrefs non-empty and resolving to an element in the built page; Messages/Articles/Gallery/Advertisements hrefs equal the first published item of each section computed from the manifest; a hermetic fixture with an extra article and an extra advertisement still yields eight links; keyboard: `Tab` reaches each link and `:focus` style is visible; three viewport widths screenshotted for the walkthrough.

## 5. Data model and validator changes

- New optional manifest fields on advertisement items: `presentation: artwork | text | memorial` (default `artwork`), `text_lines: string[]` (required and non-empty for `text` and `memorial`; forbidden for `artwork`).
- `validateAdvertisementPresentation`: for `artwork` the Sprint v3 title rule is unchanged. For `text`: `title` must equal `text_lines[0]` and `text_lines` must have exactly one line; for `memorial`: `title` must equal `text_lines[0] + " " + text_lines[1]`, `text_lines` at least three lines, `print_asset`/`web_asset` required. For all kinds: title must not end with "Advertisement"; background/ink rules unchanged (manual tint requires `page_background`).
- `config.advertisementPage.presentations = ["artwork", "text", "memorial"]`.
- Templates (`src/index.njk`, `src/print.njk`) render by `presentation`: artwork → existing figure; text → `<p class="ad-text">` with the sentence; memorial → figure (uncropped image, `max-height` bounded) followed by `<div class="ad-memorial">` with one line per `text_lines` entry. Text is placed with `{{ }}` escaping, never `| safe`.
- Contents list, PDF contents page and QA scripts use `title` unchanged, so the three new titles appear there verbatim.

## 6. Tests to add or update (maps to Changev4 §14)

| # | Requirement | Test |
|---|---|---|
| 1–5 | eight links, once each, in order, valid hrefs, targets exist | `tests/e2e/site-navigation.test.mjs` |
| 6–9 | first-item destinations | same, computed from the manifest |
| 10 | extra items do not add links | `tests/unit/navigation-core.test.mjs` |
| 11–12 | access-control, viewer and admin suites green | existing `test:unit`, `test:integration`, `e2e:app`, `test:e2e:welcome/admin` re-run (counts derived from manifest) |
| 13–14 | every poem line preserved on web and PDF; four-line example | `tests/integration/extract-v4-golap.test.mjs`, site test, `tests/e2e/print-poem-page.test.mjs` (pdftotext) |
| 15 | text-only sentences exact everywhere | `tests/integration/v4-advertisements.test.mjs`: manifest, built HTML card, contents entry, PDF page, tracker row |
| 16 | memorial wording and contributors exact | same test |
| 17 | memorial derivatives exist, load, follow normalisation rules | `tests/integration/normalize-v4-memorial-image.test.mjs` + web-ad-cards (image loads, aspect preserved) |
| 18 | three IDs unique and consistent | same test + `npm run validate` + `tracker:validate` |
| 19 | no live `v2-incoming` reference | `tests/integration/incoming-consolidation.test.mjs` |
| 20 | inventory proves nothing lost | same test against the consolidation JSON |

Existing tests that assert `22` advertisements are rewritten to derive the count from the manifest.

## 7. Decisions (recommendation first; say if you disagree)

- **A. Poem stanzas.** *Decided:* `Shubhra Basu.md` is the authoritative source. Render its 17 lines with `<br>` line breaks exactly as supplied, no added stanza gaps. The original recommended value is unchanged.
- **B. Extraction route.** *Decided:* read `Shubhra Basu.md` directly — the poem body is already in the correct Markdown form (`<br>` line breaks). No DOCX parsing is needed; `docxDocumentXmlToParagraphs` is not added in this sprint. Mammoth stays for prose items.
- **C. Advertisement IDs.** *Decided:* reuse `ADV-027` for Sarc Epic (same sponsor, company name now confirmed); update the ADV-027 tracker row from the excluded "Aniket Pal" entry. New IDs: `ADV-028` (Balajee Infrate, order 780), `ADV-029` (memorial, order 790). Sarc Epic order: 770.
- **D. Order.** *Decided:* 770 (ADV-027 Sarc Epic), 780 (ADV-028 Balajee), 790 (ADV-029 memorial). Appended after ADV-026 (order 760); memorial last.
- **E. Titles.** *Decided:* the approved sentence appears exactly once on the page — it is both `title` and the only text content (`text_lines[0]`), no separate heading. The v3 "With best compliments" rule applies to `artwork` advertisements only. Memorial title: "In fond memory of Late Shri Bhakta Mohon Mitra" (first two `text_lines` joined).
- **F. Page tint for text and memorial pages.** *Decided:* one shared manual tint `#f3efe6` (warm paper, dark ink, contrast ≈ 15:1) for all three pages. *Alternative:* sample the memorial photograph's edge colour with the existing sampler (would give a grey tint) and white for the text pages.
- **G. Typography.** Text-only sentence: `clamp(1.9rem, 4.5vw, 3rem)` on the web card, 30 pt in print, centred, max-width 20 ch, allowed to wrap; memorial lines 16–18 pt print / 1.15 rem web, centred, with the name line emphasised. Adjust only if the three-width browser check shows overflow.
- **H. Documentation scope of the consolidation.** *Decided:* update live code, data, tests and content plus a dated addendum in the 2026-09-14 archive README and a CHANGELOG note; leave `INSTRUCTION.md`, `05_WEBSITE/README.md` and historical sprint documents unchanged as records. *Alternative:* also rewrite historical paths in the v2/v3 documents.
- **I. Navigation data source.** Section order and first-item targets derived from published items' `order` values at build time (no hard-coded IDs); the four fixed links remain literal anchors.
- **J. Memorial labelling.** Kicker `Advertisements · In memoriam · ADV-029` and `designation: Memorial contribution`; the item stays in the advertisements section (tracker Print Section "Advertisements") because that is where the sponsorship sits.
- **K. Counts.** All advertisement counts in tests and QA are derived from the manifest; image-load assertions apply to items with artwork only.
- **L. Release.** `release:v4` → `V4_REVIEW_01`; `stepsForVersion` treats `V4` like `V3`; a PDF comparison step lists per-page text differences against `V3_REVIEW_02` and the walkthrough must explain each.
- **M. Received date** for the three tracker rows: 15.09.2026 (the day the files and request arrived).
- **N. Commit plan.** (1) intake, (2) consolidation, then per-task commits as in v3; deployment to preview after `/walkthrough`; production only after explicit approval.

## 8. Out of scope

Everything listed in Changev4 §13: unrelated content, ordering, titles, tracker rows, backgrounds and artwork; registration, validation, authentication, cookies, middleware, gate, admin, database, migrations, Neon, rate limiting, security headers, environment variables; V0–V3 release folders; production data. Also out of scope: replacing the "Version 1 local review" eyebrow on the cover, the item-level contents list, and any dropdown navigation.

## 9. Dependencies

Sprint v3 complete (`d707355` in production); Node 22, `unzip`, `pdftotext` (present); Playwright Chromium (present); local PostgreSQL cluster for the application suites (unchanged); tracker edits authorised by Changev4 §§4–6 (snapshot-first via `tracker-io.mjs`).

## 10. Validation criteria for `V4_REVIEW_01`

- `npm run validate` 0 errors; item count 47 (44 + 3); manifest diff vs `d707355` limited to: `ART-010` (`source_file`, `source_fingerprint`), four `source_file` path updates from the consolidation, three new items (`ADV-027` updated, `ADV-028` and `ADV-029` added), `cover.source_file`.
- Website: 8 nav links; `ART-010` shows 17 lines; three new advertisement cards with exact wording; 23 advertisement images load (artwork items only; text and memorial pages checked separately); welcome gate, registration and admin suites green.
- PDF: page count 69 + 3 (± pagination caused by the poem); text differences vs `V3_REVIEW_02` only on the contents pages, the `ART-010` page(s), the three new pages and pages shifted by them; the poem's 17 lines each on its own line.
- Tracker: three new rows and one remark on row 22; snapshot taken; `tracker:validate` passes.
- Consolidation: `v2-incoming` absent; inventory JSON proves 26 files present with unchanged hashes.
- Security and secret scans, dependency audit gate, `git diff` review: only files needed for this sprint.
- Earlier release folders byte-identical (existing baseline check).

## 11. Proposed task streams for `/prd` (indicative)

**Stream A — intake and consolidation (P0):** superseded-source archive + intake commit → consolidation plan/apply script + inventory + reference updates + test → commit.
**Stream B — poem (P0):** verse extraction core + fixtures → `extract-v4-golap` + integration test → CSS verse modifier → site and PDF line tests.
**Stream C — advertisements (P0):** manifest `presentation`/`text_lines` schema + validator + unit tests → templates and CSS for text and memorial pages → memorial image normalisation → manifest entries + tracker rows (snapshot) → count-derived E2E/QA updates → wording/consistency tests.
**Stream D — navigation (P0):** `navigation-core` + unit test → `base.njk` filter → E2E at three widths with screenshots.
**Stream E — release (P0/P1):** `release:v4`, `stepsForVersion`, PDF comparison report, CHANGELOG, `V4_REVIEW_01`, preview deployment (no `--prod`), walkthrough evidence.
