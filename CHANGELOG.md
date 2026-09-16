# Changelog

## Unreleased — Sprint v4 (`V4_REVIEW_01`, in progress)

### Changed

- `ART-010` ("গোলাপ"): re-extracted from the authoritative `02_INCOMING_CONTENT/Shubhra Basu.md` (SHA-256 `0d068f30b846c0b7…`) instead of the superseded `Shubhra Basu.docx`; all 17 poem lines now carry a trailing `<br>` in the published body, with no stanza gaps. Manifest `source_file`/`source_fingerprint` updated to match.

### Removed

- `scripts/extract-v2-golap.mjs` (the DOCX-based extractor for the superseded poem source) and its integration test are retired, replaced by `scripts/extract-v4-golap.mjs`.

## V3_REVIEW_02 — 2026-09-14

**Released to production 2026-09-15** at `https://becaa-magazine-2026-portal.vercel.app` (Vercel project `becaa-magazine-2026-portal`, commit `d707355`); see `sprints/v3/PREVIEW_DEPLOYMENT.md` for the release record, the preview history and the 2026-09-15 incident.

Supersedes `V3_REVIEW_01` (kept unchanged as the pre-fix build). Local review build only (`06_FINAL_OUTPUT/V3_REVIEW_02/`, built by `npm run release:v3:02` at commit `805b24d`). Not deployed. Same 44 items and content as V3_REVIEW_01; two fixes from the P2 carry-overs:

- Cover page (v2 Task 19 / v3 Task 41): the 1 mm sliver of the contents heading no longer bleeds onto page 1 — root cause was Bengali glyph overflow of the heading on page 2, fixed with headroom on that heading; 69 pages, all other pages unchanged; now guarded by the `test:e2e:cover` pipeline step.
- Release runner (v2 Task 20 / v3 Task 42): npm is invoked through `node npm-cli.js` with `shell: false`; the semgrep finding is cleared.

## V3_REVIEW_01 — 2026-09-14

Local review build only (`06_FINAL_OUTPUT/V3_REVIEW_01/`, built by `npm run release:v3` at commit `8c797f2`). Not deployed. Superseded by `V3_REVIEW_02` above.

### Changed

- `MSG-003` (Secretary Desk): body replaced verbatim with Abir Banerjee's revised message received 2026-09-14 (SHA-256 `ed3fd766…`); the closing lines now render on separate lines; the scanned signature image was not imported. The superseded original (`df446f44…`) is preserved in `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/` and in git history.
- All 22 published advertisements retitled from "[Company] Advertisement" to "With best compliments from [Company Name]" using the recorded company names (manifest, tracker, website card/contents/nav, PDF page and contents). IDs, artwork, normalized files and alt text unchanged; excluded advertisements untouched. "Tata Capital Ltd. (Retail Finance)" and "Clover Blakefield Reality LLP" carried as recorded.
- Every advertisement page (print) and card (web) now has a background colour sampled from the artwork's edge and stored in the manifest (`page_background`, `page_background_mode`, `page_ink`), with WCAG-checked heading ink and the page number kept on white. Two manual overrides: ADV-019 `#2b2f31` (charcoal instead of near-black), ADV-023 `#baecec` (softened cyan).
- Tracker: Item 18 remark for the revised source; Item 24 approved and included; 22 advertisement display titles; all edits preceded by snapshots in `TRACKER_SNAPSHOTS/`.
- `department` column widened to 80 characters; email uniqueness via a `lower(email)` index (no `citext`).

### Added

- `ART-012` — Siddhartha Mukhopadhyay, Bengali story "প্যাঁড়া" (tracker Item 24), web and print, order 220.
- Viewer registration application: public `/welcome/` page (privacy notice, retention 31 December 2027, consent, honeypot), `POST /api/register` with server-side validation, per-IP rate limiting and a signed HttpOnly session cookie; registration gate (Vercel middleware + local server) that shows the welcome page for `/` and refuses artwork and the PDF without a session.
- PostgreSQL schema (`visitors`, `visits`, `admin_sessions`, `rate_limits`, `schema_migrations`) with forward migrations, reverse files and `db:migrate` / `db:status` / `db:rollback` / `db:purge` commands; loopback-only local cluster for development.
- Administrator portal: `/admin/` login (argon2id credential from environment variables, rate limit, lockout, rotating server-side sessions, CSRF), dashboard (totals, category/batch/department counts, searchable paginated registrations, delete with confirmation), CSV export of the 12 approved fields with a formula-injection guard.
- Release pipeline gates: `check:secrets`, `check:sql`, `npm audit` allow-list (`scripts/audit-allowlist.json`), generated `REPRODUCTION.md` with Playwright and PostgreSQL prerequisites; `DEPLOYMENT.md`; `sprints/v3/THREAT_CHECKS.md`; 20 unit suites, 22 integration checks, four browser suites and a 22-step live-browser suite.
- `js-yaml` transitive advisory (via `gray-matter`) fixed by `npm audit fix`.

### Removed

- The per-item HTML pages Eleventy used to emit under `/content/…` (15 in V2); they were not linked anywhere and would have bypassed the registration gate.

### Unchanged

- All other 41 publication items, their IDs and ordering; the cover; source artwork and normalized derivatives; `06_FINAL_OUTPUT/V0_PROTOTYPE_01`, `V0_EC2_VERIFY_01`, `V1_REVIEW_01`, `V1_COMPLETE_REVIEW_01/02/03`, `V2_REVIEW_01` (verified by SHA-256 against the pre-sprint commit).

### Not deployed

- No deployment was made in this sprint. The preview rehearsal (Task 35) stopped before creating any Vercel or Neon resource; the exact steps are in `sprints/v3/PREVIEW_DEPLOYMENT.md`. **Pre-existing, outside this sprint:** the Vercel project `mani125slm/becaa-magazine-2026` has served the ungated V1 magazine publicly at `https://becaa-magazine-2026.vercel.app` since 2 August 2026; it was neither created nor changed here and needs a decision before V3 goes live.

### Noted for follow-up (not blocking this release)

- Item 20 (Sudipta Chakraborty): source file still not received; remains excluded.
- Palash Biswas (`ART-011`): branch recorded as "Civil" in the tracker but "Mech" in his own byline; unresolved pending the editor.
- Three `npm audit` advisories in build tooling (`sharp`, `playwright`, `xlsx`) remain deferred and allow-listed with reasons.
- Cover-page print clipping artifact (v2 Task 19) and `shell: true` in `release.mjs` (v2 Task 20): both fixed in Tasks 41–42 and shipped in `V3_REVIEW_02`.

## V2_REVIEW_01 — 2026-09-08

### Added

- Official cover replacement: `cover page new.png`, normalized with embedded Canva/EXIF/XMP metadata stripped (same 1240×1748 @ 300 DPI dimensions as the previous cover, which is preserved unchanged for the V1 historical record).
- `GAL-007` (Kallol Roy, "Chatgpt" painting/drawing), `ART-010` (Shubhra Basu, poem "গোলাপ"), and `ART-011` (Palash Biswas, article "বেঁচে থাকার লড়াই ও স্বপ্নের পথ") — three new approved items from the Sprint v2 addendum tracker, extracted verbatim and normalized following the same conventions established in V1.
- `sprints/v2/MATERIAL_CHANGE_REGISTER.md`, `PRD.md`, and `TASKS.md`, documenting the full intake, classification, and implementation of this batch.
- A local git repository for the project (previously absent) and a reproducible `npm run release:v2` command.

### Excluded

- Item 20 (Sudipta Chakraborty, "Climate Change and its Impact on Amchi Mumbai"): named source file `Article for BECAA Maharashtra Souveneir.pdf` was never received — not present anywhere in the project — and must not be confused with the similarly-named but differently-authored `ART-006` source already published. Recorded in the tracker as `Excluded – Source file not received`; excluded from the manifest, website, and PDF.
- Item 24 (Siddhartha Mukhopadhyay story): source docx contains only placeholder text ("Story upcoming.") and Permission is still Pending. Recorded in the tracker as `Excluded – Content and permission pending`; excluded from the manifest, website, and PDF.

### Unchanged

- All 40 items from `V1_COMPLETE_REVIEW_03` carry forward with identical IDs, content, and ordering. No advertisement changes — the addendum contained no advertisement rows.
- `06_FINAL_OUTPUT/V0_PROTOTYPE_01`, `V0_EC2_VERIFY_01`, `V1_REVIEW_01`, `V1_COMPLETE_REVIEW_01`, `V1_COMPLETE_REVIEW_02`, and `V1_COMPLETE_REVIEW_03` are untouched (verified by SHA-256 spot-check and `git status`).

### Noted for follow-up (not blocking this release)

- A data discrepancy: Palash Biswas's branch is recorded as "Civil" in the tracker/manifest but as "Mech" in his own byline inside the extracted article text — not corrected here, pending editorial clarification.
- A pre-existing minor clipped-text artifact at the bottom of the print PDF's cover page, confirmed identical in the `V1_COMPLETE_REVIEW_03` baseline (not introduced by the cover replacement).
- 7 pre-existing `npm audit` dependency findings and one pre-existing `shell: true` semgrep finding in `release.mjs`'s command runner, neither introduced by this sprint.

## V1_COMPLETE_REVIEW_03 — 2026-08-02

### Added

- Official magazine title `একই শিকড়`, approved tracker cover entry `COV-001`, and the byte-identical `Cover page.jpg` artwork on web and print covers.
- Structured official-link data, separate Cultural Programmes and Connect with BECAA Maharashtra web sections, and an inside print contact page with six exact-URL QR codes and clickable links.
- ADV-026 CETEST advertisement rendered from slide 1 of its approved PPTX using LibreOffice Impress PDF export and 300-DPI rasterization.
- ART-006 page-level QA images and contributor/byline audit report.

### Corrected

- Reconstructed ART-006’s 20-row Sample Goal Plan from the original three-column Word table, preserving wording and line breaks while removing flattening gaps.
- Added separator-safe byline formatting to web and print; corrected concatenated MSG-002 and MSG-003 signature presentation.
- Updated ART-007 contributor metadata to `Subhasish Banerjee, 1978 Batch`; branch remains intentionally absent.
- Replaced named acknowledgements with one generic sponsor-thanks statement.

### Advertisement decisions

- Included 22 approved advertisements, retaining PNB Housing and Bhavik and adding ADV-026.
- Fully excluded ADV-009, ADV-016, ADV-024, ADV-025 and ADV-027 from website, PDF and acknowledgements.

## V1_COMPLETE_REVIEW_02 — 2026-08-02

### Added

- Complete advertisement reconciliation with tracker-to-source and source-to-tracker audits.
- Eleven technically omitted approved advertisements: ADV-002, ADV-004, ADV-005, ADV-006, ADV-010, ADV-012, ADV-014, ADV-017, ADV-019, ADV-020, and ADV-021.
- Per-advertisement desktop/mobile screenshots and rendered PDF-page QA evidence.

### Corrected

- Restored original approved web/print eligibility where exact full advertisement artwork could be selected from tracker-listed files.
- Corrected `ADV-021` advertiser/title from Bhabik to Bhavik using the name displayed in the artwork, with explicit user authorization.
- Corrected the prior PNB Housing omission by selecting `2 d PNB FD Magazine AD_A4-01.pdf`.

### Still excluded

- Missing artwork: ADV-009, ADV-016, ADV-024, ADV-025, ADV-027.
- Previous-year artwork awaiting explicit 2026 reuse approval: ADV-026.

## V1_COMPLETE_REVIEW_01 — 2026-08-02

### Added

- Complete eligible website and A4 print review sourced from the tracker: 28 items.
- Approved PDF article `ART-009` and PDF gallery artwork `GAL-006` using deterministic Poppler extraction/rasterization.
- Approved advertisement selections `ADV-011` (Axelon artwork, logo excluded) and `ADV-013` (Anand Rathi artwork, logo excluded).
- Name-only Sponsor Acknowledgements / With Thanks section for Worldline India, Eegrab, and mepass.
- Tracker `Print Include` and `Remarks` columns, tracker validation, temporary 2026 cover, print contents, and complete-release command.

### Changed

- Added the Advertisement Availability and Exclusion Rule to `INSTRUCTION.md`.
- Updated advertisement tracker decisions after creating a dated workbook snapshot.
- Enabled every currently approved, permission-cleared, available item for both web and print.

### Excluded

- Missing artwork: ADV-009, ADV-016, ADV-024, ADV-025, ADV-027.
- Multiple unresolved artwork candidates: ADV-002, ADV-004, ADV-005, ADV-006, ADV-010, ADV-014, ADV-017, ADV-019, ADV-020.
- Ambiguous spelling/source match: ADV-012 and ADV-021.
- Previous-year artwork without explicit 2026 approval: ADV-026.
- Non-approved content tracker item 2 (`Placed in Word`).

### Warnings

- Five available raster items remain below the preferred full-A4 print-resolution threshold; originals were not enlarged or altered.

## V1_REVIEW_01 — 2026-08-02

### Added

- Approved single-source website items: MSG-002–MSG-003, ART-002–ART-008, GAL-001–GAL-005, and ADV-003, ADV-007, ADV-008, ADV-015, ADV-018, ADV-022, ADV-023.
- Incremental scan, report, approved-import, and review-release commands.
- EC2-compatible A4 PDF generation from the same publication manifest.

### Changed

- Made inventory Node 18-compatible, release execution cross-platform/non-overwriting, QA reports portable, and item-count tests manifest-driven.

### Excluded

- All new items from print because the tracker does not contain a `Print Include` field.
- Rows with multiple candidate artworks, missing/unsupported files, non-approved status, or explicit verification notes.

### Unresolved

- ADV-009, ADV-016, ADV-024, ADV-025, and ADV-027 have missing source files.
- ADV-021 has a Bhabik/Bhavik spelling conflict; ADV-026 requires confirmation that its 2025 artwork is valid for 2026.
- Multi-file advertisement rows require an editorial choice of artwork before import.
