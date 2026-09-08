# Changelog

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
