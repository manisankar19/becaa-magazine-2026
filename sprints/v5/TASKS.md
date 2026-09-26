# Sprint v5 — Tasks

## Status: In progress — PRD decisions A–N approved as recommended (2026-09-26)

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

- [ ] Task 16: PDF comparison against `V4_REVIEW_02` (P0)
  - Acceptance: `pdf-compare` baseline and corrections selected per version; new `replaced-item` class for `MSG-001` (all its pages, contents title unchanged); `ART-011` byline classed as `correction` via `V5_CORRECTIONS`; unit tests for replaced items and a wrong replacement; real run vs `V4_REVIEW_02` reports 0 unexplained; `--no-corrections` fails as expected. `qa:v5-pages` (or a generalised `qa:v4-pages`) renders contents, `MSG-001` and `ART-011` pages.
  - Files: `05_WEBSITE/scripts/pdf-compare-core.mjs`, `05_WEBSITE/scripts/pdf-compare.mjs`, `05_WEBSITE/scripts/v4-pages-core.mjs`/`render-v4-pages.mjs` (or v5 equivalents), their unit tests, `package.json`

- [ ] Task 17: CHANGELOG, README/DEPLOYMENT notes (P1)
  - Acceptance: `CHANGELOG.md` `V5_REVIEW_01` section (Changed: `MSG-001`, `ART-011`; Removed: `President Desk.docx` from intake, archived; release list gains `test:e2e:hero`); `DEPLOYMENT.md` notes `release:v5` and 47 items.
  - Files: `05_WEBSITE/CHANGELOG.md`, `05_WEBSITE/DEPLOYMENT.md`

- [ ] Task 18: Build `V5_REVIEW_01` (foreground) and update the deployable PDF (P0)
  - Acceptance: `npm run release:v5` all steps green; `06_FINAL_OUTPUT/V5_REVIEW_01/` written (never overwriting); V0–V4 folders byte-identical; release files scanned for local secret values (0 hits); `release-assets/print/BECAA-2026-complete-review.pdf` replaced with the V5 PDF (byte-identical check); committed.
  - Files: `06_FINAL_OUTPUT/V5_REVIEW_01/**`, `05_WEBSITE/release-assets/print/BECAA-2026-complete-review.pdf`

- [ ] Task 19: Manual verification record (P1)
  - Acceptance: `sprints/v5/MANUAL_VERIFICATION.md`: through the local gate at 1440 and 390 px, the new `MSG-001` card and `ART-011` byline checked by eye; PDF renders of `MSG-001` and `ART-011` inspected; findings recorded, not silently fixed.
  - Files: `sprints/v5/MANUAL_VERIFICATION.md`

- [ ] Task 20: Preview deployment — **requires separate explicit approval** [Decision M] (P1)
  - Acceptance: `vercel deploy` (no `--prod`) at the release commit; probes, `e2e:app`, registered content check (new `MSG-001`, `ART-011` byline, PDF byte-identical to release); test rows cleaned up; recorded in `sprints/v5/PREVIEW_DEPLOYMENT.md`; Production untouched.
  - Files: `sprints/v5/PREVIEW_DEPLOYMENT.md`

- [ ] Task 21: Production deployment — **requires a further explicit approval** [Decision M] (P1)
  - Acceptance: `vercel deploy --prod` per `DEPLOYMENT.md`; probes and `e2e:app --public-only` pass; previous deployment kept for rollback; recorded in `PREVIEW_DEPLOYMENT.md`.
  - Files: `sprints/v5/PREVIEW_DEPLOYMENT.md`

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
