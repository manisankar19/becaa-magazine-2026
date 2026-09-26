# Sprint v5 — Tasks

## Status: Addendum in progress (2026-09-26) — Tasks 1–21 done, `V5_REVIEW_01` in production; addendum Tasks 22–30 (PRD §11) approved, not started

Reference: `sprints/v5/PRD.md`, `sprints/v5/Changev5.md`.
**Decisions:** A–N approved as recommended (2026-09-26). Tasks that depend on a specific decision name it as `[Decision X]`.
Protected: every folder under `06_FINAL_OUTPUT/` (V0–V4), `01_REFERENCE_2025/`, `03_ADVERTISEMENTS/`, `BECAA_Magazine_2026_Master.docx`, the database, migrations, Neon resources, environment variables, every file under `05_WEBSITE/api/`, `lib/`, `middleware.ts`, `db/`, `src/welcome.njk`, `src/admin.njk`, and every file in `02_INCOMING_CONTENT/` except the removal in Task 2 and the correction record in Task 5.
Conventions carried from v4: snapshot before every tracker write (`tracker-io.mjs`); pure logic in a `*-core.mjs` module with a hermetic unit test written first (red before green); scripts that touch real files get an integration test; text edits only through `text-correction-core` (count-guarded, code-point exact); `semgrep --config auto --quiet --error` on changed files and `npm audit` before each commit; one commit per task; long pipelines in the foreground.
Session handoff: as in Sprint v4 — every `/dev` session appends a dated `## Session log` entry (completed tasks, commits, changed files, test results, unresolved issues, next task).

## Stream A — Intake (P0)

- [x] Task 1: Archive the superseded President's message (P0)
  - Acceptance: `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/President Desk.docx` exported from `HEAD` with `git show` is byte-identical (SHA-256 `c9f5d073f3b7…`); `README.md` in the 2026-09-15 format records old/new SHA-256 (`67d8a418…`), reason and published item `MSG-001`; `superseded-sources.test.mjs` extended and passing (red first).
  - Files: `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/{President Desk.docx,README.md}`, `05_WEBSITE/tests/integration/superseded-sources.test.mjs`
  - Completed: 2026-09-26 — archive exported with `git show HEAD:` (SHA-256 `c9f5d073…` verified); README written; test extended, red (README missing) then green. Committed with Task 2 as the intake commit.

- [x] Task 2: Intake commit — add the new source, remove the old one [Decision G] (P0)
  - Acceptance: `git rm "02_INCOMING_CONTENT/President Desk.docx"`; the new DOCX (SHA-256 `67d8a418…`) and `sprints/v5/` committed together with Task 1's archive; `git status` clean; no other file under `02_INCOMING_CONTENT/` changed. (The build still reads the old path until Task 7; `validate` fingerprint warnings, if any, are recorded in the session log.)
  - Files: `02_INCOMING_CONTENT/*` (add/remove only), `sprints/v5/*`
  - Completed: 2026-09-26 — `President Desk.docx` removed with `git rm`; new DOCX, archive, test and `sprints/v5/` committed together. `validate` passes, 47 items, 7 warnings (all pre-existing low-resolution print assets; none about MSG-001).

## Stream B — `MSG-001` replacement (P0)

- [x] Task 3: Opt-in list mode in `docxHtmlToParagraphText` [Decision E] (P0)
  - Acceptance: `docxHtmlToParagraphText(html, { lists: true })` renders consecutive `<li>` items as one block of `- item` lines (entities decoded, images stripped); without the option the output is byte-identical to today for existing fixtures, including `MSG-003`'s; unit tests written first.
  - Files: `05_WEBSITE/scripts/article-markdown-core.mjs`, `05_WEBSITE/tests/unit/article-markdown-core.test.mjs`
  - Completed: 2026-09-26 — `{ lists: true }` option added (soft break inside an item is kept as a hard break with an indented continuation). 5 unit tests written first, red, then green; default mode proven identical for all 6 fixtures (incl. an `MSG-003`-shaped one), and re-running the v3 `MSG-003`/`ART-012` extractors left both files unchanged. `test:unit` green; semgrep clean; `npm audit` 3 allow-listed highs (playwright, sharp, xlsx).

- [x] Task 4: `extract-v5-president-desk.mjs` and its integration test [Decisions A, B, F] (P0)
  - Acceptance: refuses to run unless the source SHA-256 is `67d8a418…`; writes `MSG-001-president-desk.md` with front matter `title: "President Desk"`, the new `source_file`/`source_fingerprint`; body = heading `From the President's Desk`, 8 paragraphs (planned as 11; the source has 8), a 4-bullet list, the closing line and the 3-line signature (hard breaks); no `data:` image or `<img>`; idempotent; `npm run extract:v5-president-desk` added. Integration test asserts all of this against the real source.
  - Files: `05_WEBSITE/scripts/extract-v5-president-desk.mjs`, `05_WEBSITE/src/content/messages/MSG-001-president-desk.md`, `05_WEBSITE/tests/integration/extract-v5-president-desk.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-26 — extractor and `extract:v5-president-desk` added; test added to `test:integration`, written first, red (module missing) then green; `MSG-001` content is the extraction output (idempotent). Paragraph count checked against the source: 8 prose paragraphs, not 11 (22 `w:p` = heading, 8 prose, 4 list items, thanks line, signature, 7 empty). Wording as supplied, `CE  87` left for Task 6; `v4-committee-corrections` now fails on `MSG-001` as expected until Task 8. Semgrep clean; `npm audit` 3 allow-listed highs.

- [x] Task 5: v5 correction record and corrections data [Decisions C, D, J] (P0)
  - Acceptance: `02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md` states, per item ID, exact old → new text, count and reason: `MSG-001` signature `CE  87` → `CE ’87` (1), `ART-011` `branch: Civil` → `branch: Mechanical` (1, manifest); lists the §1.1 wording slips as "published as supplied, pending owner review". `scripts/v5-corrections.mjs` mirrors it (`V5_FILE_CORRECTIONS`, `V5_CORRECTIONS`); unit test checks each entry against fixtures with `correctionState`.
  - Files: `02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md`, `05_WEBSITE/scripts/v5-corrections.mjs`, `05_WEBSITE/tests/unit/v5-corrections.test.mjs`
  - Completed: 2026-09-26 — record written (MSG-001 `CE  87` → `CE ’87`, U+2019, count 1; ART-011 anchored four-line manifest find `branch: Civil` → `branch: Mechanical`, count 1, unique in the real manifest; nine §1.1 slips quoted verbatim as published as supplied); `v5-corrections.mjs` mirrors it; unit test red (module missing) then green, added to `test:unit`. No working file changed (Tasks 6 and 10 apply). semgrep clean; `npm audit` 3 allow-listed highs.

- [x] Task 6: Apply v5 corrections script; apply the `MSG-001` signature fix (P0)
  - Acceptance: `npm run corrections:apply-v5 [-- --only ID]` (same safeguards as the v4 script: paths inside `05_WEBSITE/`, pending/applied/stop) applies `MSG-001` only in this task; re-run reports `already applied`; signature reads `CE ’87`; integration test proves the file equals Task 4's extraction plus only this substitution.
  - Files: `05_WEBSITE/scripts/apply-v5-corrections.mjs`, `05_WEBSITE/tests/integration/apply-v5-corrections.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-26 — `scripts/apply-v5-corrections.mjs` (reuses the v4 applier with `V5_FILE_CORRECTIONS`) and `npm run corrections:apply-v5`; MSG-001 signature `CE  87` → `CE ’87` applied, re-run reports `already applied`. Found while doing this: the Task 4 test re-ran the extractor onto the real file and would have undone the correction on every `test:integration` run, so the extractor is split into `buildPresidentDeskMarkdown()` + a writer with an overridable `outputPath`, and the Task 4 test now writes to a temp file. The new integration test proves the real file = extraction + the one recorded substitution; red (module missing) then green.

- [x] Task 7: `MSG-001` manifest update [Decisions A, K] (P0)
  - Acceptance: in `publication.yaml` only `MSG-001`'s `source_file`, `source_fingerprint`, `language: en` and `notes` change (count-guarded line edits); `title`, `alt`, order and all other items unchanged; `npm run validate` 0 errors, 47 items, fingerprint matches the new DOCX.
  - Files: `05_WEBSITE/src/_data/publication.yaml` (and the edit script if one is used)
  - Completed: 2026-09-26 — `MSG-001` `source_file`, `source_fingerprint`, `language` and `notes` changed with three count-guarded edits; title, alt, contributor fields and order unchanged. `language` is `en`, not `english`: `validate` only accepts the manifest's codes (`en`, `bn`, `mixed`), so Decision K's 'English' is recorded as `en` (PRD wording aligned). New `v5-manifest-msg001` integration test red then green; `validate` 0 errors, 47 items, 7 pre-existing warnings.

- [x] Task 8: Retire the Sprint v4 `MSG-001` correction [Decision H] (P0)
  - Acceptance: `MSG-001` marked `superseded` in `v4-corrections.mjs` (reason and date); `apply-v4-committee-corrections` skips it with a message; `v4-committee-corrections.test.mjs` drops its `MSG-001` assertions but keeps all others green; `BECAA Committee Corrections 2026-09-16.md` gets a dated addendum (append only); `pdf-compare` for V4 still works with `--baseline` pointed at V3 for history.
  - Files: `05_WEBSITE/scripts/v4-corrections.mjs`, `05_WEBSITE/scripts/apply-v4-committee-corrections.mjs`, `05_WEBSITE/tests/integration/v4-committee-corrections.test.mjs`, `02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md`
  - Completed: 2026-09-26 — `MSG-001` entries kept and marked `superseded: MSG001_SUPERSEDED` (plus `isSuperseded`/`activeCorrections` helpers); apply script skips them with date and reason, never reading the file; tracker remark (row 16) and `pdf-compare` (V3 baseline) deliberately keep the history; `v4-committee-corrections` drops the `MSG-001` checks, adds the skip check and masks the `MSG-001`/`ART-011` manifest blocks changed by Sprint v5; §11 addendum appended. New unit test `v4-corrections-superseded` red then green; `test:unit` green; build-dependent `v4-committee-corrections` not run here (non-build parts executed via a scratch harness).

- [x] Task 9: Remove live references to `President Desk.docx` [Decision G] (P0)
  - Acceptance: `grep` over `05_WEBSITE/scripts`, `src`, `tests` finds no live reference to the removed file (the Sprint 1 importer `import-content.mjs` gets a `HISTORICAL` header or the new path); a test asserts the absence (allow-listing only historical records outside those folders).
  - Files: `05_WEBSITE/scripts/import-content.mjs`, `05_WEBSITE/tests/integration/v5-source-references.test.mjs`
  - Completed: 2026-09-26 — test written first (red on `import-content.mjs`, `publication.yaml`, `MSG-001` front matter); importer given a `HISTORICAL` header and pointed at the 2026-09-26 archive (not run by any test; it rewrites the manifest, so it was not executed). Test scans `scripts/`, `src/`, `tests/` (197 text files), allow-lists only itself and `superseded-sources.test.mjs`, checks the archive SHA-256; added to `test:integration`. Goes green only after Tasks 4 and 7 rewrite the two `src/` files (verified with a scratch run skipping just those two). semgrep clean.

## Stream C — `ART-011` (P0)

- [x] Task 10: Apply the `ART-011` branch correction [Decision J] (P0)
  - Acceptance: `npm run corrections:apply-v5 -- --only ART-011` changes exactly `branch: Civil` → `branch: Mechanical` under `ART-011`; `ART-011-item.md` untouched; `eleventy-config` unit test (or a render test) shows the byline `Palash Biswas, Mechanical, 2006 Batch`; `validate` passes.
  - Files: `05_WEBSITE/src/_data/publication.yaml`, `05_WEBSITE/tests/unit/eleventy-config.test.mjs`
  - Completed: 2026-09-26 — `npm run corrections:apply-v5` applied ART-011 (`branch: Civil` → `Mechanical`, one anchored count-guarded edit); re-run `already applied`; `ART-011-item.md` untouched. `eleventy-config` unit test gains the real-manifest byline check (red: `Palash Biswas, Civil, 2006 Batch`, then green). The Task 5 unit test assumed the pending state only and failed after the edit; it now accepts pending or applied (exactly one form, only in ART-011's block).

## Stream D — Tracker (P0)

- [x] Task 11: `tracker-v5-core` + apply script for rows 16 and 23 [Decisions I, J] (P0)
  - Acceptance: pure `buildV5TrackerRows` sets row "Item ID 16" `Source File Name` → new DOCX name, `Received Date` → `26.09.2026`, appends a Remarks note; row "Item ID 23" `Branch` → `Mechanical` + Remarks note; existing remarks preserved; unit test first. `npm run tracker:apply-v5` snapshots first, style-preserving write, no-op on re-run; integration test: only those cells changed, 54 rows, 3 sheets; `tracker:validate` passes.
  - Files: `05_WEBSITE/scripts/tracker-v5-core.mjs`, `05_WEBSITE/scripts/apply-v5-tracker-updates.mjs`, `05_WEBSITE/tests/unit/tracker-v5-core.test.mjs`, `05_WEBSITE/tests/integration/apply-v5-tracker-updates.test.mjs`, `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker.xlsx`, `package.json`
  - Completed: 2026-09-26 — unit test red (module missing) then green; `tracker:apply-v5` run on the real tracker (snapshot `BECAA_2026_Content_Tracker_2026-09-26T03-46-43-816Z_pre-v5-tracker-updates.xlsx` committed, as earlier snapshots are); row 16 `President Desk.docx`/`01.08.2026` → new DOCX/`26.09.2026`, row 23 `Civil` → `Mechanical`, remarks appended; integration test green (re-run byte-identical no-op, only those cells changed vs the snapshot); `tracker:validate` 54 rows, 3 sheets; semgrep clean; `npm audit` 3 allow-listed highs.

## Stream E — Verification (P0)

- [x] Task 12: `v5-updates` regression suite (P0)
  - Acceptance: `npm run test:v5-updates` (after `build` + `pdf`) checks, on website, print HTML and PDF text: new `MSG-001` heading, paragraphs, `<ul>` with 4 `<li>` (web) and 4 bullet lines (PDF), 3-line signature with `CE ’87`; no sentence of the archived old message anywhere in `_site/` or the PDF; `ART-011` byline exact, no `Civil` in it; every other item's byline unchanged vs `V4_REVIEW_02`. Added to `test:integration`.
  - Files: `05_WEBSITE/tests/integration/v5-updates.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-26 — `tests/integration/v5-updates.test.mjs` (`npm run test:v5-updates`, also at the end of `test:integration`). Web: title kept, heading, prose samples, one `<ul>` with the 4 items in order, signature `Manik Barman<br>CE ’87<br>President…`, no image; print: 4 `<li>`, signature; PDF: prose, 4 indented list lines (pdftotext drops the CSS bullet), signature on 3 lines. Every paragraph of the archived old message (read with mammoth) plus 4 distinctive phrases absent from website, print HTML and PDF. ART-011 byline exact on all three surfaces, old byline absent; 46 other bylines equal to `V4_REVIEW_02`. Written after Tasks 4–10, so its failing mode was proven by mutation instead: reverting the ART-011 byline, the signature apostrophe or one list item in the built HTML each fails it.

- [x] Task 13: Page-count and hard-coded expectation sweep (P0)
  - Acceptance: after a fresh build and PDF, `print-cover-page` and any other suite with a fixed page count or `MSG-001` page range (`v4-pages-core` fixtures, QA scripts) is updated or derived, with the reason recorded; message print pages visually inspected (list, signature, no overflow).
  - Files: `05_WEBSITE/tests/e2e/print-cover-page.test.mjs`, others as found (listed in the session log)
  - Completed: 2026-09-26 — no change needed. The new message still fits on PDF pp. 5–6, so the PDF stays at 72 pages and `print-cover-page`'s count holds. The PDF-, QA- and browser-dependent suites all pass unchanged against a fresh build + PDF: `test`, `qa`, `qa:v2-items`, `qa:pdf`, `test:e2e:{cover,poem,print-ads,web-ads,nav,hero,welcome,admin}`, `qa:pdf:v2-items`, `qa:ad-backgrounds`, `qa:art006`, `qa:contact`, `qa:v4-pages`, `test:v4-advertisements`, `test:v4-committee-corrections`, `test:v5-updates`. Print pp. 5–6 inspected (list, three-line signature, no overflow). Only `qa:pdf-compare` (V3 baseline) fails, as expected: its sole unexplained pages are MSG-001 (pp. 5–6) and ART-011 (p. 34); Task 16 moves V5 to the `V4_REVIEW_02` baseline.

- [x] Task 14: Full gate re-run (verification only) (P0)
  - Acceptance: `validate`, `tracker:validate`, `typecheck`, `test:unit`, `test:integration` (incl. DB suites), all `test:e2e:*` (incl. `hero`, `nav`), `check:secrets`, `check:sql` green; `git diff 75688c9..HEAD` touches only Sprint v5 files; `06_FINAL_OUTPUT/` unchanged.
  - Files: none (session log only)
  - Completed: 2026-09-26 — fresh `build` + `pdf` (72 pages), then sequentially: `validate` (47 items, 7 pre-existing warnings), `tracker:validate`, `typecheck`, `test:unit`, `test:integration` (39 files incl. the 8 database-backed, local PostgreSQL on 127.0.0.1:5433 / `becaa_test`), all 20 build-dependent suites of Task 13, `e2e:app` (24 steps), `check:secrets`, `check:sql` — all pass. `test:integration` first failed on two historical tests that pinned what Sprint v5 changed on purpose (ART-011's v2 entry; the v4 intake inventory) — fixed with narrow, recorded allowances in their own commit. `git diff 75688c9..HEAD` touches only Sprint v5 files; nothing under `06_FINAL_OUTPUT/`, `01_`, `03_`, `api/`, `lib/`, `middleware.ts`, `db/`, `src/assets`, welcome/admin templates or `release-assets/` changed. semgrep clean; `npm audit` 3 allow-listed highs. Known and expected: `qa:pdf-compare` (V3 baseline) reports exactly MSG-001 pp. 5–6 and ART-011 p. 34 as unexplained until Task 16.

## Stream F — Build and release (P0/P1)

- [x] Task 15: `V5_STEPS` and `release:v5` [Decision L] (P0)
  - Acceptance: `stepsForVersion("V5_*")` = V4 list + `test:e2e:hero` + `test:v5-updates` (order constraints from v4 respected: `pdf` after `build`, evidence after `qa`); `V4_STEPS` unchanged and asserted; V5 reproduction text; `release:v5` → `V5_REVIEW_01`; release-core unit test first.
  - Files: `05_WEBSITE/scripts/release-core.mjs`, `05_WEBSITE/tests/unit/release-core.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-26 — `stepsForVersion("V5_*")` returns `V5_STEPS`: the V4 order with `qa:pdf-compare` → `qa:pdf-compare:v5` and `qa:v4-pages` → `qa:v5-pages` (added in Task 16), `test:e2e:hero` right after `test:e2e:nav`, `test:v5-updates` right after `test:v4-committee-corrections`; `V4_STEPS` untouched so closed V4 releases stay reproducible. `reproductionMarkdownV5` names `release:v5`, the `V4_REVIEW_02` baseline and `V5_CONTENT_MIGRATION` (`extract:v5-president-desk` → `corrections:apply-v5` → `tracker:apply-v5`). `release:v5` → `V5_REVIEW_01`. release-core unit test red (V5 fell back to the legacy list) then green. Full `test:unit` (32 files) green on Node 22, re-run after the host's Node 22 install vanished mid-task and was reinstalled (see session log).

- [x] Task 16: PDF comparison against `V4_REVIEW_02` (P0)
  - Acceptance: `pdf-compare` baseline and corrections selected per version; new `replaced-item` class for `MSG-001` (all its pages, contents title unchanged); `ART-011` byline classed as `correction` via `V5_CORRECTIONS`; unit tests for replaced items and a wrong replacement; real run vs `V4_REVIEW_02` reports 0 unexplained; `--no-corrections` fails as expected. `qa:v5-pages` (or a generalised `qa:v4-pages`) renders contents, `MSG-001` and `ART-011` pages.
  - Files: `05_WEBSITE/scripts/pdf-compare-core.mjs`, `05_WEBSITE/scripts/pdf-compare.mjs`, `05_WEBSITE/scripts/v4-pages-core.mjs`/`render-v4-pages.mjs` (or v5 equivalents), their unit tests, `package.json`
  - Completed: 2026-09-26 — `pdf-compare-core`: new `replaced-item` class — an item declared replaced is explained only if it exists in both PDFs, differs from the baseline, and its text equals the caller's expected text (case-insensitive, whitespace-free; the PDF kicker is CSS-uppercased); a failed replacement overrides an exact page match. `pdf-compare.mjs` gains profiles: `v4` (default, unchanged; V3 baseline) and `v5` (`npm run qa:pdf-compare:v5`: baseline `V4_REVIEW_02`, `MSG-001` replaced with its expected text taken from the built print HTML and anchored line-by-line to the approved content file, `ART-011` via `V5_CORRECTIONS`). Real run: 72 vs 72 pages — unchanged 69, correction 1 (p. 34), replaced-item 2 (pp. 5–6), 0 unexplained. Proven to fail: `--no-corrections` (ART-011 unexplained), baseline = current (MSG-001 'not replaced'), print HTML drifted from the content (throws). New `qa:v5-pages` (`render-v5-pages.mjs`, reuses `planV4PageRenders`): contents pp. 2–3, MSG-001 pp. 5–6, ART-011 pp. 34–37 at 150 dpi + index.json. Tests: 7 new pdf-compare-core scenarios (red, then green); new `render-v5-pages` integration test (red: module missing; then green; added to `test:integration`); release-core now asserts every V5 step exists in package.json.

- [x] Task 17: CHANGELOG, README/DEPLOYMENT notes (P1)
  - Acceptance: `CHANGELOG.md` `V5_REVIEW_01` section (Changed: `MSG-001`, `ART-011`; Removed: `President Desk.docx` from intake, archived; release list gains `test:e2e:hero`); `DEPLOYMENT.md` notes `release:v5` and 47 items.
  - Files: `05_WEBSITE/CHANGELOG.md`, `05_WEBSITE/DEPLOYMENT.md`
  - Completed: 2026-09-26 — `CHANGELOG.md` gains a `V5_REVIEW_01` section (Changed: MSG-001, ART-011, tracker, v4 MSG-001 correction retired, release list incl. `test:e2e:hero`, deployable PDF; Added: v5 scripts, `qa:pdf-compare:v5` with `replaced-item`, `qa:v5-pages`, tests; Removed: `President Desk.docx` from intake, archived; Unchanged: the other 45 items and the application layer). `05_WEBSITE/DEPLOYMENT.md` gains a Sprint v5 note (`release:v5` in the foreground, 47 items, what to check after registering). Documentation only: no test was written. `release.mjs` copies `DEPLOYMENT.md` into the release, and no test pins either file's text.

- [x] Task 18: Build `V5_REVIEW_01` (foreground) and update the deployable PDF (P0)
  - Acceptance: `npm run release:v5` all steps green; `06_FINAL_OUTPUT/V5_REVIEW_01/` written (never overwriting); V0–V4 folders byte-identical; release files scanned for local secret values (0 hits); `release-assets/print/BECAA-2026-complete-review.pdf` replaced with the V5 PDF (byte-identical check); committed.
  - Files: `06_FINAL_OUTPUT/V5_REVIEW_01/**`, `05_WEBSITE/release-assets/print/BECAA-2026-complete-review.pdf`
  - Completed: 2026-09-26 — `npm run release:v5` at `b7ab7d1` with Node 22.23.2: all 32 steps passed in order (incl. `qa:pdf-compare:v5`: unchanged 69, correction 1, replaced-item 2, 0 unexplained; `qa:v5-pages`: 8 renders; `test:e2e:hero`; `test:v5-updates`; `e2e:app`; `check:secrets` 253 files; `check:sql`; audit gate with the 3 allow-listed packages). `06_FINAL_OUTPUT/V5_REVIEW_01/`: 286 files, 152 MB, 47 items, 72-page PDF (SHA-256 `d982f11e…`). Run as a detached process with its log in the scratchpad, because a foreground call is capped at 10 minutes; it took about 3 minutes. V0–V4 release folders unchanged (no tracked diff). The 286 files were scanned for the literal values of the 5 local secrets: 0 hits. `release-assets/print/BECAA-2026-complete-review.pdf` replaced with the V5 PDF (byte-identical, was `cd1197db…`). Evidence render of MSG-001 p. 5 inspected.

- [x] Task 19: Manual verification record (P1)
  - Acceptance: `sprints/v5/MANUAL_VERIFICATION.md`: through the local gate at 1440 and 390 px, the new `MSG-001` card and `ART-011` byline checked by eye; PDF renders of `MSG-001` and `ART-011` inspected; findings recorded, not silently fixed.
  - Files: `sprints/v5/MANUAL_VERIFICATION.md`
  - Completed: 2026-09-26 — `sprints/v5/MANUAL_VERIFICATION.md`. `_site/` confirmed byte-identical to the release. A throwaway Playwright driver (not committed, as in v4) went through the local dev-app gate against `becaa_test` at 1440 and 390 px: 16/16 checks pass (welcome before registering; 47 items after register + reload; MSG-001 title, byline, heading line, 4 visible bullets, 3-line signature `CE ’87`, no old text; ART-011 byline; hero; no overflow; PDF byte-identical to `V5_REVIEW_01`; PDF 403 and admin login form without a session). Element screenshots inspected by eye. The 2 test registrations were deleted. No defects; two known points recorded (wording as supplied; heading line under the title).

- [x] Task 20: Preview deployment — **requires separate explicit approval** [Decision M] (P1)
  - Acceptance: `vercel deploy` (no `--prod`) at the release commit; probes, `e2e:app`, registered content check (new `MSG-001`, `ART-011` byline, PDF byte-identical to release); test rows cleaned up; recorded in `sprints/v5/PREVIEW_DEPLOYMENT.md`; Production untouched.
  - Files: `sprints/v5/PREVIEW_DEPLOYMENT.md`
  - Completed: 2026-09-26 — Preview `…-1wxfioxpc-…` (`dpl_8SUCuYZZUSfU7XA6pHrxveh2QnKP`) from `c7c9643`; migrations Applied 1 / Pending none. 12/12 unauthenticated probes pass. 5 public files byte-identical to the build. Content check with one registration: served index.html and PDF byte-identical to `V5_REVIEW_01`, new MSG-001, ART-011 byline, hero. `e2e:app --public-only` PASS 14 steps. Admin flow not run on Preview: it would need a Preview credential change, and the admin code is unchanged since v4 and passed locally. Cleanup: 4 `e2e-*` visitors and 3 rate-limit windows removed; the database is back to its starting counts (3/3/0/0). Production untouched. Recorded in `sprints/v5/PREVIEW_DEPLOYMENT.md`.

- [x] Task 21: Production deployment — **requires a further explicit approval** [Decision M] (P1)
  - Acceptance: `vercel deploy --prod` per `DEPLOYMENT.md`; probes and `e2e:app --public-only` pass; previous deployment kept for rollback; recorded in `PREVIEW_DEPLOYMENT.md`.
  - Files: `sprints/v5/PREVIEW_DEPLOYMENT.md`
  - Completed: 2026-09-26 — Production `…-efkqodur5-…` (`dpl_3rDCrfTKqGFLinh4BYpEE6bw5imR`) from `c7c9643`'s `05_WEBSITE/` tree, aliased to `becaa-magazine-2026-portal.vercel.app`; previous `…-3rbvgbgd5-…` kept for rollback. Owner-chosen scope ("checks that leave nothing behind"), because Production environment/database reads were blocked by the session permission policy. 11/11 unauthenticated probes pass (wrong-password login skipped) and 5 public files are byte-identical to `V5_REVIEW_01`. No Production env pull, no database access or migration check (no schema/app change since v4), no registration, no browser suite; the verification wrote nothing. Content behind the gate was verified on Preview with the identical tree. Recorded in `sprints/v5/PREVIEW_DEPLOYMENT.md`.


## Stream H — Addendum: images hidden by ad blockers, tints blocked by the CSP (PRD §11, approved 2026-09-26)

- [x] Task 22: `blocklist-guard-core` + EasyList selector snapshot + `qa:blocklist` [Decision Q] (P0)
  - Acceptance: pure `extractGenericHideSelectors(filterText)` (lines `##.name` / `###name` only; exceptions and domain-specific rules ignored) and `findBlockedTokens(html, selectors)` (every class and id token in the HTML); unit tests first, with fixtures (generic vs domain rules, multi-class attributes, ids). Committed `scripts/data/easylist-generic-hide-selectors.txt`: selector names only, with header comment giving source URL, fetch date and licence (EasyList, GPLv3/CC BY-SA 3.0), and `scripts/refresh-blocklist-snapshot.mjs` to regenerate it. `npm run qa:blocklist` checks `_site/index.html`, `_site/print/index.html`, `_site/welcome/index.html`, `_site/admin/index.html` and fails today on `ad-frame`/`ad-link` (red recorded).
  - Files: `05_WEBSITE/scripts/blocklist-guard-core.mjs`, `scripts/qa-blocklist.mjs`, `scripts/refresh-blocklist-snapshot.mjs`, `scripts/data/easylist-generic-hide-selectors.txt`, `tests/unit/blocklist-guard-core.test.mjs`, `package.json`
  - Completed: 2026-09-26 — `blocklist-guard-core.mjs` (`extractGenericHideSelectors`, `pageTokens`, `findBlockedTokens`; exact-name matching, only site-wide `##.class`/`###id` rules). Snapshot `scripts/data/easylist-generic-hide-selectors.txt` (EasyList 202609261449: 8,841 class + 4,237 id selectors, names only, with source/licence header) written by `refresh-blocklist-snapshot.mjs`. `npm run qa:blocklist` checks index, print, welcome and admin pages. Red on the current build: `.ad-frame`, `.ad-link` in `index.html`; the print page only uses `ad-frame--memorial`, which EasyList doesn't hide. Unit test red (module missing) then green; `test:unit` green; semgrep clean.

- [x] Task 23: Rename `ad-frame`/`ad-link` to `artwork-frame`/`artwork-link` [Decision O] (P0)
  - Acceptance: no `ad-frame`, `ad-frame--memorial` or `ad-link` left in `src/`, `scripts/` or `tests/` (except as history in comments); `index.njk`, `print.njk`, `site.css`, `print.css`, `visual-qa.mjs`, `web-ad-cards` and any other test updated; rendering unchanged (web screenshot and PDF page renders compared before and after); `qa:blocklist` passes; the affected suites pass.
  - Files: `src/index.njk`, `src/print.njk`, `src/assets/css/site.css`, `src/assets/css/print.css`, `scripts/visual-qa.mjs`, `tests/e2e/web-ad-cards.test.mjs` and others as found
  - Completed: 2026-09-26 — `ad-frame`→`artwork-frame`, `ad-frame--memorial`→`artwork-frame--memorial`, `ad-link`→`artwork-link` in `index.njk`, `print.njk`, `site.css`, `print.css`, `visual-qa.mjs` (its screenshot is now `*-artwork-frame.png`) and `web-ad-cards`. That test now also asserts no `.ad-frame`/`.ad-link` elements and that every publication image sits in an `.artwork-frame`; red on the old build (`frame` null), then green. `v4-committee-corrections` pins `site.css` byte for byte, so it maps the new names back before comparing: the exact rename is the only tolerated difference. 6 web cards and 4 PDF pages rendered before and after are pixel-identical. Passing: `qa:blocklist` (was red), `test:e2e:web-ads`, `test`, `test:e2e:print-ads`, `test:v4-committee-corrections`, `test:v5-updates`, `qa`. semgrep clean.

- [x] Task 24: Serve tests under the production CSP; CSP-violation check [Decision Q] (P0)
  - Acceptance: `tests/e2e/static-server.mjs` sends the headers from `vercel.json` (read at start, not copied by hand), so every page test runs under the real CSP. New `test:e2e:csp` opens `/` (registered view via the static `_site/index.html`), `/welcome/` and `/admin/` at 1440 px and fails on any `securitypolicyviolation` event or CSP console error. Red first: it reports the inline-style violations on the current build.
  - Files: `tests/e2e/static-server.mjs`, `tests/e2e/csp.test.mjs`, `package.json`
  - Completed: 2026-09-26 — `tests/e2e/static-server.mjs` sends the headers `vercel.json` gives production, read from the file by prefix rules (`/(.*)`, `/admin/(.*)`); unsupported forms throw. semgrep flagged a dynamic RegExp and `Object.assign` in the first version, so it now uses plain prefix matching. New `test:e2e:csp` checks `/`, `/welcome/` and `/admin/` for any `securitypolicyviolation` or CSP console error, with screenshots in `qa-output/csp/`. Red first (no CSP header), then red for the real reason: 46 refused inline `style` attributes on `/` (25 advertisement tints + 21 ART-006 table cells); `/welcome/` and `/admin/` are clean. `web-ad-cards`, `ad-backgrounds-qa` and `visual-qa` moved from file:// to this server. `web-ad-cards` now fails as production behaves (`ADV-001: frame background is the manifest colour`), and `test:e2e:csp` fails until Task 25. `test:e2e:hero`/`nav` injected a `<style>` tag the CSP refuses; they now set `scroll-behavior` through the CSSOM and pass. `qa`, `qa:ad-backgrounds` and `test:e2e:welcome` pass. semgrep clean.

- [ ] Task 25: Advertisement tints from a generated stylesheet [Decision P] (P0)
  - Acceptance: an Eleventy template writes `assets/css/ad-tints.css`, one rule per advertisement with a tint, using the same resolution as `adPageStyle`/`adInkClass` (shared helper, unit-tested); `index.njk` has no `style=` attribute; `base.njk` links `ad-tints.css`; `print.njk` unchanged. Scope note (found in Task 24): the Markdown renderer writes table-column alignment as `style="text-align:right"` (21 cells in ART-006), which the CSP also refuses — the renderer emits alignment classes instead, styled in `site.css` and `print.css` (the PDF must look the same). Under the production CSP, `web-ad-cards` asserts each card header's computed background equals its manifest `page_background` and the ink class is unchanged; `test:e2e:csp` goes green.
  - Files: `src/ad-tints.css.njk` (or `.11ty.js`), `src/index.njk`, `src/_includes/layouts/base.njk`, `eleventy.config.mjs`, `tests/e2e/web-ad-cards.test.mjs`, `tests/unit/eleventy-config.test.mjs`

- [ ] Task 26: Ad-blocker simulation test and gate re-run (P0)
  - Acceptance: new `test:e2e:blocker` loads the page and injects the snapshot's generic hide rules for every class and id the page uses (via CSS in a CSP-bypassed test context); asserts all 30 publication images are still visible (non-zero rendered box) at 1440 and 390 px, with screenshots. Red on the old class names (checked against the pre-Task-23 build), then green. Full gate re-run (`validate`, `test:unit`, `test:integration`, all browser, PDF and QA suites, `e2e:app`, `check:secrets`, `check:sql`) green; the PDF text is identical to `V5_REVIEW_01`'s.
  - Files: `tests/e2e/ad-blocker.test.mjs`, `package.json`

- [ ] Task 27: `release:v5:02` and `V5_REVIEW_02` [Decision S] (P0)
  - Acceptance: `V5_STEPS` gains `qa:blocklist`, `test:e2e:csp` and `test:e2e:blocker` (release-core unit test updated first); `release:v5:02` → `V5_REVIEW_02`; `CHANGELOG.md` section; built in the foreground or detached with an exit-code waiter; all steps green; `qa:pdf-compare:v5` classes equal `V5_REVIEW_01`'s; `V5_REVIEW_01` and earlier folders unchanged; no local secret values in the output; `release-assets/print/` PDF replaced only if its bytes differ.
  - Files: `scripts/release-core.mjs`, `tests/unit/release-core.test.mjs`, `package.json`, `CHANGELOG.md`, `06_FINAL_OUTPUT/V5_REVIEW_02/**`

- [ ] Task 28: Manual verification addendum (P1)
  - Acceptance: `sprints/v5/MANUAL_VERIFICATION.md` addendum: local gate at 1440/390 px with and without the injected blocker rules (images visible, tints shown, no CSP errors); screenshots inspected.
  - Files: `sprints/v5/MANUAL_VERIFICATION.md`

- [ ] Task 29: Preview deployment of `V5_REVIEW_02` — **requires the owner's explicit go-ahead** (P1)
  - Acceptance: as Task 20, plus on Preview: images visible, tints computed from the stylesheet, no CSP violations, and images still visible with the blocker rules injected; test records removed; recorded in `PREVIEW_DEPLOYMENT.md`.
  - Files: `sprints/v5/PREVIEW_DEPLOYMENT.md`

- [ ] Task 30: Production deployment of `V5_REVIEW_02` — **requires a further explicit go-ahead** (P1)
  - Acceptance: as Task 21 (checks that leave nothing behind unless Production reads are permitted), plus `ad-tints.css` and `site.css` served byte-identical to the build; previous deployment kept for rollback; recorded; walkthrough updated.
  - Files: `sprints/v5/PREVIEW_DEPLOYMENT.md`, `sprints/v5/WALKTHROUGH.md`

## Session log

### 2026-09-26 — Tasks 1–2
- **Completed task(s):** Task 1 (archive the superseded President's message), Task 2 (intake commit). Done in one session because the approved commit plan (Decision N) makes them one intake commit.
- **Commit:** the intake commit `feat(v5): Tasks 1-2 — intake …` (hash in `git log`).
- **Changed files:** `02_INCOMING_CONTENT/President Desk.docx` (removed), `02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx` (added), `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/{President Desk.docx,README.md}`, `05_WEBSITE/tests/integration/superseded-sources.test.mjs`, `sprints/v5/{Changev5.md,PRD.md,TASKS.md}`.
- **Test results:** `superseded-sources.test.mjs` red (README missing) then green (3 archive checks OK); `validate` passes (47 items, 7 pre-existing warnings); semgrep clean on the changed test; `npm audit` 3 high (the allow-listed `playwright`, `sharp`, `xlsx`, unchanged).
- **Unresolved issues:** `MSG-001` still points at the removed `President Desk.docx` in `publication.yaml` and its front matter until Tasks 4 and 7; `validate` does not check source-file existence, so the build is unaffected meanwhile. No `Claude-Session:` trailer added (project convention).
- **Next task:** Task 3 (list mode in `docxHtmlToParagraphText`).

### 2026-09-26 — Tasks 3–14 (parallel agents + coordinator)
- **Completed task(s):** 3–14. Tasks 3→4, 5, 8–9 and 11 were done by four agents in isolated worktrees and cherry-picked onto `main`; the coordinator did 6, 7, 10, 12, 13, 14.
- **Commits:** `b248531` (3), `cd15923` (4), `34cc303` (5), `40ee350` (11), `d588c7f` (6), `cb4a8b5` (7), `27a23ce` (8), `eb74dea` (9), `b8a97d1` (allow-list fix), `098322f` (10), `c5e1ac0` (12), `1b77b9b` (13), `11bd2b4` (historical-test fixes), `8b8164b` (14).
- **Changed files:** see `sprints/v5/WALKTHROUGH.md` (40 files vs `75688c9`). Deviations from declared file lists: Task 6 also changed the Task 4 extractor and its test (the test overwrote the corrected file); Task 10 also fixed the Task 5 unit test (assumed the pending state only); Task 14 fixed `add-v2-manifest-items` and `incoming-consolidation` tests and extended the `v5-source-references` allow-list.
- **Test results:** `validate`, `tracker:validate`, `typecheck`, `test:unit` (32 files), `test:integration` (39 files, 8 DB-backed), 20 build/PDF/browser suites, `e2e:app` (24 steps), `check:secrets`, `check:sql` — all pass. `qa:pdf-compare` (V3 baseline) fails as expected on MSG-001 pp. 5–6 and ART-011 p. 34 only.
- **Unresolved issues:** Decision K recorded as `language: en` (the manifest's code), PRD aligned; PRD "11 paragraphs" corrected to 8; the author's wording slips await owner review (owner correction record §3).
- **Next task:** Task 15 (`V5_STEPS` and `release:v5`), then 16 before any release build.

### 2026-09-26 — Tasks 15–18
- **Completed task(s):** 15 (`V5_STEPS`, `release:v5`), 16 (PDF comparison against `V4_REVIEW_02`, `qa:v5-pages`), 17 (CHANGELOG, DEPLOYMENT), 18 (`V5_REVIEW_01`, deployable PDF).
- **Commits:** `a70d2da` (15), `8ae16b9` (16), `b7ab7d1` (17), `21c1201` (18), `af3386b` (follow-up: `’` escape in `v5-corrections.mjs`), then the walkthrough update.
- **Changed files:** as declared, plus `tests/integration/render-v5-pages.test.mjs` (Task 16) and the follow-up fix.
- **Test results:** release pipeline 32/32 steps green at `b7ab7d1`; `qa:pdf-compare:v5` unchanged 69, correction 1, replaced-item 2, unexplained 0; `test:unit` 32 files and `test:integration` 40 files green on Node 22.23.2; semgrep clean; `npm audit` 3 allow-listed.
- **Unresolved issues:** the host's Node 22 (`~/.hermes/node`) vanished during Task 15. The Task 15 commit was first written with an unverified "test:unit green" claim; it was amended before any push. With the owner's approval Node v22.23.2 was reinstalled to `~/.local/node-v22` (SHA-256 verified). The release ran as a detached process because foreground calls are capped at 10 minutes. Preview/Production not run, as instructed.
- **Next task:** Task 19 (manual verification record); Tasks 20–21 need explicit deployment approval.

### 2026-09-26 — Tasks 19–21
- **Completed task(s):** 19 (manual verification), 20 (Preview), 21 (Production).
- **Commits:** `c7c9643` (19), `0ff7e60` (20), then the Task 21 record.
- **Changed files:** `sprints/v5/MANUAL_VERIFICATION.md`, `sprints/v5/PREVIEW_DEPLOYMENT.md`, `sprints/v5/TASKS.md`. The throwaway Playwright/probe/cleanup drivers were kept out of the repository, as in v4.
- **Test results:**
  - local gate: 16/16 checks at 1440 and 390 px;
  - Preview: probes 12/12, public files byte-identical, content check passed, `e2e:app --public-only` 14 steps;
  - Production: probes 11/11 (wrong password skipped), public files byte-identical.
- **Unresolved issues:**
  - Production reads (environment pull, database) were blocked by the session permission policy, so the owner chose deploy-with-no-trace checks. Production content behind the gate was not opened, and the migration status was not read there (no schema change).
  - The admin flow was not run on either deployment; it passed locally.
  - Deployment records are committed locally; push when wanted.
- **Next task:** none in Sprint v5. Open owner decisions: the wording slips (owner correction record §3) and the review-era front-page wording.
