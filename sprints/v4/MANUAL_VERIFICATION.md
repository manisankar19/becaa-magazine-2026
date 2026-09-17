# Sprint v4 — Manual browser and PDF verification (Task 34)

Date: 2026-09-16 · Release inspected: `06_FINAL_OUTPUT/V4_REVIEW_01/` (built at `b96f581`, committed `ee2e9a2`) · Not deployed.

## How it was checked

- **Browser, through the registration gate.** The built site was served by the local dev-app (`scripts/dev-app.mjs`) against the local test database `becaa_test`, at 1440 px and 390 px. A throwaway Playwright driver registered a guest, reloaded the page, requested the PDF, opened `/admin/` without logging in, and captured element screenshots, which were inspected by eye. The two test registrations were deleted afterwards. The screenshots went to `05_WEBSITE/qa-output/v4-manual/`; `qa-output/` is git-ignored, so re-run the steps above to regenerate them.
- **Automated release suites.** `e2e:app` (24 steps at two widths, part of the release run) covers: gate → welcome; field and server errors; alumni, sponsor and guest registration opening the magazine; protected artwork, PDF and print refused without a session; admin login, search, CSV, delete, logout. Evidence: `V4_REVIEW_01/qa-output/app/`.
- **PDF.** The pages rendered by the release (`qa:v4-pages`, 150 dpi) were inspected: contents pp. 2–3, `MSG-001` pp. 5–6, `MSG-002` pp. 7–8, `ART-003` p. 16, `ART-004` pp. 17–18, `ART-005` pp. 19–21, `ART-010` p. 33, `ADV-027/028/029` pp. 69–71. All 29 article pages (pp. 11–39, `qa-output/v4-justification/`) were inspected in Task 27. Evidence: `V4_REVIEW_01/qa-output/v4-pages/`, `v4-justification/`, `pdf-compare/`.

## Results

| Check | Website | PDF |
|---|---|---|
| Navigation: 8 links, once each, wraps without overlap (desktop/tablet/mobile) | Pass (`qa-output/navigation/`) | n/a |
| Registration → magazine; still the magazine after a reload (47 items); PDF served with a session | Pass (desktop, mobile) | — |
| Welcome page before registration; `/admin/` without login shows the login form | Pass (desktop, mobile) | — |
| No horizontal overflow | Pass (desktop, mobile) | — |
| `ART-010` poem: 17 lines, one per line, left-aligned | Pass | Pass (p. 33) |
| `ADV-027` Sarc Epic, `ADV-028` Balajee Infrate: exact sentence, no image, tinted card/page | Pass — see finding 1 | Pass (pp. 69–70) — see finding 1 |
| `ADV-029` memorial: photograph uncropped, seven lines exact, name line emphasised, "In memoriam" kicker | Pass — see finding 2 | Pass (p. 71) |
| `MSG-001`: `BECAA-র পরিচয়` in the confirmed sentence; salutation unchanged | Pass | Pass (p. 5) |
| `MSG-002`: title "Vice President Desk" on the card and in the contents | Pass | Pass (contents p. 2, p. 7) |
| `ART-003`: `ভাবায়`, `পরিমা` | Pass | Pass (p. 16) |
| `ART-004`, `ART-005`: byline "Late Biswajit Sengupta, Civil, 1971 Batch" | Pass | Pass (pp. 17, 19) |
| Article prose justified in print only; no overflow or clipping; Bengali shaping intact | Not justified (correct) | Pass (pp. 11–39, pagination unchanged) |
| PDF compared with `V3_REVIEW_02` | — | 0 unexplained differences |

## Findings (decisions for the editor; nothing was changed)

1. **Text-only advertisements show the sentence twice.** It appears once as the card or page heading and once inside the tinted text box, on both the website and the PDF. PRD Decision E reads "the approved sentence appears exactly once on the page — it is both `title` and the only text content (`text_lines[0]`), no separate heading". The build (Tasks 10, 15 and 16) keeps the heading, and the Task 16 test counts the sentence once *after* the heading. Decision E can be read either way, and removing the heading would rework completed tasks and needs a new review release (`V4_REVIEW_02`), so this needs confirmation.
2. **The memorial page's heading repeats its first two lines.** The heading "In fond memory of Late Shri Bhakta Mohon Mitra" sits above the photograph, and lines 1–2 of the approved text repeat it below. The same question applies as in finding 1.
3. **ART-004 and ART-005 author lines.** Both bodies still open with the unprefixed Bengali author line `বিশ্বজিৎ সেনগুপ্ত` (Decision R changed only the byline). Adding a Bengali "Late" would be new wording and needs the committee.
4. **ART-009 missing-glyph box (pre-existing).** Page 32 shows a box before "meeting", caused by a form-feed character (U+000C) in the extracted content. It is also present in `V3_REVIEW_02`.
5. **Sticky header covers the top of a section (pre-existing).** On desktop and tablet, the sticky header covers roughly the first 68 px of a section after a navigation jump.

No regression was found in registration, the gate, protected content or the administrator page.

---

## Addendum — `V4_REVIEW_02` (2026-09-17)

The owner approved changes for findings 1–5 above on 2026-09-17 (correction record addendum §§6–10). They were implemented in Tasks 39–43 and released as `06_FINAL_OUTPUT/V4_REVIEW_02/` (built at `ac05427`, committed `d0cc14c`). `V4_REVIEW_01` is kept unchanged.

| Finding | Resolution in `V4_REVIEW_02` | Checked |
|---|---|---|
| 1. Text-only ads repeat the sentence as a heading | Heading removed (`aria-label` keeps an accessible name); `ADV-028` wording now "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate", shown once | Website card and PDF pp. 69–70: sentence once, box centred; automated in `web-ad-cards`, `print-ad-pages` (incl. vertical centring), `v4-advertisements`, `pdf-qa` |
| 2. Memorial heading repeats lines 1–2 | Heading removed; the seven approved lines shown once below the uncropped photograph | Website card and PDF p. 71 |
| 3. `ART-004`/`ART-005` Bengali author line | `প্রয়াত বিশ্বজিৎ সেনগুপ্ত` | PDF pp. 17 and 19 (renders inspected); website; `v4-committee-corrections` |
| 4. `ART-009` missing-glyph box | Stray U+000C removed; `validate` now rejects control characters in content | PDF p. 32: "in a meeting he scheduled", no box |
| 5. Sticky header covers jump targets | `scroll-padding-top` where the header is sticky | `test:e2e:nav` at 390/820/1100/1440 px: targets start below the header |

The release pipeline passed all 30 steps. The PDF comparison against `V3_REVIEW_02` has 0 unexplained pages, and the PDF is still 72 pages. The deployed Preview and Production sites were verified against this release; see `sprints/v4/PREVIEW_DEPLOYMENT.md`.

