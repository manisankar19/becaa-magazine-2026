# Sprint v4 — Tasks

## Status: Approved (2026-09-15); `/dev` not started

Reference: `sprints/v4/PRD.md` (draft 2026-09-15), `sprints/v4/Changev4.md`
Protected: every folder under `06_FINAL_OUTPUT/` (V0–V3), `01_REFERENCE_2025/`, `03_ADVERTISEMENTS/`, `BECAA_Magazine_2026_Master.docx`, the database, migrations, Neon resources, environment variables, and every file under `05_WEBSITE/api/`, `lib/`, `middleware.ts`, `db/`, `src/welcome.njk`, `src/admin.njk`, `src/assets/js/`. `02_INCOMING_CONTENT/` is written only by Task 1 (commit of the two files the owner placed there) and Task 4 (`git mv` of five files, authorised by Changev4 §7).
Conventions carried from v3: every tracker edit is preceded by a timestamped copy in `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/` (`tracker-io.mjs`); pure logic lives in a `*-core.mjs` module with a hermetic unit test written first; scripts that touch real files get an integration test; each task ends with `semgrep --config auto --quiet --error` on new files and `npm audit` (allow-list unchanged); no secrets, `.env*` files or credentials are ever committed; nothing is deployed to production in this sprint (preview only, Task 33); production database contents are never modified. Decision letters refer to PRD §7; each task below uses the *recommended* value, so an amended decision changes only that value.
Local prerequisites: Node 22, `unzip`, `pdftotext` (all present); Playwright Chromium; local PostgreSQL cluster (`npm run db:local:start`) for the application suites only.

---

## Stream A — Intake and consolidation

- [ ] Task 1: Archive the superseded poem source and make the intake commit (P0)
  - Acceptance: `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-15/Shubhra Basu.docx` equals the git `HEAD` blob (SHA-256 `83ae8311a1db9205…`), with a `README.md` in the 2026-09-14 format listing superseded hash (`83ae8311a1db9205…`) and the new authoritative source (`Shubhra Basu.md`, SHA-256 `0d068f30b846c0b7…`, 1,533 bytes), the format change (committed DOCX with `<w:br/>` → authoritative Markdown `.md` with `<br>` line breaks) and "published as ART-010"; `tests/integration/superseded-sources.test.mjs` extended to assert the new archive and README; one commit contains `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md`, `02_INCOMING_CONTENT/Supriyo.JPG` (SHA-256 `d15810866b6bf285…`), the archive folder and `sprints/v4/`; `git status` clean afterwards (the deleted `.docx` entry is staged as removed).
  - Files: `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-15/Shubhra Basu.docx` (archived from git HEAD), `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-15/README.md`, `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md` (new source), `02_INCOMING_CONTENT/Supriyo.JPG`, `sprints/v4/PRD.md`, `sprints/v4/TASKS.md`, `05_WEBSITE/tests/integration/superseded-sources.test.mjs`

- [ ] Task 2: Consolidation core — inventory, collision and move-plan logic (P0)
  - Acceptance: pure `scripts/incoming-consolidation-core.mjs` exports `planConsolidation({ parentFiles, subFiles })` (each `{ name, bytes, sha256 }`) returning `{ collisions, nearNames, moves, inventoryAfter }` where `collisions` compares names case-insensitively, `nearNames` lists pairs with similarity ≥ 0.6 plus both hashes, `moves` is `[{ from, to }]`, and any collision makes `ok: false`; unit test covers no-collision, exact-case collision, case-only collision, near-name pair (`cover page new.png` vs `Cover page.jpg`) and identical-hash duplicate.
  - Files: `05_WEBSITE/scripts/incoming-consolidation-core.mjs`, `05_WEBSITE/tests/unit/incoming-consolidation-core.test.mjs`

- [ ] Task 3: Consolidation script — plan report (P0)
  - Acceptance: `node scripts/consolidate-incoming.mjs --plan` reads both folders, writes `04_MAGAZINE_WORKING/INCOMING_CONSOLIDATION_2026-09-15.json` and `.md` (inventory of 21 + 5 files with bytes and SHA-256, collisions = none, near-name table, the five planned `git mv` operations, the list of live files referencing `v2-incoming`), and exits non-zero on any collision; no file is moved; integration test runs `--plan` against a temp copy and checks the report shape.
  - Files: `05_WEBSITE/scripts/consolidate-incoming.mjs`, `05_WEBSITE/tests/integration/consolidate-incoming.test.mjs`, `04_MAGAZINE_WORKING/INCOMING_CONSOLIDATION_2026-09-15.{json,md}`

- [ ] Task 4: Apply the consolidation and update every live reference (P0, Decision H)
  - Acceptance: `--apply` performs exactly five `git mv` operations (via `execFileSync("git", ["mv", …])`, no shell, no wildcards) and removes the empty `v2-incoming` directory only after all five succeed; `source_file` updated for `GAL-007`, `ART-010`, `ART-011`, `ART-012` and `cover.source_file` in `publication.yaml`; front matter of `ART-010/011/012-item.md` updated; every script and test listed in PRD §1.1 points at the new paths; a dated addendum line appended to `SUPERSEDED_SOURCES/2026-09-14/README.md`; `npm run validate` passes with the same fingerprints; new `tests/integration/incoming-consolidation.test.mjs` asserts each of the 26 inventoried files exists at its final path with the recorded hash, `v2-incoming` is absent, and a scan of `05_WEBSITE/scripts`, `src`, `tests`, `04_MAGAZINE_WORKING/*.md` (excluding historical sprint docs and `06_FINAL_OUTPUT`) finds no `v2-incoming`; committed as one consolidation commit.
  - Files: `05_WEBSITE/scripts/consolidate-incoming.mjs`, `05_WEBSITE/src/_data/publication.yaml`, `05_WEBSITE/src/content/articles/ART-010-item.md`, `ART-011-item.md`, `ART-012-item.md`, `05_WEBSITE/scripts/{add-v2-manifest-items,add-v3-manifest-items,apply-v2-exclusions,extract-v2-golap,extract-v2-palash-article,extract-v3-siddhartha-story,merge-v2-addendum-tracker,normalize-v2-cover,normalize-v2-gallery-image,update-v2-cover-manifest}.mjs`, `05_WEBSITE/tests/{integration/cover-manifest-entry,integration/extract-v3-siddhartha-story,integration/normalize-cover-core,integration/superseded-sources,unit/article-markdown-core}.test.mjs`, `05_WEBSITE/tests/integration/incoming-consolidation.test.mjs`, `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/README.md`

## Stream B — Poem `ART-010`

- [ ] Task 5: Verse source validation helper (P0, Decision B)
  - Acceptance: pure `readVerseSource(markdownText)` in `scripts/article-markdown-core.mjs` parses a `.md` file of the form `# heading`, `**author**`, blank line, then N lines each ending `<br>\n`; returns `{ heading, author, lines: string[] }` (without the trailing `<br>`); throws with a descriptive message if the structure is invalid (wrong heading level, author not bold, any line missing the `<br>`, count mismatch when a `expectedCount` option is given); failing-first unit tests: correct 17-line .md → 17 entries, four-line example verbatim, missing `<br>` → throws, empty body → throws, count mismatch → throws.
  - Files: `05_WEBSITE/scripts/article-markdown-core.mjs`, `05_WEBSITE/tests/unit/article-markdown-core.test.mjs`

- [ ] Task 6: `extract-v4-golap` script using the `.md` authoritative source (P0, Decisions A, B)
  - Acceptance: `scripts/extract-v4-golap.mjs` reads `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md` (path updated to `02_INCOMING_CONTENT/Shubhra Basu.md` after Task 4 consolidation), passes it through `readVerseSource` with `{ expectedCount: 17 }`, then writes `ART-010-item.md` preserving the existing front matter with updated `source_file` and `source_fingerprint: 0d068f30b846c0b7…`; body is: title line, author line, blank line, then 17 lines from `lines` each re-appended with `<br>`, no stanza gaps (Decision A); `extract-v2-golap.mjs` and its integration test are retired (deleted, noted in CHANGELOG); integration test runs the script against the `.md` file, reads the committed `ART-010-item.md`, asserts 17 `<br>`-terminated lines in the body, the four-line example verbatim, fingerprint matches the `.md` SHA-256.
  - Files: `05_WEBSITE/scripts/extract-v4-golap.mjs`, `05_WEBSITE/src/content/articles/ART-010-item.md`, `05_WEBSITE/tests/integration/extract-v4-golap.test.mjs`, `05_WEBSITE/package.json` (`extract:v4-golap`), remove `05_WEBSITE/scripts/extract-v2-golap.mjs` and `tests/integration/extract-v2-golap.test.mjs`

- [ ] Task 7: Verse rendering on web and print (P0)
  - Acceptance: hard breaks in the Markdown body render as `<br>` (markdown-it default; asserted by test); a CSS-only rule `.prose p:has(br)` (site and print) forces left alignment, normal line-height and no hyphenation so verse never justifies — no template or manifest change for `ART-010`; the built site test counts exactly 17 `<br>`-separated lines inside `#ART-010 .prose` and finds the four-line example as four consecutive lines.
  - Files: `05_WEBSITE/src/assets/css/site.css`, `05_WEBSITE/src/assets/css/print.css`, `05_WEBSITE/scripts/test-site.mjs`

- [ ] Task 8: PDF poem-page test (P0)
  - Acceptance: `tests/e2e/print-poem-page.test.mjs` builds nothing itself (requires `npm run pdf`), locates the `ART-010` page(s) with `pdftotext -layout`, asserts the 17 lines appear in source order each on its own text line, the four-line example is four consecutive lines, and no line is split or merged; wired as `test:e2e:poem`.
  - Files: `05_WEBSITE/tests/e2e/print-poem-page.test.mjs`, `05_WEBSITE/package.json`

## Stream C — Advertisements (two text-only pages and one memorial)

- [ ] Task 9: Manifest schema — `presentation` and `text_lines` with validator rules (P0, Decision E)
  - Acceptance: `config.advertisementPage.presentations = ["artwork","text","memorial"]`; `validateAdvertisementPresentation` (failing tests first): `artwork` keeps the v3 title rule; `text` requires `text_lines` of exactly one line and `title === text_lines[0]`, forbids assets; `memorial` requires ≥ 3 lines, `title === lines[0] + " " + lines[1]`, and both assets; every kind forbids a title ending with "Advertisement"; `artwork` forbids `text_lines`; unit tests cover each rule with positive and negative cases; `npm run validate` still passes on the current 44 items.
  - Files: `05_WEBSITE/scripts/config.mjs`, `05_WEBSITE/scripts/ad-presentation-core.mjs`, `05_WEBSITE/tests/unit/ad-presentation-core.test.mjs`

- [ ] Task 10: Templates and CSS for text-only pages (P0, Decisions F, G)
  - Acceptance: `index.njk` and `print.njk` branch on `item.presentation`: `text` renders `<p class="ad-text" data-testid="ad-text-{{id}}">{{ text_lines[0] }}</p>` (escaped) instead of a figure; CSS centres it in the tinted box with `clamp(1.9rem,4.5vw,3rem)` on web and 30 pt in print, `max-width: 20ch`, wrapping allowed, ink from `--ad-ink`; a fixture render (Eleventy build of a temp manifest or a Nunjucks render test) proves no `<img>`, exact sentence text, and no other company text on the page.
  - Files: `05_WEBSITE/src/index.njk`, `05_WEBSITE/src/print.njk`, `05_WEBSITE/src/assets/css/site.css`, `05_WEBSITE/src/assets/css/print.css`, `05_WEBSITE/tests/integration/ad-text-render.test.mjs`

- [ ] Task 11: Templates and CSS for the memorial page (P0, Decisions F, G, J)
  - Acceptance: `memorial` renders the kicker `Advertisements · In memoriam · {{id}}`, the figure with the uncropped image (`object-fit: contain`, bounded height, `alt` from manifest, no `target=_blank` link required) followed by `<div class="ad-memorial" data-testid="ad-memorial-{{id}}">` with one `<p>` per `text_lines` entry (name line emphasised), centred, on the tinted page; render test asserts the seven lines in order and exact text, the image element present, and no "With best compliments" wording.
  - Files: `05_WEBSITE/src/index.njk`, `05_WEBSITE/src/print.njk`, `05_WEBSITE/src/assets/css/site.css`, `05_WEBSITE/src/assets/css/print.css`, `05_WEBSITE/tests/integration/ad-memorial-render.test.mjs`

- [ ] Task 12: Normalise the memorial photograph (P0)
  - Acceptance: `scripts/normalize-v4-memorial-image.mjs` (pattern of `normalize-v2-gallery-image.mjs`) writes `src/assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg` (1600×1600, q88) and `…/print/ADV-029-late-shri-bhakta-mohon-mitra-print.jpg` (1687×1687, `withoutEnlargement`, q94); integration test checks dimensions, aspect ratio 1:1 (no crop or distortion), JPEG format, print width ≥ 1,116 px, and that the source file is byte-identical before and after.
  - Files: `05_WEBSITE/scripts/normalize-v4-memorial-image.mjs`, `05_WEBSITE/src/assets/normalized/advertisements/{web,print}/ADV-029-…jpg`, `05_WEBSITE/tests/integration/normalize-v4-memorial-image.test.mjs`, `05_WEBSITE/package.json`

- [ ] Task 13: Manifest entry for `ADV-028` (Balajee), update `ADV-027` (Sarc Epic), add `ADV-029` (memorial) (P0, Decisions C, D, E, F)
  - Acceptance: `scripts/add-v4-manifest-items.mjs` (pattern of `add-v3-manifest-items.mjs`, using `buildManifestItemBlock`) appends entries for ADV-027 (Sarc Epic, order 770, `presentation: text`), ADV-028 (Balajee, order 780, `presentation: text`), ADV-029 (memorial, order 790, `presentation: memorial`); ADV-027 is an update to an existing excluded row (status changed to Approved, company updated), ADV-028 and ADV-029 are new; exact `title` and `text_lines`, `page_background: "#f3efe6"`, `page_background_mode: manual`, `page_ink: auto`, source fingerprint for ADV-029, empty assets for the text items, notes recording "text-only; no source artwork supplied"); idempotent (second run is a no-op); `npm run validate` → 0 errors, 47 items, IDs unique; ADV-027 presence verified with updated fields; integration test asserts field-by-field content and that no item other than ADV-027/028/029 changed.
  - Files: `05_WEBSITE/scripts/add-v4-manifest-items.mjs`, `05_WEBSITE/src/_data/publication.yaml`, `05_WEBSITE/tests/integration/add-v4-manifest-items.test.mjs`, `05_WEBSITE/package.json`

- [ ] Task 14: Tracker update: ADV-027 row revised, ADV-028 and ADV-029 rows appended, remark on row 22 (P0, Decisions C, M)
  - Acceptance: pure `tracker-v4-core.mjs` builds the ADV-027 field overrides (Item ID unchanged, Title/Company updated to Sarc Epic, Status Approved, Notes updated) and two new rows for ADV-028 (Balajee) and ADV-029 (memorial); Source File Name `—`/`—`/`Supriyo.JPG`, Received Date `15.09.2026`, Permission `Print and web`, Print Section `Advertisements`, Web Include `Yes`, Print Include `Yes`, Notes verbatim from Changev4 §§4–6 plus the text-only/memorial statements and the row-22 remark ("Sprint v4: revised source received 15.09.2026 (SHA-256 d8160d9b…) replaces … preserved in SUPERSEDED_SOURCES/2026-09-15/"); unit test checks the rows; `scripts/apply-v4-tracker-updates.mjs` snapshots first, appends after `ADV-027`, preserves styles, is idempotent; `npm run tracker:validate` passes; integration test re-reads the workbook.
  - Files: `05_WEBSITE/scripts/tracker-v4-core.mjs`, `05_WEBSITE/scripts/apply-v4-tracker-updates.mjs`, `05_WEBSITE/tests/unit/tracker-v4-core.test.mjs`, `05_WEBSITE/tests/integration/apply-v4-tracker-updates.test.mjs`, `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker.xlsx`, `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/…`, `05_WEBSITE/package.json`

- [ ] Task 15: Derive advertisement counts from the manifest in every test and QA script (P0, Decision K)
  - Acceptance: `tests/e2e/web-ad-cards.test.mjs`, `tests/e2e/print-ad-pages.test.mjs`, `scripts/app-e2e.mjs` (lines asserting 22), `scripts/pdf-qa.mjs`, `scripts/ad-backgrounds-qa.mjs` and any helper counting ads use `readManifest()`; image-load and artwork-distortion assertions apply only to items with `web_asset`; text/memorial cards get their own assertions (exact text present, no `<img>` for text pages, image loaded for the memorial); `npm run build && npm run test:e2e:web-ads && npm run test:e2e:print-ads` pass with 25 published ads and 23 artwork images.
  - Files: `05_WEBSITE/tests/e2e/web-ad-cards.test.mjs`, `05_WEBSITE/tests/e2e/print-ad-pages.test.mjs`, `05_WEBSITE/scripts/app-e2e.mjs`, `05_WEBSITE/scripts/pdf-qa.mjs`, `05_WEBSITE/scripts/ad-backgrounds-qa.mjs`, `05_WEBSITE/scripts/ad-qa-checks-core.mjs`

- [ ] Task 16: Wording and consistency test for the three new items (P0)
  - Acceptance: `tests/integration/v4-advertisements.test.mjs` asserts, for each of ADV-027/028/029: exact approved wording in the manifest, the built home page card, the contents entry, the PDF page text (`pdftotext`) and the tracker row; IDs unique across manifest and tracker; memorial contributors exact; no rendered text of the text-only or memorial pages contains "With best compliments" or "Advertisement" as a title suffix; each text-only sentence appears exactly once on its page; `npm run validate` and `tracker:validate` clean.
  - Files: `05_WEBSITE/tests/integration/v4-advertisements.test.mjs`, `05_WEBSITE/package.json`

## Stream D — Navigation

- [ ] Task 17: `navigation-core` with hermetic unit tests (P0, Decision I)
  - Acceptance: pure `sectionNavigation(items, { labels, hasThanks })` returns `[Contents,#contents]`, then one entry per section in order of first appearance among the given (already published, ordered) items with `href = "#" + firstItem.id`, then `Cultural Programmes`, `Connect`, and `With Thanks` when `hasThanks`; failing-first tests: current manifest shape → 8 entries in the approved order with `#MSG-001`, `#ART-001`, `#GAL-001`, `#ADV-001`; adding two more articles and three more advertisements → still 8; `hasThanks: false` → 7; unknown section label falls back to the raw key.
  - Files: `05_WEBSITE/scripts/navigation-core.mjs`, `05_WEBSITE/tests/unit/navigation-core.test.mjs`

- [ ] Task 18: Wire the `sectionNav` filter into the base layout (P0)
  - Acceptance: `eleventy.config.mjs` exposes `sectionNav(items, hasThanks)` built on the same label map as `sectionLabel`; `base.njk` renders the eight links from it with `data-testid="primary-nav"` on the `<nav>`; built `index.html` has exactly 8 `<nav>` links with the labels once each; `welcome` and `admin` layouts unaffected (`public.njk` has no nav; verified).
  - Files: `05_WEBSITE/eleventy.config.mjs`, `05_WEBSITE/src/_includes/layouts/base.njk`

- [ ] Task 19: Navigation E2E at three widths with screenshots and keyboard check (P0)
  - Acceptance: `tests/e2e/site-navigation.test.mjs` (static server pattern) at 390, 820 and 1440 px: exactly 8 links by role within `[data-testid="primary-nav"]`, labels once each in order, every `href` non-empty and `document.querySelector(href)` non-null, Messages/Articles/Gallery/Advertisements hrefs equal the first published item per section from the manifest, clicking each link scrolls its target into view, no horizontal overflow (`scrollWidth <= clientWidth`), nav does not overlap the brand link (bounding boxes), `Tab` reaches each link with a visible focus style; screenshots `qa-output/navigation/{desktop,tablet,mobile}.png`; wired as `test:e2e:nav`.
  - Files: `05_WEBSITE/tests/e2e/site-navigation.test.mjs`, `05_WEBSITE/package.json`

- [ ] Task 20: Gate and application suites re-run after the layout change (P0)
  - Acceptance: `npm run build`, `test:unit`, `test:integration`, `test:e2e:welcome`, `test:e2e:admin`, `e2e:app` (local) all green with the new nav and the 47-item manifest; `check:secrets` and `check:sql` clean; no file under `api/`, `lib/`, `middleware.ts` changed (`git diff --stat` shows none).
  - Files: none (verification task; record results in TASKS.md completion note)

## Stream E — Release, verification and preview

- [ ] Task 21: `release:v4` and version mapping (P0, Decision L)
  - Acceptance: `stepsForVersion("V4_REVIEW_01")` returns the V3 step list plus the new steps `test:e2e:nav`, `test:e2e:poem`, `test:v4-advertisements` (or their `npm` names) in the tested order; unit test updated; `package.json` gains `release:v4` (`RELEASE_VERSION=V4_REVIEW_01`); reproduction text mentions `unzip`/`pdftotext`.
  - Files: `05_WEBSITE/scripts/release-core.mjs`, `05_WEBSITE/tests/unit/release-core.test.mjs`, `05_WEBSITE/package.json`

- [ ] Task 22: PDF comparison against the Sprint v3 baseline (P0, Decision L)
  - Acceptance: pure `pdf-compare-core.mjs` diffs two arrays of page texts (from `pdftotext`) and classifies each changed page as `contents`, `poem`, `new-item`, `shifted` (same text as a baseline page at another index) or `unexplained`; unit tests; `scripts/pdf-compare.mjs` writes `qa-output/pdf-compare/V3_REVIEW_02-vs-current.{json,md}` and exits non-zero when any page is `unexplained`; run as a release step after `pdf`.
  - Files: `05_WEBSITE/scripts/pdf-compare-core.mjs`, `05_WEBSITE/scripts/pdf-compare.mjs`, `05_WEBSITE/tests/unit/pdf-compare-core.test.mjs`, `05_WEBSITE/scripts/release-core.mjs`, `05_WEBSITE/package.json`

- [ ] Task 23: CHANGELOG and documentation (P0)
  - Acceptance: `CHANGELOG.md` gets a `V4_REVIEW_01` section listing added items (ADV-028/029/030), changed (`ART-010` re-extraction, navigation fix, consolidation moves with hashes, retired `extract-v2-golap`), unchanged counts; `05_WEBSITE/DEPLOYMENT.md` unchanged except a note that `V4` uses the same pipeline; `README.md` section on the intake folder mentions the consolidation date.
  - Files: `CHANGELOG.md`, `05_WEBSITE/README.md`

- [ ] Task 24: Build `V4_REVIEW_01` (P0)
  - Acceptance: `npm run release:v4` completes every gated step (validate, typecheck, unit, build, site, integration, visual, PDF, cover, ad, nav, poem, app E2E, secret and SQL gates, audit gate, PDF compare); `06_FINAL_OUTPUT/V4_REVIEW_01/` contains the site, PDF, QA evidence (nav screenshots, affected PDF page renders), reports, `REPRODUCTION.md`, `release-manifest.json` with 47 items; V0–V3 folders byte-identical to `HEAD` (existing baseline check); committed.
  - Files: `06_FINAL_OUTPUT/V4_REVIEW_01/**`

- [ ] Task 25: Manual browser and PDF verification evidence (P0)
  - Acceptance: with the local dev-app or static server: nav at desktop/tablet/mobile, poem lines, two text pages, memorial page, registration → magazine, protected content after refresh, admin page unaffected; PDF pages for ART-010 and the three new items rendered to PNG at 150 dpi via `pdftoppm` into `qa-output/v4-pages/`; findings recorded for the walkthrough; any defect becomes a new task before Task 26.
  - Files: `05_WEBSITE/qa-output/v4-pages/*.png`, `05_WEBSITE/qa-output/navigation/*.png`

- [ ] Task 26: Preview deployment of `V4_REVIEW_01` for manual approval (P0, Decision N)
  - Acceptance: `vercel deploy` (no `--prod`) from `05_WEBSITE/` at the release commit; `npm run e2e:app -- --base-url <preview> --public-only` passes; test registrations created on the *preview* database are identified and removed; preview URL, commit and results recorded in `sprints/v4/PREVIEW_DEPLOYMENT.md`; nothing promoted; production untouched (verified by `vercel ls` target list).
  - Files: `sprints/v4/PREVIEW_DEPLOYMENT.md`

- [ ] Task 27: `js-yaml`/audit allow-list review (P1)
  - Acceptance: `npm audit --json` gate still `ok` with the unchanged allow-list (`sharp`, `playwright`, `xlsx`); any new finding introduced by this sprint is fixed or explicitly reported, never allow-listed silently.
  - Files: `05_WEBSITE/scripts/audit-allowlist.json` (only if a finding must be documented)

- [ ] Task 28: Retire the `add-v2`/`add-v3` manifest scripts' `v2-incoming` comments and dead code paths (P2)
  - Acceptance: comments and constants referencing the old folder in retired one-shot scripts are updated or the scripts are marked historical in their header; no behavioural change; unit/integration suites green.
  - Files: `05_WEBSITE/scripts/add-v2-manifest-items.mjs`, `05_WEBSITE/scripts/add-v3-manifest-items.mjs`
