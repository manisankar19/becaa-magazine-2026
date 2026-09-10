# Sprint v2 — Walkthrough

Verification date: 2026-09-10
Verifier method: independent re-derivation — fresh extraction, fresh hashing, fresh rendering, fresh pixel comparison against source files and against the protected `V1_COMPLETE_REVIEW_03` baseline. Claims already made in `TASKS.md`'s completion notes were re-checked from first principles, not taken on faith.

## Summary

Sprint v2 replaced the magazine's cover artwork and added three new approved items (one gallery painting, one poem, one article) to the BECAA Maharashtra 2026 publication, producing `06_FINAL_OUTPUT/V2_REVIEW_01/`. All 18 P0/P1 tasks in `TASKS.md` are independently confirmed done and correct. Two P2 backlog items (a pre-existing, cosmetic PDF cover-page clipping artifact, and a pre-existing `shell: true` semgrep finding) remain intentionally open and were **not** touched during this walkthrough. One new, non-blocking finding surfaced during verification: the release's own `REPRODUCTION.md` is stale (still describes the V0 pipeline) and one new dependency advisory has appeared since Task 18 closed. Neither blocks release.

## Verification Method

For each of the 17 items requested, verification was performed by re-doing the underlying work independently rather than re-reading prior claims:

- Bengali text was re-extracted fresh from the original `.docx`/`.pptx` sources with `mammoth` and diffed byte-for-byte against what shipped.
- The cover image was decoded pixel-by-pixel (not just byte-hashed) against the `v2-incoming` source.
- The PDF was fully re-rendered page-by-page (67/67) and scanned programmatically for blank pages; specific pages were rendered at 200 DPI and cropped/zoomed for visual inspection.
- Advertisement assets were SHA-256-compared file-by-file against the protected V1 baseline.
- `V1_COMPLETE_REVIEW_03`'s protected files were re-hashed and compared against their state at the very first git commit of this project.
- The full build/validate/test/QA pipeline was re-run from a clean state during this walkthrough (not reused from Task 15's run).

---

## 1. Every approved PRD requirement and atomic task

All 6 PRD Goals (§2), all 3 documented decisions (§5), all 7 Out-of-Scope boundaries (§6), and all 11 Validation Criteria (§8) were checked against the actual release. Result: **fully met**, with one clarification below.

| TASKS.md item | Status | Independently confirmed |
|---|---|---|
| Task 1 — tracker merge | ✅ Done | 52 rows, addendum rows 20–24 present verbatim, 46 non-cover pre-existing rows byte-identical, `Lists`/`Instructions` untouched |
| Task 2 — exclude Items 20/24 | ✅ Done | Both carry `Web/Print Include: No`; only rows 20/24 differ from the pre-exclusion tracker backup |
| Task 3 — normalize cover | ✅ Done | See §2–4 below |
| Task 4 — manifest cover entry | ✅ Done | `publication.yaml`'s `cover:` block is a clean 3-line diff; fingerprint matches the real file |
| Task 5 — extract ART-010 | ✅ Done | Re-extraction matches shipped `.md` exactly (see §6) |
| Task 6 — extract ART-011 | ✅ Done | Re-extraction matches shipped `.md` exactly, text-only, no embedded image reference (see §6) |
| Task 7 — normalize GAL-007 | ✅ Done | Web/print derivatives present, aspect ratio preserved, no upscale beyond source |
| Task 8 — manifest additions | ✅ Done | 43 items total (40 + 3); `git diff`-equivalent confirms a clean insertion |
| Task 9 — validation | ✅ Done | `npm run validate`: 0 errors, 7 warnings (identical set to V1); `npm run tracker:validate`: 52 rows, 3 sheets |
| Task 10 — website rebuild | ✅ Done | All 43 items present on the home page; re-verified fresh in this walkthrough |
| Task 11 — PDF rebuild | ✅ Done | 67 pages, A4-sized, cover on page 1; re-verified fresh |
| Task 12 — site tests | ✅ Done | `npm run test` → "Website smoke tests passed." (re-run fresh) |
| Task 13 — website QA | ✅ Done | Desktop/mobile screenshots re-generated and re-viewed in this walkthrough |
| Task 14 — PDF QA | ✅ Done | All 22 ad pages + cover/ART-010/ART-011/GAL-007 pages re-rendered |
| Task 15 — release assembly | ✅ Done | `release-manifest.json` verified: `git_commit: 9eb4288`, 43 items, correct cover fingerprint |
| Task 16 — baseline integrity | ✅ Done, re-confirmed | See §12 |
| Task 17 — CHANGELOG | ✅ Done | `## V2_REVIEW_01` section present, prior entries untouched |
| Task 18 — dependency triage | ✅ Done (partial by design) | See §14 — one new advisory has appeared since |
| Task 19 (P2, open) | Not touched | Confirmed still `[ ]` in TASKS.md; `print.njk`/`print.css` not modified during this walkthrough |
| Task 20 (P2, open) | Not touched | Confirmed still `[ ]` in TASKS.md; `release.mjs` not modified during this walkthrough |

**Clarification on PRD §2 Goal 5** ("validation... pass... before packaging"): true for the release as packaged. During this walkthrough, re-running `npm run test`/`pdf`/`qa` cold surfaced a missing local Playwright browser binary (see §13) — an environment gap, not a defect in the packaged release, which already contains valid, complete QA evidence from when it was built.

---

## 2–4. The new cover: website, PDF page 1, desktop/mobile, crop/stretch/alteration, resolution and A4 suitability

**Website:** `06_FINAL_OUTPUT/V2_REVIEW_01/website/index.html` — `<img class="cover__art" src="assets/normalized/cover/cover page new.png">`. Re-rendered at both 1440px (desktop) and 390px (mobile) viewports in this walkthrough: the cover displays full-width within its frame at both sizes, responsive, no clipping, no distortion, correct Bengali title "একই শিকড়" rendering with correct conjuncts.

**PDF page 1:** re-rendered fresh from `06_FINAL_OUTPUT/V2_REVIEW_01/website/print/BECAA-2026-complete-review.pdf` at 200 DPI. The cover fills the page correctly per the print CSS (`width: 210mm; height: 297mm; object-fit: contain`), which by construction cannot stretch or distort the image — it preserves the source aspect ratio and letterboxes if needed rather than warping it.

**Not cropped, stretched, overlaid, or altered:** verified at the pixel level, not just by file hash. Decoding both `02_INCOMING_CONTENT/v2-incoming/cover page new.png` (the approved source) and `05_WEBSITE/src/assets/normalized/cover/cover page new.png` (the file actually used by the build) and comparing every pixel:

```
source size: (1240, 1748)
normalized size: (1240, 1748)
pixel-identical: True
```

The only change made anywhere in the pipeline was stripping embedded EXIF/XMP metadata (a personal author name and Canva document/user IDs) — confirmed separately in Task 3 and not re-litigated here since it's a metadata-only, non-visual change.

**Source resolution and A4 suitability:** the source and shipped file are both **1240 × 1748 pixels at a 300 DPI density tag**. At 300 DPI this corresponds to a physical size of 4.13 × 5.83 inches (10.5 × 14.8 cm) — smaller than a full A4 sheet (8.27 × 11.69 in / 2481 × 3508 px at 300 DPI would be "true" full-bleed A4 resolution). The image's aspect ratio (1240:1748 = 0.7094) is very close to A4's (210:297 = 0.7071, a 0.3% difference), so `object-fit: contain` displays it with only a hairline letterbox margin, not a visibly cropped or stretched fit. This is **the same resolution profile as the previous cover** (`Cover page.jpg` is also 1240×1748 @ 300 DPI) — the project's own `validate.mjs` print-resolution gate (`config.print.a4WidthPxAt300Dpi * 0.45` = 1116px) is a *width*-based, not full-bleed-based, threshold, and the cover is exempted from that per-item check entirely (it isn't a `web_asset`/`print_asset` manifest field, it's the separate `cover` block) — consistent with how the *previous* cover was handled and not a new gap introduced this sprint. Practically: the cover renders sharp and legible in the 67-page PDF at this size; it would only show visible softness if printed larger than roughly A5–A4 at full bleed. This is a pre-existing characteristic of both covers, not a Sprint v2 regression.

---

## 5. The bottom-of-cover clipping artifact

**Visible in `V2_REVIEW_01`?** Yes — confirmed by direct visual inspection of the release's own PDF, cropped and 2× zoomed: a sliver of two small text-glyph tops is visible in the white gutter beneath the cover image, above the page-number "1".

**Caused by the cover image or the print template?** **The print template**, not the image. Evidence:
1. `src/print.njk` places `<section class="print-contents">` (whose first content is a Bengali `<h1>` heading followed by an `<ol>` list of contents) immediately after `<section class="print-cover">` in document order.
2. `src/assets/css/print.css` gives both sections `min-height: 250mm` while `.print-cover img` is explicitly forced to `height: 297mm` (full A4) — a height mismatch between the cover section's own box and its child image, compounded by the cover section's `margin: -18mm` full-bleed technique. This is a well-known category of Chromium print-pagination bug: when a `break-after: page` box's own height doesn't match its content's rendered height, the browser can miscalculate where the page boundary actually falls, letting a sliver of the next element bleed onto the previous page.
3. **Direct proof it isn't the image:** a pixel-diff of the artifact region between the *old* cover (a completely different illustration) and the *new* cover (also completely different) shows only a 10×20px difference — consistent with ordinary anti-aliasing/rendering noise between two separately-generated PDFs, not a content difference. Two unrelated images producing the identical artifact, in the identical position, rules out the image as the cause.

**Cosmetic or release-blocking?** **Cosmetic, non-blocking.** It doesn't obscure, corrupt, or misrepresent any actual content (the sliver belongs to the Contents page, which is intact and fully readable on its own page 2); it doesn't affect any of this sprint's new material; it was already present, pixel-for-pixel, in the protected `V1_COMPLETE_REVIEW_03` baseline before this sprint began. Tracked as **Task 19 (P2)** — correctly left open per instruction; `print.njk`/`print.css` were read but not modified during this walkthrough.

---

## 6. ART-010, ART-011, GAL-007 vs. their original source files

**ART-010 (`Shubhra Basu.docx` → "গোলাপ")** — fresh `mammoth.extractRawText()` run against the original file in `02_INCOMING_CONTENT/v2-incoming/` produces text that matches the shipped `src/content/articles/ART-010-item.md` body **exactly** (verified programmatically: `sourceMdBody === freshExtraction.trim() + '\n'` → `true`). No rewording, no dropped lines.

**ART-011 (`Palash Article.docx` → "বেঁচে থাকার লড়াই ও স্বপ্নের পথ")** — same method, same result: exact match, full 5,199-character body (matches the character count independently recorded during intake), text-only as decided in the PRD (the docx's one embedded image, `word/media/image1.png`, is confirmed absent from the shipped Markdown and HTML).

**GAL-007 (`chatgpt kallol.jpeg` → "Chatgpt")** — the shipped web derivative (`assets/normalized/images/web/GAL-007-chatgpt-web.jpg`) was re-viewed directly: sharp, correctly cropped-to-nothing (full artwork visible, no cropping), matches the source artwork exactly, artist's signature ("Kallol") intact in the bottom-right corner.

---

## 7. Bengali text, contributor names, captions, credits, and internal navigation

Checked on the actual rendered home page (not just the manifest):

| Item | Section kicker | Byline shown | Notes |
|---|---|---|---|
| `ART-010` | Articles · ART-010 | "Shubhra Basu (wife of Pranab Basu), Civil, 1978 Batch" | Full poem renders with correct conjuncts |
| `ART-011` | Articles · ART-011 | "Palash Biswas, Civil, 2006 Batch" | Article's own embedded line reads "লিখেছেন: Palash Biswas, **Mech** 2006, BEC/BESU/IIEST" — see §15, both visible on the same page for a reviewer to compare |
| `GAL-007` | Gallery · GAL-007 | "Kallol Roy, Civil, 1991 Batch" | Caption "Chatgpt — Kallol Roy" correct on both web card and PDF page |

**Internal navigation:** `test-site.mjs`'s automated check (re-run fresh) scans every `href="#..."` anchor and confirms each resolves to a real element on the page — passed with 0 broken anchors. The Connect section's four links (email, YouTube, Instagram, Facebook) were checked directly against `officialLinks.yaml` and render with correct `href`s and display text.

---

## 8. All 22 existing advertisements

Every advertisement's **web asset file** in `V2_REVIEW_01` was SHA-256-compared, file-by-file, against the same file in the protected `V1_COMPLETE_REVIEW_03`:

```
V1 ad web asset count: 22   V2: 22
Same file list: true
Mismatches: none — all 22 ad web images byte-identical to V1
```

`npm run qa:pdf` (re-run fresh) rendered all 22 advertisement pages from the PDF with no errors, and `visual-qa.mjs`'s own distortion check (natural-vs-displayed aspect ratio, tolerance 0.02) passed for all 22 at both viewports.

---

## 9. Official links and QR codes

`officialLinks.yaml` (unchanged this sprint) declares 4 "connect" links and 2 "cultural programme" links. `generate-official-qr.mjs` encodes each `link.url` **verbatim** via the `qrcode` library's `QRCode.toString()` — no manipulation, no truncation — and this script re-runs at the start of every `npm run build`, so the 6 QR SVGs shipped in `V2_REVIEW_01` are freshly regenerated from the current `officialLinks.yaml`, not stale copies. All 6 expected files are present (`email.svg`, `youtube.svg`, `instagram.svg`, `facebook.svg`, `jazim-sharma.svg`, `swar-setu.svg`). The website's Connect section and the PDF's contact page both render the same 4/2 links with matching `href` values.

*Method note:* pixel-decoding the QR codes to confirm the embedded URL was not possible in this environment (no `zbar`/QR-decode library available, and installing one hit a missing system library). Verification here is by source-and-generator-code tracing, which is fully deterministic (the `qrcode` library is unchanged since V1 and not touched by this sprint) rather than by re-scanning the images.

---

## 10. Excluded/pending items not leaked into output

Checked in three independent places:

- `release-manifest.json`'s `included_item_ids`: no `"20"` or `"24"` present.
- Built `website/index.html`: no element with a bare numeric `id="20"` or `id="24"` exists anywhere on the page.
- Full PDF text (`pdftotext` over all 67 pages): zero occurrences of "Sudipta Chakraborty", "Siddhartha Mukhopadhyay", or "Souveneir" (the missing/placeholder items' names and the phantom filename).

Both items remain correctly recorded — excluded, not deleted — only in the tracker (`Excluded – Source file not received` / `Excluded – Content and permission pending`).

---

## 11. PDF page count, A4 sizing, blank pages, clipping, broken assets

- **Page count:** 67 pages (`pdfinfo`).
- **A4 sizing:** 594.96 × 841.92 pts, which is exactly A4 (210mm × 297mm) — confirmed via `pdfinfo`.
- **Blank pages:** all 67 pages rendered at low resolution and checked for near-zero pixel variance (a blank/failed page renders as flat white, std. dev. < 2.0). Result: **none** — every page has real content.
- **Clipping:** the one known artifact (page 1, cosmetic, see §5) is the only clipping found. Pages 33 (ART-010), 34 (ART-011), and 44 (GAL-007) were independently re-rendered and inspected — no clipped text, no broken Bengali conjuncts, captions correctly attached to their images.
- **Broken assets:** every `<img src="...">` reference across all 67 HTML files in the built website was resolved against the filesystem — **0 broken references** out of 67 checked.

---

## 12. V0 and V1 outputs unchanged

Re-confirmed independently in this walkthrough (not reused from Task 16's numbers): `sha256sum` of `V1_COMPLETE_REVIEW_03/release-manifest.json`, `website/index.html`, and `website/print/BECAA-2026-complete-review.pdf` **today** were compared against the identical files as they existed in the very first git commit of this project (`f90bd32`, made before any Sprint v2 change). All three hashes match exactly. `git status --short` across the whole repository returns empty — no uncommitted or modified file anywhere, in any of the 6 protected `06_FINAL_OUTPUT` folders or the original `01_REFERENCE_2025`/`02_INCOMING_CONTENT`/`03_ADVERTISEMENTS` source trees.

---

## 13. Reproducibility from documented commands

**Finding: the release folder's own `06_FINAL_OUTPUT/V2_REVIEW_01/REPRODUCTION.md` is stale.** It's a static block of text that `release.mjs` writes unconditionally for every release version (true for all of V0/V1's releases too — this is a pre-existing gap, not something Sprint v2 introduced) and it still lists the V0-era sequence (`npm.cmd run inventory`, `import`, `release:v0`) rather than the commands actually used for V2. It also doesn't mention that Playwright's Chromium browser must be installed separately.

**What was actually tested and confirmed to work**, re-run fresh from the current repository state during this walkthrough:

```
npm run tracker:validate   # passes: 52 rows, 3 sheets
npm run validate           # passes: 0 errors, 7 warnings
npm run build               # passes
npm run test                 # required `npx playwright install chromium` first — see below
npm run pdf
npm run qa
npm run qa:v2-items
npm run qa:pdf
npm run qa:pdf:v2-items
```

Cold-running `npm run test` in this fresh walkthrough session failed with `browserType.launch: Executable doesn't exist` — Playwright's Chromium binary was not present (the environment's browser cache had been cleared since Task 11 installed it). This is an **environment/tooling gap, not a code or content defect**: installing it (`npx playwright install chromium`) resolved it immediately, and every subsequent step passed. This is the same one-time setup step Task 11 already had to do; it just isn't written down anywhere (`REPRODUCTION.md`, `README.md`, `package.json`) as a prerequisite.

For reproducing the *entire* v2 migration from a pre-merge tracker (rather than just rebuilding from the already-merged state currently on disk), the accurate sequence is the one actually used across Tasks 1–15, in order:

```
npm run tracker:merge-v2
npm run tracker:apply-v2-exclusions
npm run normalize:v2-cover
npm run manifest:update-v2-cover
npm run extract:v2-golap
npm run extract:v2-palash-article
npm run normalize:v2-gallery-image
npm run manifest:add-v2-items
npm run release:v2
```

**Verdict on reproducibility:** the release **is** reproducible from the current repository state, and every underlying step was independently re-run and re-verified in this walkthrough. The gap is purely in written documentation (a stale `REPRODUCTION.md` and an undocumented Playwright prerequisite) — not fixed here per the instruction not to perform fixes during this walkthrough; flagged for a future task.

---

## 14. Dependency advisories (non-editorial technical debt — reported, not fixed here)

`npm audit`, re-run fresh at the time of this walkthrough:

| Package | Severity | Status |
|---|---|---|
| `xlsx` | high | No fix on the public npm registry at all (SheetJS's known situation). Deferred in Task 18 — supply-chain-trust decision for the user. |
| `sharp` | high | Fix available (`0.35.4`) but npm itself flags it as a breaking change; used in 8 scripts. Deferred in Task 18. |
| `playwright` | high | Fix available (`1.63.0`) but outside the pinned range; upgrading needs a new Chromium binary download. Deferred in Task 18. |
| `js-yaml` (transitive, via `gray-matter`) | high | **New since Task 18** — a fresh advisory (`GHSA-2883-xcg3-v3hh`) disclosed between 2026-09-08 and this walkthrough, affecting an old `js-yaml` 3.x bundled inside `gray-matter`'s own dependency tree (separate from the direct `js-yaml` 4.3.2 this project already upgraded to in Task 18). `npm audit fix` (non-force) can resolve it. |

None of these are Sprint v2 regressions and none were introduced by any change in this sprint. All four are local-build-pipeline dependencies, not code exposed to untrusted public input. Recommendation: a future `/dev` pass should run `npm audit fix` for the new `gray-matter`-transitive `js-yaml` finding (safe, non-breaking) and revisit the three deferred packages per Task 18's existing reasoning. Not fixed here, per the instruction to report rather than act during this walkthrough.

---

## 15. Palash Biswas branch discrepancy — recorded, not changed

Confirmed still present, unmodified, and visible on the live page: the tracker/manifest record his branch as **"Civil"** (byline shown: "Palash Biswas, Civil, 2006 Batch"), while his own words inside the extracted article text read **"লিখেছেন: Palash Biswas, Mech 2006, BEC/BESU/IIEST"** — both strings are visible on the same rendered page and in the PDF, side by side, so any human reviewer will see the conflict immediately without needing this report. **This discrepancy was not resolved, guessed at, or silently corrected in either direction during this walkthrough or at any point in Sprint v2.** It requires human confirmation of which is correct (or whether "Mech" was a slip in Palash's own submitted text) before either value is changed.

---

## 16. P2 backlog tasks — confirmed not touched

- **Task 19** (cover-page clipping artifact): `src/print.njk` and `src/assets/css/print.css` were read for root-cause analysis (§5) but not edited. `git status` confirms zero changes to either file.
- **Task 20** (`shell: true` in `release.mjs`): not investigated further or edited during this walkthrough.

Both remain `[ ]` (open) in `sprints/v2/TASKS.md`, unchanged from the state /dev left them in.

---

## 17. Deployment

No deployment command was run, referenced, or prepared at any point during this walkthrough. `V2_REVIEW_01` remains a local, reviewable build only.

---

## Test Coverage (carried over from /dev, re-run fresh in this walkthrough)

- **Unit:** 13 assertions across 4 files (`tracker-merge-core`, `tracker-exclusion-core`, `article-markdown-core`, `manifest-item-yaml-core`) — hermetic, no file I/O. All pass.
- **Integration:** 6 tests (`normalize-cover-core`, `cover-manifest-entry`, `extract-v2-golap`, `extract-v2-palash-article`, `normalize-v2-gallery-image`, `add-v2-manifest-items`) — run against real source files and the real manifest. All pass.
- **Site/QA:** `test-site.mjs` (smoke tests), `visual-qa.mjs` + `v2-items-qa.mjs` (desktop/mobile screenshots, distortion/overflow checks), `pdf-qa.mjs` + `v2-items-pdf-qa.mjs` (PDF page rendering for all ads + new items). All re-run fresh in this walkthrough; all pass.

## Known Limitations

- The two P2 backlog items (Tasks 19, 20) remain open by design.
- `REPRODUCTION.md` inside every release folder (not just V2's) is a static, stale template — a pre-existing gap, worth a small follow-up task.
- The Playwright browser binary is an undocumented local prerequisite.
- One new dependency advisory (transitive `js-yaml` via `gray-matter`) has appeared since Task 18 closed; safe to fix, not yet applied.
- QR code content was verified by code-path tracing, not by re-scanning the pixels (no decoder available in this environment).
- Palash Biswas's branch discrepancy remains unresolved pending human input (§15).

## What's Next

1. Get a human decision on Item 20 (missing source file — still not received) and the Palash Biswas branch discrepancy.
2. A short follow-up task: apply `npm audit fix` for the new `gray-matter`/`js-yaml` advisory, and update `release.mjs`'s `REPRODUCTION.md` generation to include the real v2-era command sequence and the Playwright prerequisite.
3. Whenever convenient: Tasks 19 (cosmetic PDF artifact) and 20 (`shell: true` review), both low-priority.
4. Up to five more late-arriving documents may still land in `02_INCOMING_CONTENT/v2-incoming/` per the original PRD — the same intake → register → PRD-amendment → `/dev` flow used for this batch applies to those too.

---

## Verdict

**Ready with non-blocking warnings.**

Every functional requirement in the PRD and every P0/P1 task is independently confirmed correct: the cover is unaltered and displays correctly everywhere, the three new items match their sources exactly, all 22 advertisements are byte-identical to the protected baseline, no excluded item leaked anywhere, the PDF is fully intact (67 pages, correct A4 size, zero blank pages, zero broken assets), and V0/V1 outputs are provably untouched. The only issues found are non-blocking: two already-tracked P2 items, a stale reproduction doc, an undocumented local dev prerequisite, and one newly-disclosed (and easily fixable) transitive dependency advisory — none of which affect the content, correctness, or integrity of the release itself.

## Exact paths for manual review

- **Website:** `06_FINAL_OUTPUT/V2_REVIEW_01/website/index.html`
- **Print PDF:** `06_FINAL_OUTPUT/V2_REVIEW_01/website/print/BECAA-2026-complete-review.pdf`
- **Release manifest:** `06_FINAL_OUTPUT/V2_REVIEW_01/release-manifest.json`
- **Validation report:** `06_FINAL_OUTPUT/V2_REVIEW_01/validation-summary.md`
- **QA evidence:** `06_FINAL_OUTPUT/V2_REVIEW_01/qa-output/` (including `v2-items/`, `pdf-v2-items/`)
