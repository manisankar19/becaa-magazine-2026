# Sprint v5 — Manual browser and PDF verification (Task 19)

Date: 2026-09-26 · Release inspected: `06_FINAL_OUTPUT/V5_REVIEW_01/` (built at `b7ab7d1`, committed `21c1201`) · Not yet deployed at the time of this check.

## How it was checked

- **Same bytes as the release.** Before the browser pass, `diff -rq 05_WEBSITE/_site 06_FINAL_OUTPUT/V5_REVIEW_01/website` reported no differences, so the pages served locally are exactly the release's.
- **Browser, through the registration gate.** A throwaway Playwright driver (not committed, like Sprint v4's) did the following:
  - started the local dev-app (`scripts/dev-app.mjs`: the same gate code as `middleware.ts`) against the local test database `becaa_test`;
  - at 1440 px and 390 px, opened `/` without a session, registered a guest, and reloaded;
  - checked the `MSG-001` and `ART-011` cards, fetched the PDF with and without a session, and opened `/admin/` logged out;
  - captured element screenshots, which were inspected by eye.

  The 2 test registrations (`e2e-v5manual-…@example.org`) and the rate-limit rows were deleted afterwards. The screenshots are in `05_WEBSITE/qa-output/v5-manual/`, which is git-ignored.
- **Automated release suites.** These ran inside `release:v5`:
  - `test:v5-updates` (website, print HTML and PDF);
  - `qa:pdf-compare:v5` (0 unexplained pages against `V4_REVIEW_02`);
  - `e2e:app` (24 steps: gate, the three registration categories, protected content, admin flow);
  - `test:e2e:hero`, `test:e2e:nav`, `test:e2e:welcome`, `test:e2e:admin`.
- **PDF.** The release's `qa:v5-pages` renders (150 dpi) were inspected: contents pp. 2–3, `MSG-001` pp. 5–6, `ART-011` pp. 34–37.

## Results

| Check | Website (1440 / 390 px) | PDF |
|---|---|---|
| Unregistered visitor at `/` sees the welcome page, not the magazine | Pass / Pass | — |
| Register → magazine; still the magazine after a reload (47 items) | Pass / Pass | — |
| `MSG-001` title "President Desk" and byline "Manik Barman, Civil, 1987 Batch — President" unchanged | Pass / Pass | Pass (p. 5) |
| `MSG-001` body is the new English message: first line "From the President’s Desk", then the prose | Pass / Pass | Pass (pp. 5–6) |
| The four "Extending …" items shown as a bulleted list (visible disc markers) | Pass / Pass | Pass (p. 6, indented list) |
| Signature on three lines: `Manik Barman` / `CE ’87` / `President, BECAA Maharashtra` | Pass / Pass | Pass (p. 6) |
| No text of the old Bengali message | Pass / Pass | Pass (`test:v5-updates`) |
| `ART-011` byline "Palash Biswas, Mechanical, 2006 Batch" | Pass / Pass | Pass (p. 34) |
| Front-page hero tagline present (the hero change is now part of the release) | Pass / Pass | — |
| No horizontal overflow | Pass / Pass | — |
| PDF served with a session, byte-identical to `V5_REVIEW_01` (SHA-256 `d982f11e6b7c…`) | Pass / Pass | — |
| Without a session: PDF refused (403); `/admin/` shows the login form | Pass / Pass | — |
| PDF compared with `V4_REVIEW_02` | — | unchanged 69, correction 1, replaced-item 2, unexplained 0 |

## Findings

No defects were found, and nothing was changed as a result of this check. Two points are recorded for the editor. Both are known, and neither blocks deployment:

1. **The author's wording is published as supplied** (Decision C). This includes "energies", "alma matter"/"Alma Matter", "llTs", "at per", "GABESSU", "Sanmilani" and the rest. The full list is in `02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md` §3, awaiting the owner's decision.
2. **The source's own heading shows as the first line of the body.** "From the President’s Desk" appears as plain text directly under the card title "President Desk", as approved in Decisions A and B. `MSG-002` and `MSG-003` open the same way with their own heading lines.

---

## Addendum — `V5_REVIEW_02` (Task 28, 2026-09-26)

Release inspected: `06_FINAL_OUTPUT/V5_REVIEW_02/` (built at `fa83b7d`, committed `1d10015`). `diff -rq 05_WEBSITE/_site 06_FINAL_OUTPUT/V5_REVIEW_02/website` reported no differences. Not yet deployed at the time of this check.

**Why:** after `V5_REVIEW_01` reached Production, the owner reported that no gallery or advertisement image appeared on the website. Two causes were found (PRD §11):
- the images' wrapper names `.ad-frame`/`.ad-link` are hidden site-wide by EasyList, the base list of common ad blockers;
- the card tints were inline styles, which the site's CSP refuses.

**How it was checked:** a throwaway Playwright driver (not committed) went through the local dev-app gate against `becaa_test`, at 1440 and 390 px, twice at each width:
1. **Normal browser.** The dev-app enforces its own CSP, `default-src 'self'`.
2. **Simulated ad blocker.** All 13,078 of EasyList's generic single-class/single-id hide rules were injected into the page, as a blocker applies them. The context bypassed the CSP only so the rules could be injected.

Each run registered a guest, and the 4 test registrations were deleted afterwards. Element screenshots were inspected by eye; they are in the git-ignored `05_WEBSITE/qa-output/v5-manual-02/`.

| Check | 1440 px | 390 px |
|---|---|---|
| Normal browser: all 30 publication images loaded and visible | Pass | Pass |
| Normal browser: ADV-001 header tint = manifest `#b6e2f2` (`rgb(182, 226, 242)`), from `ad-tints.css` | Pass | Pass |
| Normal browser: ART-006 numeric column right-aligned (class, not inline style) | Pass | Pass |
| Normal browser: no CSP errors in the console; no `.ad-frame`/`.ad-link` element | Pass | Pass |
| Simulated ad blocker: all 30 images still visible (tinted ADV-001 card with its artwork; GAL-001 painting) | Pass | Pass |

The automated release checks cover the same ground: `test:e2e:csp` (0 violations on `/`, `/welcome/`, `/admin/`), `test:e2e:blocker` (30/30 at both widths), `qa:blocklist` (no class or id matches a generic rule), and `web-ad-cards` (every card's tint under the production CSP).

**Findings:** none. The PDF is unchanged: all 72 pages are pixel-identical to `V5_REVIEW_01`, with identical text.
