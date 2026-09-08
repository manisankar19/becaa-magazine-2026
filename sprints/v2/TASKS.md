# Sprint v2 — Tasks

## Status: Not Started

Reference: `sprints/v2/PRD.md`, `sprints/v2/MATERIAL_CHANGE_REGISTER.md`
Protected: `06_FINAL_OUTPUT/V1_COMPLETE_REVIEW_03` and all earlier output folders — no task may modify them. `02_INCOMING_CONTENT` (including `v2-incoming/`), `03_ADVERTISEMENTS`, `01_REFERENCE_2025`, and the addendum workbook are read-only inputs for every task.

- [x] Task 1: Back up and merge addendum tracker rows into the main tracker (P0)
  - Acceptance: A timestamped copy of `BECAA_2026_Content_Tracker.xlsx` exists in `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/` dated before the edit; the live tracker's `Content Tracker` sheet gains 5 new rows (Item IDs 20–24) appended verbatim from the addendum, with all 47 existing rows, their IDs, and formatting unchanged; `COV-001`'s `Source File Name` is updated to reference `cover page new.png` while the prior value is preserved in `Remarks`; `Lists` and `Instructions` sheets untouched.
  - Files: `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker.xlsx`, `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/BECAA_2026_Content_Tracker_2026-09-08T05-13-52-736Z_pre-v2-merge.xlsx`, `05_WEBSITE/scripts/tracker-merge-core.mjs`, `05_WEBSITE/scripts/merge-v2-addendum-tracker.mjs`, `05_WEBSITE/tests/unit/tracker-merge-core.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Implemented pure `mergeAddendumRows()` (TDD: red → green, 3 unit tests covering happy path + both duplicate-ID cases) plus a real I/O script following the existing `update-tracker-review-03.mjs` style-preservation convention. Ran against the live tracker: 47→52 rows, 0 duplicate IDs, all 46 non-cover pre-existing rows verified byte-identical, `Lists`/`Instructions` sheets verified byte-identical, `COV-001` updated with full SHA-256 audit trail in Remarks. `semgrep --config auto` clean (0 findings) on all 3 new files. `npm audit` surfaced 7 pre-existing dependency vulnerabilities (not introduced by this task, no dependencies changed) — logged as Task 18 below rather than bundled into this change.

- [x] Task 2: Record Items 20 and 24 as excluded in the tracker with no manifest impact (P0)
  - Acceptance: Rows for Item ID 20 (Sudipta Chakraborty — source file not found) and Item ID 24 (Siddhartha Mukhopadhyay — placeholder content, permission pending) carry a clear excluded/awaiting status; neither item appears anywhere in `publication.yaml`, the built website, or the PDF after this sprint.
  - Files: `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker.xlsx`, `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/BECAA_2026_Content_Tracker_2026-09-08T06-20-38-569Z_pre-v2-exclusions.xlsx`, `05_WEBSITE/scripts/tracker-exclusion-core.mjs`, `05_WEBSITE/scripts/apply-v2-exclusions.mjs`, `05_WEBSITE/tests/unit/tracker-exclusion-core.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Implemented pure `applyExclusionDecisions()` (TDD: red → green, 3 unit tests: targeted-rows-only, remarks-append-not-overwrite, empty-decisions-is-no-op) plus a real I/O script with its own pre-mutation backup. Ran against the live tracker: Item 20 and Item 24 now carry `Web Include: No`, `Print Include: No`, a clear `Excluded – …` Status, and a Remarks note explaining why (source file never delivered / placeholder content + pending permission). Verified by diffing against the pre-exclusion backup: only rows 20 and 24 changed, all other 50 rows, `Lists`, and `Instructions` byte-identical, 0 duplicate IDs. Manifest/website/PDF are unaffected since these items were never added to `publication.yaml` (Task 1 only touched the tracker). `semgrep --config auto` clean (0 findings). `npm audit` unchanged at 7 pre-existing findings (still tracked as Task 18, no dependency touched by this task). Noted but out of scope: `validate-tracker.mjs` still hardcodes `rows.length !== 47`, now stale after Task 1's merge to 52 — belongs to Task 9.

- [x] Task 3: Normalize the replacement cover asset (P0)
  - Acceptance: `cover page new.png` is copied into `05_WEBSITE/src/assets/normalized/cover/` with embedded Canva XMP/EXIF metadata (author name, document/user IDs) stripped; output dimensions remain 1240×1748 at 300 DPI (no resize/recrop/recolor); the pre-existing `Cover page.jpg` in the same directory is left untouched.
  - Files: `05_WEBSITE/src/assets/normalized/cover/cover page new.png`, `05_WEBSITE/scripts/normalize-cover-core.mjs`, `05_WEBSITE/scripts/normalize-v2-cover.mjs`, `05_WEBSITE/tests/integration/normalize-cover-core.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Verified empirically that `sharp(input).png().toBuffer()` with no `withMetadata()` call preserves pixel dimensions and DPI density while dropping EXIF/XMP by default; implemented `normalizeCoverBuffer()` on that basis (TDD: red → green on the real source file). Output confirmed 1240×1748 @ 300 DPI, no "Manisankar" or "Canva" strings present in the output bytes (previously present in source EXIF/XMP). `Cover page.jpg` confirmed byte-identical (untouched) after the run. Test placed under `tests/integration/` (real file I/O against the actual v2-incoming source, not a hermetic unit test). Security: semgrep clean, npm audit unchanged at 7 pre-existing findings.

- [x] Task 4: Update `publication.yaml` cover entry (P0)
  - Acceptance: `COV-001`'s `source_file`, `asset`, and `source_fingerprint` fields point to the new cover and its SHA-256; the `id` and `title` are unchanged; the manifest still validates as well-formed YAML.
  - Files: `05_WEBSITE/src/_data/publication.yaml`, `05_WEBSITE/scripts/update-v2-cover-manifest.mjs`, `05_WEBSITE/tests/integration/cover-manifest-entry.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Targeted 3-line string replacement (not a full YAML load/dump round-trip, to avoid reformatting the other ~965 lines of the manifest). Confirmed via `git diff` that exactly those 3 lines changed. `id`/`title` unchanged. Re-parsed the file with `js-yaml` after writing to confirm it's still valid. Security: semgrep clean, npm audit unchanged (7 pre-existing).

- [x] Task 5: Extract Shubhra Basu's poem to Markdown (P0)
  - Acceptance: `গোলাপ` text is extracted verbatim (no rewording, no dropped line breaks) from `Shubhra Basu.docx` into a new UTF-8 Markdown file; any unclear extraction is marked with `<!-- NEEDS VERIFICATION: reason -->` rather than silently altered.
  - Files: `05_WEBSITE/src/content/articles/ART-010-item.md`, `05_WEBSITE/scripts/article-markdown-core.mjs`, `05_WEBSITE/scripts/extract-v2-golap.mjs`, `05_WEBSITE/tests/unit/article-markdown-core.test.mjs`, `05_WEBSITE/tests/integration/extract-v2-golap.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Confirmed the project's established convention first (existing ART-003's body is exactly `mammoth.extractRawText().value.trim()`, byte-for-byte) and replicated it. Filename uses the real `slugify()` from `lib.mjs` (Bengali title → "item", matching ART-003/ART-004's existing naming). No `NEEDS VERIFICATION` marker needed — mammoth extraction was clean with 0 warnings and the full text matches the source docx exactly. Tests: 3 unit (hermetic, markdown construction) + 1 integration (real docx extraction). Security: semgrep clean, npm audit unchanged (7 pre-existing).

- [x] Task 6: Extract Palash Biswas's article to Markdown (P0)
  - Acceptance: Full Bengali text of `বেঁচে থাকার লড়াই ও স্বপ্নের পথ` is extracted verbatim into a new UTF-8 Markdown file, text-only (the embedded `word/media/image1.png` is not extracted or referenced per the PRD's default decision); byline reflects "Palash Biswas, Mech 2006".
  - Files: `05_WEBSITE/src/content/articles/ART-011-item.md`, `05_WEBSITE/scripts/extract-v2-palash-article.mjs`, `05_WEBSITE/tests/integration/extract-v2-palash-article.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Reused `buildArticleMarkdown()` from Task 5. Verified: full 5,207-character Bengali text extracted verbatim (matches `mammoth.extractRawText()` exactly), byline "Palash Biswas, Mech 2006" present (embedded in the source text itself), no `<img>` markup or reference to the embedded `word/media/image1.png` introduced. Security: semgrep clean, npm audit unchanged (7 pre-existing).

- [x] Task 7: Normalize the new gallery image (Item 21) (P0)
  - Acceptance: `chatgpt kallol.jpeg` produces deterministic web and print derivatives (`GAL-007-chatgpt-web.jpg`, `GAL-007-chatgpt-print.jpg` or equivalent) under `05_WEBSITE/src/assets/normalized/images/{web,print}/`, aspect ratio preserved, no cropping; rerunning normalization does not create duplicate variants.
  - Files: `05_WEBSITE/src/assets/normalized/images/web/GAL-007-chatgpt-web.jpg`, `05_WEBSITE/src/assets/normalized/images/print/GAL-007-chatgpt-print.jpg`, `05_WEBSITE/scripts/image-normalize-core.mjs`, `05_WEBSITE/scripts/normalize-v2-gallery-image.mjs`, `05_WEBSITE/tests/integration/normalize-v2-gallery-image.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — Extracted the exact resize/quality convention already used for every GAL-/ADV- item in `import-approved.mjs` (web: 1600px/q88, print: 2480px/q94, `withoutEnlargement: true`, 4:4:4 chroma subsampling) into a reusable, tested module rather than duplicating ad hoc settings. Source is 1600×1236 (below both caps), so both derivatives land at 1600×1236 — consistent with the same low-resolution-for-A4 warning pattern already seen for GAL-001/002 in V1 (non-blocking, expected at Task 9's validation). Aspect ratio verified preserved (no cropping) on both derivatives. Confirmed idempotent: rerunning produces the same two files, no `-final2`/`-copy` variants. Security: semgrep clean, npm audit unchanged (7 pre-existing).

- [x] Task 8: Add the three new entries to `publication.yaml` (P0)
  - Acceptance: `GAL-007` (Kallol Roy, gallery section, correct web/print asset paths and fingerprint), `ART-010` (Shubhra Basu poem, articles section, correct content_file and fingerprint), and `ART-011` (Palash Biswas article, articles section, correct content_file and fingerprint) are appended following the existing schema exactly (all required fields per INSTRUCTION.md §7 populated); no existing manifest ID is renumbered or reused; `web_include`/`print_include: true` for all three.
  - Files: `05_WEBSITE/src/_data/publication.yaml`, `05_WEBSITE/scripts/manifest-item-yaml-core.mjs`, `05_WEBSITE/scripts/add-v2-manifest-items.mjs`, `05_WEBSITE/tests/unit/manifest-item-yaml-core.test.mjs`, `05_WEBSITE/tests/integration/add-v2-manifest-items.test.mjs`, `05_WEBSITE/package.json`
  - Completed: 2026-09-08 — `order` values follow the exact formula found in `import-approved.mjs` (200/210/370). `language` detected programmatically with the same Bengali/Latin regex heuristic used there (ART-010 → `bn`, ART-011 → `mixed`, GAL-007 → `en`), not hand-guessed. Insertion is a targeted text splice before the `sponsor_acknowledgements:` anchor (not a full YAML load/dump), confirmed by `git diff` to be a clean 72-line pure addition with zero reformatting elsewhere. Manifest grew 40 → 43 items; Items 20/24 confirmed absent; 0 duplicate IDs; pre-existing `ART-009` confirmed byte-for-byte unchanged. Tests: 3 unit (hermetic, including a full YAML round-trip check with Bengali text) + 1 integration (idempotency-safe — re-running skips the mutation once already applied). Security: semgrep clean, npm audit unchanged (7 pre-existing).

- [x] Task 9: Run manifest and tracker validation (P0)
  - Acceptance: `npm run validate` and `npm run tracker:validate` (from `05_WEBSITE/`) both exit 0 against the updated manifest/tracker, or produce only non-blocking warnings; `validation-report.json` and `validation-summary.md` list any warnings for the three new items (e.g., possible low-resolution note for `GAL-007`); any release-blocking error is fixed before proceeding.
  - Files: `05_WEBSITE/validation-report.json`, `05_WEBSITE/validation-summary.md`, `05_WEBSITE/scripts/validate-tracker.mjs`
  - Completed: 2026-09-08 — `npm run validate`: 0 errors, 7 warnings — identical to V1's set; `GAL-007` did NOT trigger a low-resolution warning (1600px clears the 1116px threshold, i.e. `2480 * 0.45`). Fixed the two stale hardcoded expectations in `validate-tracker.mjs` flagged during Tasks 1/2 (row count 47→52; `COV-001` source filename `Cover page.jpg`→`cover page new.png`), and added an explicit check that Items 20/24 remain recorded but excluded (`Web/Print Include: No`, `Status` starting with "Excluded"). `npm run tracker:validate` now passes: "52 rows, 3 sheets." Security: semgrep clean, npm audit unchanged (7 pre-existing).

- [ ] Task 10: Rebuild the website (P0)
  - Acceptance: `npm run build` completes without error; the built home page displays the new cover, the new gallery item, and both new articles in their correct sections; no existing V1 item disappears or reorders unexpectedly.
  - Files: `05_WEBSITE/_site/**` (build output)

- [ ] Task 11: Rebuild the print PDF (P0)
  - Acceptance: `npm run pdf` completes without error; the new cover renders as PDF page one at correct size with no distortion; the two new articles and the new gallery image appear in the PDF without clipped text, broken Bengali conjuncts, or misplaced captions.
  - Files: generated print PDF under `05_WEBSITE/_site/print/` (or equivalent build path)

- [ ] Task 12: Run automated site tests (P0)
  - Acceptance: `npm run test` passes, including any manifest-driven item-count assertions updated to reflect the 3 newly included items (40 → 43 included items).
  - Files: `05_WEBSITE/scripts/test-site.mjs` (update expected counts if hardcoded)

- [ ] Task 13: Run visual QA screenshots (P0)
  - Acceptance: `npm run qa` produces desktop and mobile screenshots covering the home page (new cover visible), the new gallery item, and both new article pages; manual inspection confirms no clipped/overlapping text, no horizontal overflow, and correct Bengali glyph rendering/line wrapping in both new articles.
  - Files: `05_WEBSITE/qa-output/**`

- [ ] Task 14: Run PDF QA (P0)
  - Acceptance: `npm run qa:pdf` renders page images for the new cover page and the two new article pages; manual inspection confirms no blank pages, no bad page breaks, and captions stay with their images.
  - Files: `05_WEBSITE/qa-output/pdf-*/**`

- [ ] Task 15: Assemble the `V2_REVIEW_01` release (P0)
  - Acceptance: `RELEASE_VERSION=V2_REVIEW_01 node scripts/release.mjs` (or an equivalent new `npm run release:v2` script) produces `06_FINAL_OUTPUT/V2_REVIEW_01/` containing the built website, print PDF, QA evidence, `validation-report.json`/`.md`, `release-manifest.json` (with `included_item_ids` listing all 43 items and `source_fingerprints` for each, including the updated `COV-001` fingerprint), and a `BUILD_SUMMARY.md`; the release folder does not overwrite or touch any file under `V1_COMPLETE_REVIEW_03` or any earlier output folder.
  - Files: `06_FINAL_OUTPUT/V2_REVIEW_01/**`, `05_WEBSITE/package.json` (new release script entry if added)

- [ ] Task 16: Verify baseline integrity (P0)
  - Acceptance: SHA-256 spot-check of a sample of files inside `06_FINAL_OUTPUT/V1_COMPLETE_REVIEW_03/` (at minimum `release-manifest.json`, `website/index.html`, `website/print/BECAA-2026-complete-review.pdf`) matches the hashes recorded before this sprint began; `01_REFERENCE_2025`, `02_INCOMING_CONTENT`, `03_ADVERTISEMENTS`, and `v2-incoming/` are confirmed unmodified.
  - Files: none modified — verification only

- [ ] Task 17: Update `CHANGELOG.md` (P1)
  - Acceptance: A new `## V2_REVIEW_01` section is appended (not replacing prior entries) documenting the cover replacement, the three additions (`GAL-007`, `ART-010`, `ART-011`), and the two exclusions (Item 20, Item 24) with reasons, following the existing changelog format and tone.
  - Files: `CHANGELOG.md`

- [ ] Task 18: Triage pre-existing dependency vulnerabilities found by `npm audit` (P1)
  - Acceptance: Each of the 7 findings (`xlsx` prototype pollution + ReDoS with no fix available, `js-yaml` prototype pollution/DoS, `mammoth` directory traversal, `markdown-it` ReDoS, `playwright` cert-verification issue, `sharp`/libvips CVEs, `@xmldom/xmldom` XML injection) is reviewed for real exploitability in this project's context (local build pipeline, not a public server processing untrusted input); safe non-breaking upgrades applied via `npm audit fix`; breaking-change upgrades (`sharp`, `playwright`, and anything requiring `--force`) presented to the user as a separate decision rather than applied silently. Not a v2 release blocker — discovered during Task 1's security scan, predates this sprint.
  - Files: `05_WEBSITE/package.json`, `05_WEBSITE/package-lock.json`
