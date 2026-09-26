# Sprint v5 — PRD: New President's Message and ART-011 Branch Correction

Status: **Approved** — decisions A–N approved as recommended by the owner on 2026-09-26.
Prepared: 2026-09-26
Baseline: `06_FINAL_OUTPUT/V4_REVIEW_02/` (protected; 47 items, 72-page PDF) and Production `https://becaa-magazine-2026-portal.vercel.app` at commit `79ae6d0` (`V4_REVIEW_02` plus the front-page hero update).
Requirements source: `sprints/v5/Changev5.md` (the owner's request of 2026-09-26, verbatim).
Proposed output: `06_FINAL_OUTPUT/V5_REVIEW_01/`
Preserve unchanged: every folder under `06_FINAL_OUTPUT/` (V0–V4), `01_REFERENCE_2025/`, `03_ADVERTISEMENTS/`, `BECAA_Magazine_2026_Master.docx`, every other item's content, the database, migrations, Neon resources, environment variables, authentication, gate, middleware, registration and administrator code, and every original file under `02_INCOMING_CONTENT/` other than the one the owner asked to remove.

---

## 1. Overview

Sprint v5 is a two-item content sprint on top of the deployed Sprint v4 portal:

1. **`MSG-001` (President Desk) is replaced** by the President's new message, `02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx`. The old source, `02_INCOMING_CONTENT/President Desk.docx`, is removed from the intake folder (after a byte-exact archive copy, as in Sprint v3/v4).
2. **`ART-011`'s byline is corrected** from `Palash Biswas, Civil, 2006 Batch` to `Palash Biswas, Mechanical, 2006 Batch`.

No item is added, removed or reordered: the manifest stays at 47 items and `MSG-001` keeps its ID, order and position. Nothing in the application layer changes. The sprint ends with a new review release `V5_REVIEW_01`, then Preview and Production deployments, each separately approved.

### 1.1 Verified findings (2026-09-26)

| Topic | Finding |
|---|---|
| Baseline integrity | Working tree clean except the new DOCX (untracked). No tracked change under `06_FINAL_OUTPUT/` or `05_WEBSITE/release-assets/` against `HEAD` (`75688c9`). |
| New source file | `Souvenir President message 05-09-2026.docx`: 22,983 bytes, SHA-256 `67d8a418d781e5bdad16985ceca4f64c6a40bd40d10a3cf075c9bd18dc9f3bf7`, untracked. **English** (the old message is Bengali with English names; manifest `language: mixed`). About 666 words vs about 424 in the old file. |
| New source structure | 22 paragraphs: a bold-italic heading `From the President's Desk`; 8 body paragraphs (7 before the list, 1 after; corrected from "11" on 2026-09-26 — the other paragraphs are empty); a 4-item bulleted list (Word `ListParagraph` with numbering, rendered by mammoth as `<ul><li>`); a closing thanks line; a 3-line signature (`Manik Barman` / `CE  87` / `President, BECAA Maharashtra`, separated by `<w:br/>` soft breaks). |
| Embedded images | Three images are embedded (`image1.jpeg` 18×19 px, `image2.jpg` 1×2 px, `image3.jpg` 7×17 px; 631–867 bytes). Two are anchored inside paragraphs 7 and 16 at near-zero size. They are layout artefacts, not content (no photograph or signature). |
| Signature | The new file reads `CE  87` — two spaces where the old approved file had `CE ’87`; the apostrophe appears to have been lost. |
| Author's wording | Several spellings or usages in the new text look like slips: `energies` (energises), `alma matter` (×2), `llTs` (IITs, with two lower-case L), `GABESSU` next to `GAABESU`, `GAABESU Maharashtra` where `BECAA Maharashtra` may be meant, `at per` (at par), `Sanmilani`, a double space after `Association)`. None has been changed; see Decision C. |
| Old source | `President Desk.docx`: 16,200 bytes, SHA-256 `c9f5d073f3b7…` (matches `MSG-001.source_fingerprint`), tracked in git. Referenced live by `publication.yaml` (`source_file`, `notes`), the `MSG-001` front matter, and the Sprint 1 importer `scripts/import-content.mjs`. Also named in historical records (`BECAA Committee Corrections 2026-09-16.md`, `04_MAGAZINE_WORKING/source-inventory.json`, `INCOMING_CONSOLIDATION_2026-09-15.*` and other working reports). |
| Existing extraction precedent | Sprint v3 replaced `MSG-003` the same way: `extract-v3-secretary-desk.mjs` uses `mammoth.convertToHtml` + `docxHtmlToParagraphText` + `buildArticleMarkdown`, keeps the display title, drops embedded images and archives the superseded DOCX. But `docxHtmlToParagraphText` turns each `<li>` into a plain paragraph, so the bullets would be lost. |
| Old message's signature defect | The current `MSG-001-president-desk.md` ends `Manik BarmanCE ’87President, BECAA Maharashtra` (the Sprint 1 raw-text import dropped the soft breaks). The new extraction fixes this as a side effect. |
| Sprint v4 correction on `MSG-001` | `v4-corrections.mjs` (`V4_FILE_CORRECTIONS`, `V4_CORRECTIONS`, `MSG001_SENTENCE`), `tracker-corrections-core.mjs` (row 16 remark), `v4-committee-corrections.test.mjs`, `pdf-compare` and `qa:v4-pages` all expect the Bengali sentence `…BECAA-র পরিচয়…` in `MSG-001`. The new English message does not contain it, so these checks will fail unless `MSG-001` is retired from the v4 correction set (Decision H). |
| `ART-011` byline | Manifest `branch: Civil`, `passing_year: '2006'`; the `byline` filter renders `Palash Biswas, Civil, 2006 Batch` on the website card and the print page. The article body itself already says `লিখেছেন: Palash Biswas, Mech 2006, BEC/BESU/IIEST`, which supports the correction. Tracker row "Item ID 23" has `Branch: Civil`. No manifest item uses `Mechanical` yet; there is no branch allow-list in `validate` or `tracker:validate`, and the tracker's `Lists` sheet has no Branch list. |
| PDF comparison | `pdf-compare.mjs` is hard-wired to the `V3_REVIEW_02` baseline and to `V4_CORRECTIONS`. A V5 comparison needs `V4_REVIEW_02` as the baseline and a way to classify a wholly replaced item. |
| Page count | The old message fills PDF pp. 5–6. The new one is about 57% longer, so it may need a third page and shift every later page by one. `tests/e2e/print-cover-page.test.mjs` hard-codes 72 pages. |
| Release list | `test:e2e:hero` is not in `V4_STEPS` (carried over from the v4 walkthrough). |

## 2. Goals

- `MSG-001` shows the President's new message in full, in paragraph and list structure matching the source, on the website and in the PDF; no sentence of the old Bengali message remains anywhere in the built output.
- `President Desk.docx` is no longer in `02_INCOMING_CONTENT/`, its bytes are recoverable from the superseded-source archive, and no live code, data or test depends on it.
- `ART-011` reads `Palash Biswas, Mechanical, 2006 Batch` on the website and in the PDF; `Civil` no longer appears in its byline.
- `V5_REVIEW_01` passes the full gated pipeline; the PDF differs from `V4_REVIEW_02` only on the contents pages (if page numbers shift), the `MSG-001` pages, the `ART-011` byline, and pages shifted by pagination.

## 3. User stories

- As the President, I want my new message published exactly as I sent it, with the list of our charity work shown as a list.
- As Palash Biswas, I want my byline to name my real branch.
- As the editor, I want the replaced source archived and traceable, and one intake folder with only live sources in it.

## 4. Work packages

### 4.1 Intake and preservation (first commit)

1. Export `President Desk.docx` from `HEAD` to `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/President Desk.docx` with a `README.md` in the 2026-09-15 format (old and new SHA-256, reason, published item `MSG-001`). Extend `tests/integration/superseded-sources.test.mjs` to assert the archive.
2. `git rm "02_INCOMING_CONTENT/President Desk.docx"` (Decision G).
3. Commit the new DOCX, the archive, the removal and `sprints/v5/` together.

### 4.2 `MSG-001` replacement

- **Extractor** `scripts/extract-v5-president-desk.mjs`, following `extract-v3-secretary-desk.mjs`:
  - refuses to run unless the source SHA-256 equals `67d8a418…`;
  - `mammoth.convertToHtml` → paragraph text → `buildArticleMarkdown({ id: "MSG-001", title: "President Desk", … })` → `src/content/messages/MSG-001-president-desk.md`;
  - drops the three embedded images (Decision F);
  - keeps the signature's soft breaks as three lines.
- **List support (Decision E):** extend `docxHtmlToParagraphText` with an opt-in (e.g. `{ lists: true }`) that renders `<li>` items as Markdown `- ` bullets in one block. Existing callers keep today's output byte for byte (unit test).
- **Wording:** body published as supplied (Decision C). The only proposed change is the signature's `CE  87` → `CE ’87` (Decision D), made through a v5 correction record and the count-guarded `text-correction-core`, never by hand.
- **Manifest** (`publication.yaml`, `MSG-001` only): `source_file`, `source_fingerprint`, `language: en` (Decision K), `notes` (`Tracker Item ID 16. Exact approved source: Souvenir President message 05-09-2026.docx.`). `title`, `alt`, `contributor`, `designation`, `passing_year`, `branch`, `order` unchanged (Decision A).
- **Other live references:** `scripts/import-content.mjs` (Sprint 1 importer) gets a `HISTORICAL` note or the new path, so no live file names the removed source; historical sprint documents and working reports stay as records (Decision G).

### 4.3 Retire the Sprint v4 `MSG-001` correction (Decision H)

The v4 Bengali correction targets text that no longer exists. Mark `MSG-001` superseded in `v4-corrections.mjs` (apply script skips it and says why), remove its assertions from `v4-committee-corrections.test.mjs` and from any v5 comparison, and add a dated §11 addendum to `BECAA Committee Corrections 2026-09-16.md` saying the corrected sentence was superseded by the new message on 2026-09-26. The other v4 corrections (`MSG-002`, `ART-003`, `ART-004/005`, `ART-009`, `ADV-028`) keep their checks.

### 4.4 `ART-011` branch correction

- `publication.yaml`: `ART-011` `branch: Civil` → `branch: Mechanical`, one count-guarded edit through a `V5_FILE_CORRECTIONS` entry (Decision J). No other field changes; the article body is not edited.
- The `byline` filter already renders `branch`, so the website card and the print page change together.

### 4.5 Tracker (snapshot first)

- Row "Item ID 16" (`MSG-001`): `Source File Name` → `Souvenir President message 05-09-2026.docx`; `Received Date` → `26.09.2026` (Decision I); a Remarks note appended (message replaced, old source archived, v4 wording correction superseded).
- Row "Item ID 23" (`ART-011`): `Branch` → `Mechanical`; Remarks note appended.
- Via a `tracker-v5-core.mjs` built on `applyTrackerFieldUpdates`, snapshot first, byte-identical no-op on re-run; `tracker:validate` passes.

### 4.6 Tests

- **Unit:** `docxHtmlToParagraphText` list option (bullets; default unchanged); v5 corrections data (signature, branch) against `text-correction-core`.
- **Integration `tests/integration/v5-updates.test.mjs`** (needs `build` + `pdf`):
  - `MSG-001` content equals the extraction of the fingerprinted source plus only the recorded corrections;
  - website and PDF show the heading, every paragraph, four bullets as a list (`<ul>` with 4 `<li>` on the web), and the signature on three lines;
  - no sentence of the old message appears in `_site/`, the print HTML or the PDF (checked against the archived file's text);
  - no embedded `data:` image in the `MSG-001` output;
  - `ART-011` byline is exactly `Palash Biswas, Mechanical, 2006 Batch` on web and print, `Civil` absent from it; every other item's byline unchanged;
  - no live file (scripts, src, tests, data) references `President Desk.docx`; the archive hash matches.
- **Count and page derivations:** `print-cover-page` derives or updates its expected page count with the reason recorded.

### 4.7 Build and release

- `release-core.mjs`: `V5_STEPS` = `V4_STEPS` + `test:e2e:hero` + `test:v5-updates`; `release:v5` → `V5_REVIEW_01`; reproduction text for V5. `V4_STEPS` unchanged and asserted.
- `pdf-compare`: baseline selectable by version (`V4_REVIEW_02` for V5), a `replaced-item` class for `MSG-001` (all its pages), and the `ART-011` byline as a recorded correction. Zero unexplained pages required.
- `qa:v4-pages`-style evidence renders for contents, `MSG-001` and `ART-011` in the release.
- `CHANGELOG.md` `V5_REVIEW_01` section; `DEPLOYMENT.md` note.
- Replace the deployable PDF `05_WEBSITE/release-assets/print/BECAA-2026-complete-review.pdf` with the V5 PDF.
- Run the release in the foreground (background runs are killed for low memory on this host).

## 5. Technical architecture and data model

Stack unchanged: Eleventy static build (website + print HTML → Playwright PDF) from the one manifest `05_WEBSITE/src/_data/publication.yaml`, Node 22 scripts with `*-core.mjs` pure modules, the Excel tracker, Vercel + Neon for the gated portal (untouched).

```
02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx   (SHA-256 gate 67d8a418…)
        │ mammoth.convertToHtml
        ▼
docxHtmlToParagraphText(html, { lists: true })   ── article-markdown-core.mjs (new opt-in)
        │ buildArticleMarkdown(id MSG-001, title "President Desk")
        ▼
src/content/messages/MSG-001-president-desk.md ◀── v5 correction record + V5_FILE_CORRECTIONS
        │                                           (signature ’87; ART-011 branch in publication.yaml)
        ▼                                            via text-correction-core (count-guarded)
Eleventy build ── byline filter (branch) ──▶ _site/index.html, _site/print/index.html ──▶ PDF
        │                                                                              │
tracker-v5-core ─▶ tracker rows 16, 23 (snapshot first)        pdf-compare vs V4_REVIEW_02
                                                               (MSG-001 = replaced-item)
                                                                         │
                                                  npm run release:v5 ─▶ 06_FINAL_OUTPUT/V5_REVIEW_01/

President Desk.docx ──git show HEAD──▶ SUPERSEDED_SOURCES/2026-09-26/  then git rm from intake
```

Data model: no new fields. `branch` gains a new value `Mechanical`; there is no allow-list to extend. `MSG-001.language` becomes `en` (the manifest's code for English).

## 6. Validation criteria for `V5_REVIEW_01`

- `validate` 0 errors, 47 items; manifest diff vs `75688c9` limited to `MSG-001` (`source_file`, `source_fingerprint`, `language`, `notes`) and `ART-011` (`branch`).
- Content diff limited to `MSG-001-president-desk.md`; `ART-011-item.md` unchanged.
- Website: new `MSG-001` with a four-bullet list and three-line signature; `ART-011` byline corrected; hero, navigation (8 links), welcome, admin and application suites green.
- PDF: comparison vs `V4_REVIEW_02` has 0 unexplained pages; the page count is recorded and explained.
- Tracker: rows 16 and 23 changed as in §4.5 only; 54 rows, 3 sheets; snapshot taken.
- `President Desk.docx` absent from `02_INCOMING_CONTENT/`, present and hash-verified in the 2026-09-26 archive.
- Security, secret and SQL scans, dependency audit gate; earlier release folders byte-identical.

## 7. Decisions (recommendation first; say if you disagree)

- **A. `MSG-001` display title.** *Recommended:* keep `President Desk` (matches the navigation, the contents, `Vice President Desk` and `Secretary Desk`); the source's own heading `From the President's Desk` stays as the first line of the body, as `President’s Desk` does today. *Alternative:* retitle the item `From the President's Desk` (changes the contents entry and `alt`).
- **B. Heading line in the body.** *Recommended:* keep `From the President's Desk` as the first body line (plain text, like the other messages). *Alternative:* drop it, since the card already has a heading.
- **C. The author's wording.** *Recommended:* publish the body exactly as supplied; do not copy-edit the President's message without his say. The slips listed in §1.1 are reported for the owner to confirm; any correction the owner approves goes into the v5 correction record as an exact old → new entry. *Alternative:* correct them now (please list which).
- **D. Signature `CE  87`.** *Recommended:* restore `CE ’87` (the form in the previously approved message; the double space shows a lost character), recorded in the v5 correction record. *Alternative:* publish `CE  87` as supplied.
- **E. The four charity items.** *Recommended:* render as a bulleted list on web and print, via an opt-in list mode in `docxHtmlToParagraphText`. *Alternative:* four plain paragraphs (today's helper, no code change).
- **F. Embedded images.** *Recommended:* do not import the three tiny embedded images (1×2, 7×17, 18×19 px layout artefacts). The page stays text-only, like the other messages.
- **G. Removing `President Desk.docx`.** *Recommended:* archive a byte-exact copy to `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/`, then `git rm` it from `02_INCOMING_CONTENT/` (git history keeps it too). Update live references only; historical sprint documents, the 2026-09-16 correction record (except its addendum) and working reports stay as records.
- **H. The Sprint v4 `MSG-001` correction.** *Recommended:* mark it superseded (data, apply script, test, correction-record addendum, tracker remark) rather than delete its history. *Alternative:* leave the v4 code as is and let v5 tests skip it (leaves failing v4 suites — not viable for the release gate).
- **I. Tracker received date for the new message.** *Recommended:* `26.09.2026`, the date the file arrived (the `05-09-2026` in its name is the message's date). *Alternative:* `05.09.2026`.
- **J. `ART-011` branch value.** *Recommended:* `Mechanical`, as the owner wrote it and in the style of `Civil`/`Electrical`; changed in the manifest and tracker through the count-guarded correction path. The article body's own `Mech 2006` line is left as written.
- **K. `MSG-001` language.** *Recommended:* English — manifest code `en`.
- **L. Release.** *Recommended:* `release:v5` → `V5_REVIEW_01`; comparison baseline `V4_REVIEW_02`; add `test:e2e:hero` to the release list (closes the v4 follow-up). The new release also captures the hero change, so the archive matches Production again.
- **M. Deployment.** Preview after `/walkthrough`, with separate approval; Production only after a further explicit approval, following `05_WEBSITE/DEPLOYMENT.md` (smoke test still 47 items). The previous Production deployment is kept for rollback.
- **N. Commit plan.** (1) intake and archive/removal, then one commit per task as in v4; no commit of release output until the pipeline is green.

## 8. Out of scope

- Any change to other items, titles, ordering, advertisements or artwork.
- Copy-editing the new message beyond decisions C and D.
- The article body's `Mech 2006` line in `ART-011`.
- Front-page review-era wording (eyebrow "Version 1 local review", "Prototype Contents", the "Local review only" footer) — still an open owner decision from v4.
- The other Sprint v4 follow-ups (Unicode normalisation, the stale `ART-010` note, the allow-listed dependency advisories).
- Application layer: registration, gate, authentication, cookies, middleware, admin, database, migrations, Neon, rate limiting, headers, environment variables; production data.

## 9. Dependencies

Sprint v4 complete (`75688c9`, in Production); Node 22, `mammoth`, `unzip`, `pdftotext`/`pdftoppm`, Playwright Chromium, the local PostgreSQL cluster for the application suites; tracker edits authorised by `Changev5.md` (snapshot first).

## 10. Proposed task streams for `/prd` (indicative)

**Stream A — intake (P0):** archive + removal + intake commit → superseded-sources test.
**Stream B — `MSG-001` (P0):** list mode in `docxHtmlToParagraphText` + unit test → v5 correction record and data → `extract-v5-president-desk` + manifest update + integration test → retire the v4 `MSG-001` correction → remove live references to the old source.
**Stream C — `ART-011` (P0):** branch correction through the correction path + byline test.
**Stream D — tracker (P0):** rows 16 and 23, snapshot first, + test.
**Stream E — verification (P0):** `v5-updates` suite, page-count derivation, full gate re-run.
**Stream F — build and release (P0/P1):** `V5_STEPS` + `release:v5`, PDF comparison vs `V4_REVIEW_02`, evidence renders, CHANGELOG, `V5_REVIEW_01`, deployable PDF; then Preview and Production, each separately approved.

---

## 11. Addendum (2026-09-26) — web images hidden by ad blockers; card tints blocked by the CSP

Status: **Approved** by the owner on 2026-09-26 ("I agree to the Proposed fix, as a short v5 addendum"). Items 1, 2 and 4 of the proposal are in scope. Item 3 (renaming image paths) is deferred (Decision R).

### 11.1 Verified findings

| Topic | Finding |
|---|---|
| Owner report | On Production (`V5_REVIEW_01`), the gallery and advertisement images do not appear on the website. The PDF shows them. The screenshot shows each card's title followed directly by its status pills, with no image frame at all. |
| Server | Serving works. The Production request log after the deploy shows 30 image responses with 200 to a newly registered visitor, and 17 with 304 to another; none refused. On Preview, a registered Chromium session loads and renders all 30 images. The template renders the frame for every artwork item, and the page markup equals `V4_REVIEW_02`'s. |
| Cause | Every web image sits in `<figure class="ad-frame">` inside `<a class="ad-link">`, gallery included. EasyList, the base list of uBlock Origin, AdBlock Plus, Brave and others, has the generic cosmetic rules `##.ad-frame` and `##.ad-link`, which hide those elements on every site. Injecting exactly those two rules on Preview reproduces the owner's screenshot. No other class or id on the page matches an EasyList generic hide rule (checked 2026-09-26). |
| Why "V4 was fine" | The same class names were already in V4 (and since the first commit), on the same 30 images. The difference is on the viewer's side: a blocker installed, updated or enabled. Nothing in Sprint v5 changed the markup. |
| Tints | The advertisement card tints are inline `style="--ad-bg: …; --ad-ink: …"` attributes (filter `adPageStyle`). The site's CSP (`default-src 'self'`, `vercel.json`) forbids inline styles, so browsers drop them. Every card falls back to no tint, and the console reports "Refused to apply inline style". This has been the case since Sprint v3. |
| Test gap | `tests/e2e/web-ad-cards.test.mjs` and the other page tests serve `_site/` with `tests/e2e/static-server.mjs`, which sends no CSP, so tint assertions pass locally. No test checks for CSP violations, and none checks class names against blocker lists. |
| PDF | The PDF is compiled from `print.njk` without the site CSP, and it has no blocker. Both defects are website-only. |

### 11.2 Decisions (approved as recommended)

- **O. Neutral names.** Rename `ad-frame` → `artwork-frame`, `ad-frame--memorial` → `artwork-frame--memorial`, and `ad-link` → `artwork-link` everywhere: templates, CSS, QA scripts, tests. In `print.njk`/`print.css` too, so the served `/print/` page is not hidden either. The class rename does not change rendering. Other `ad-*` names (`ad-text`, `ad-memorial`, `ad-ink--*`) match no EasyList generic rule and are left alone, but the guard (Decision Q) watches them.
- **P. Tints through a stylesheet, CSP unchanged.** Eleventy generates `assets/css/ad-tints.css` from the manifest, with one rule per advertisement (`#ADV-001 { --ad-bg: …; --ad-ink: … }`), reusing the `adPageStyle` logic. `index.njk` drops the inline `style` attribute, and `base.njk` links the new stylesheet. The CSP is **not** loosened (no `'unsafe-inline'`). `print.njk` keeps its inline style, because the PDF is compiled without the CSP and must stay unchanged. The web copy of `/print/` stays untinted, which is recorded as a limitation.
- **Q. Guards so this cannot come back.**
  - A pure `blocklist-guard-core.mjs`, with unit tests, extracts generic class and id hide selectors from filter-list text and reports any class or id in built HTML that matches.
  - `npm run qa:blocklist` checks `_site/index.html`, `_site/print/index.html` and `/welcome/` against a committed snapshot of EasyList's generic class/id hide selectors (selector names only, with source URL, date and licence note). It fails on any match.
  - The page tests serve `_site/` with the production CSP taken from `vercel.json`, assert that the tints compute to the manifest colours, and fail on any CSP violation in the console.
- **R. Image paths deferred.** Folder and file names containing "advertisement" match only domain-specific EasyList URL rules, not generic ones. Renaming them would touch the manifest, tracker, release comparison and the PDF, so it is recorded as a Sprint v6 candidate.
- **S. Release and deployment.** Build `V5_REVIEW_02` with `release:v5:02`, adding the `V5_STEPS` list plus `qa:blocklist`. The PDF must still pass `qa:pdf-compare:v5` with the same result as `V5_REVIEW_01`. Deploy to Preview and then Production, each with the owner's explicit go-ahead. Production uses the owner-chosen "checks that leave nothing behind" scope unless Production reads are permitted.

### 11.3 Validation criteria for `V5_REVIEW_02`

- No `ad-frame`/`ad-link` in any built page. `qa:blocklist` passes; it fails on a deliberately re-introduced `ad-frame`.
- Under the production CSP: every advertisement card's computed `--ad-bg`/background equals its manifest tint; zero CSP violations on `/`, `/welcome/` and `/admin/`; all 30 images load and are visible (non-zero rendered box).
- With EasyList's generic `##.` rules for the page's own names injected: the images stay visible.
- The PDF comparison against `V4_REVIEW_02` gives the same classes as `V5_REVIEW_01` (unchanged 69, correction 1, replaced-item 2, unexplained 0), and the PDF text is identical to `V5_REVIEW_01`'s.
- Full release gate green; earlier release folders unchanged.
