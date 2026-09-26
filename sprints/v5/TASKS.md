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
  - Acceptance: refuses to run unless the source SHA-256 is `67d8a418…`; writes `MSG-001-president-desk.md` with front matter `title: "President Desk"`, the new `source_file`/`source_fingerprint`; body = heading `From the President's Desk`, 11 paragraphs, a 4-bullet list, the closing line and the 3-line signature (hard breaks); no `data:` image or `<img>`; idempotent; `npm run extract:v5-president-desk` added. Integration test asserts all of this against the real source.
  - Files: `05_WEBSITE/scripts/extract-v5-president-desk.mjs`, `05_WEBSITE/src/content/messages/MSG-001-president-desk.md`, `05_WEBSITE/tests/integration/extract-v5-president-desk.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-26 — extractor and `extract:v5-president-desk` added; test added to `test:integration`, written first, red (module missing) then green; `MSG-001` content is the extraction output (idempotent). Paragraph count checked against the source: 8 prose paragraphs, not 11 (22 `w:p` = heading, 8 prose, 4 list items, thanks line, signature, 7 empty). Wording as supplied, `CE  87` left for Task 6; `v4-committee-corrections` now fails on `MSG-001` as expected until Task 8. Semgrep clean; `npm audit` 3 allow-listed highs.

- [ ] Task 5: v5 correction record and corrections data [Decisions C, D, J] (P0)
  - Acceptance: `02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md` states, per item ID, exact old → new text, count and reason: `MSG-001` signature `CE  87` → `CE ’87` (1), `ART-011` `branch: Civil` → `branch: Mechanical` (1, manifest); lists the §1.1 wording slips as "published as supplied, pending owner review". `scripts/v5-corrections.mjs` mirrors it (`V5_FILE_CORRECTIONS`, `V5_CORRECTIONS`); unit test checks each entry against fixtures with `correctionState`.
  - Files: `02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md`, `05_WEBSITE/scripts/v5-corrections.mjs`, `05_WEBSITE/tests/unit/v5-corrections.test.mjs`

- [ ] Task 6: Apply v5 corrections script; apply the `MSG-001` signature fix (P0)
  - Acceptance: `npm run corrections:apply-v5 [-- --only ID]` (same safeguards as the v4 script: paths inside `05_WEBSITE/`, pending/applied/stop) applies `MSG-001` only in this task; re-run reports `already applied`; signature reads `CE ’87`; integration test proves the file equals Task 4's extraction plus only this substitution.
  - Files: `05_WEBSITE/scripts/apply-v5-corrections.mjs`, `05_WEBSITE/tests/integration/apply-v5-corrections.test.mjs`, `05_WEBSITE/package.json`

- [ ] Task 7: `MSG-001` manifest update [Decisions A, K] (P0)
  - Acceptance: in `publication.yaml` only `MSG-001`'s `source_file`, `source_fingerprint`, `language: english` and `notes` change (count-guarded line edits); `title`, `alt`, order and all other items unchanged; `npm run validate` 0 errors, 47 items, fingerprint matches the new DOCX.
  - Files: `05_WEBSITE/src/_data/publication.yaml` (and the edit script if one is used)

- [ ] Task 8: Retire the Sprint v4 `MSG-001` correction [Decision H] (P0)
  - Acceptance: `MSG-001` marked `superseded` in `v4-corrections.mjs` (reason and date); `apply-v4-committee-corrections` skips it with a message; `v4-committee-corrections.test.mjs` drops its `MSG-001` assertions but keeps all others green; `BECAA Committee Corrections 2026-09-16.md` gets a dated addendum (append only); `pdf-compare` for V4 still works with `--baseline` pointed at V3 for history.
  - Files: `05_WEBSITE/scripts/v4-corrections.mjs`, `05_WEBSITE/scripts/apply-v4-committee-corrections.mjs`, `05_WEBSITE/tests/integration/v4-committee-corrections.test.mjs`, `02_INCOMING_CONTENT/BECAA Committee Corrections 2026-09-16.md`

- [ ] Task 9: Remove live references to `President Desk.docx` [Decision G] (P0)
  - Acceptance: `grep` over `05_WEBSITE/scripts`, `src`, `tests` finds no live reference to the removed file (the Sprint 1 importer `import-content.mjs` gets a `HISTORICAL` header or the new path); a test asserts the absence (allow-listing only historical records outside those folders).
  - Files: `05_WEBSITE/scripts/import-content.mjs`, `05_WEBSITE/tests/integration/v5-source-references.test.mjs`

## Stream C — `ART-011` (P0)

- [ ] Task 10: Apply the `ART-011` branch correction [Decision J] (P0)
  - Acceptance: `npm run corrections:apply-v5 -- --only ART-011` changes exactly `branch: Civil` → `branch: Mechanical` under `ART-011`; `ART-011-item.md` untouched; `eleventy-config` unit test (or a render test) shows the byline `Palash Biswas, Mechanical, 2006 Batch`; `validate` passes.
  - Files: `05_WEBSITE/src/_data/publication.yaml`, `05_WEBSITE/tests/unit/eleventy-config.test.mjs`

## Stream D — Tracker (P0)

- [ ] Task 11: `tracker-v5-core` + apply script for rows 16 and 23 [Decisions I, J] (P0)
  - Acceptance: pure `buildV5TrackerRows` sets row "Item ID 16" `Source File Name` → new DOCX name, `Received Date` → `26.09.2026`, appends a Remarks note; row "Item ID 23" `Branch` → `Mechanical` + Remarks note; existing remarks preserved; unit test first. `npm run tracker:apply-v5` snapshots first, style-preserving write, no-op on re-run; integration test: only those cells changed, 54 rows, 3 sheets; `tracker:validate` passes.
  - Files: `05_WEBSITE/scripts/tracker-v5-core.mjs`, `05_WEBSITE/scripts/apply-v5-tracker-updates.mjs`, `05_WEBSITE/tests/unit/tracker-v5-core.test.mjs`, `05_WEBSITE/tests/integration/apply-v5-tracker-updates.test.mjs`, `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker.xlsx`, `package.json`

## Stream E — Verification (P0)

- [ ] Task 12: `v5-updates` regression suite (P0)
  - Acceptance: `npm run test:v5-updates` (after `build` + `pdf`) checks, on website, print HTML and PDF text: new `MSG-001` heading, paragraphs, `<ul>` with 4 `<li>` (web) and 4 bullet lines (PDF), 3-line signature with `CE ’87`; no sentence of the archived old message anywhere in `_site/` or the PDF; `ART-011` byline exact, no `Civil` in it; every other item's byline unchanged vs `V4_REVIEW_02`. Added to `test:integration`.
  - Files: `05_WEBSITE/tests/integration/v5-updates.test.mjs`, `05_WEBSITE/package.json`

- [ ] Task 13: Page-count and hard-coded expectation sweep (P0)
  - Acceptance: after a fresh build and PDF, `print-cover-page` and any other suite with a fixed page count or `MSG-001` page range (`v4-pages-core` fixtures, QA scripts) is updated or derived, with the reason recorded; message print pages visually inspected (list, signature, no overflow).
  - Files: `05_WEBSITE/tests/e2e/print-cover-page.test.mjs`, others as found (listed in the session log)

- [ ] Task 14: Full gate re-run (verification only) (P0)
  - Acceptance: `validate`, `tracker:validate`, `typecheck`, `test:unit`, `test:integration` (incl. DB suites), all `test:e2e:*` (incl. `hero`, `nav`), `check:secrets`, `check:sql` green; `git diff 75688c9..HEAD` touches only Sprint v5 files; `06_FINAL_OUTPUT/` unchanged.
  - Files: none (session log only)

## Stream F — Build and release (P0/P1)

- [ ] Task 15: `V5_STEPS` and `release:v5` [Decision L] (P0)
  - Acceptance: `stepsForVersion("V5_*")` = V4 list + `test:e2e:hero` + `test:v5-updates` (order constraints from v4 respected: `pdf` after `build`, evidence after `qa`); `V4_STEPS` unchanged and asserted; V5 reproduction text; `release:v5` → `V5_REVIEW_01`; release-core unit test first.
  - Files: `05_WEBSITE/scripts/release-core.mjs`, `05_WEBSITE/tests/unit/release-core.test.mjs`, `05_WEBSITE/package.json`

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
