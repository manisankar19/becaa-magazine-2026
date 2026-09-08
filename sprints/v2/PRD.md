# Sprint v2 — PRD: Incremental Content Update (Cover Replacement + 3 New Items)

Status: Approved for `/prd` → `/dev`
Baseline: `06_FINAL_OUTPUT/V1_COMPLETE_REVIEW_03` (protected, unmodified by this sprint)
Requirements source: `sprints/v2/MATERIAL_CHANGE_REGISTER.md` (full intake analysis of `02_INCOMING_CONTENT/v2-incoming/` against the addendum tracker, main tracker, manifest, and V1 output)

---

## 1. Overview

Sprint v2 incorporates a small, confirmed batch of new material — one replacement cover and three new content items (one gallery painting, one poem, one article) — into the existing BECAA Maharashtra 2026 magazine publication system, producing a new reviewed release at `06_FINAL_OUTPUT/V2_REVIEW_01/` built from the same Eleventy/YAML-manifest architecture as V1, without altering any V0/V1 output or existing content ID.

## 2. Goals

- The main content tracker safely absorbs the 5 addendum rows (IDs 20–24) via a backed-up, append-only merge — no existing row renumbered, reformatted, or lost.
- `COV-001`'s web and print cover asset is replaced with `cover page new.png`, stripped of embedded author/document metadata, with the original `Cover page.jpg` preserved untouched as the V1 historical asset.
- Three new items are normalized, added to `publication.yaml`, and rendered correctly on both the website and the A4 print PDF: `GAL-007` (Kallol Roy painting), `ART-010` (Shubhra Basu's poem "গোলাপ"), `ART-011` (Palash Biswas's article).
- Two addendum items remain explicitly excluded and recorded, not silently dropped: Item 20 (Sudipta Chakraborty — named source file does not exist anywhere in the project) and Item 24 (Siddhartha Mukhopadhyay — source file contains only placeholder text "Story upcoming" and permission is Pending).
- Validation, automated tests, and desktop/mobile visual QA all pass (or produce only pre-existing/expected non-blocking warnings) before packaging the release.
- `06_FINAL_OUTPUT/V2_REVIEW_01/` is assembled in the same structure as `V1_COMPLETE_REVIEW_03` (website, PDF, QA evidence, validation reports, release manifest, build summary) with zero drift to any prior output folder.

## 3. User Stories

- As the BECAA Maharashtra editorial team, I want the new cover design published on both the website and the print PDF, so that the 2026 souvenir reflects our latest approved artwork.
- As a contributing alumnus (Kallol Roy, Shubhra Basu, Palash Biswas), I want my approved submission to appear correctly — in the right language, without corrupted text or clipped artwork — on both the website and the print edition.
- As the editorial reviewer, I want a single register showing exactly what changed, what was added, and what was excluded and why, so I can approve the release without re-deriving the diff myself.
- As the project owner, I want the V1 release to remain byte-for-byte intact after this sprint, so that the previously reviewed and approved edition is never put at risk by later work.
- As the project owner, I want up to five more late-arriving documents to be absorbable into this same pipeline before the final V2 release, without a rebuild of the import/build tooling.

## 4. Technical Architecture

No new stack is introduced. Sprint v2 reuses the existing V1 architecture end-to-end:

- **Static site generator:** Eleventy 3.1.2 (Nunjucks templates), same `05_WEBSITE/eleventy.config.mjs`
- **Manifest:** `05_WEBSITE/src/_data/publication.yaml` (single source of truth for the build)
- **Content extraction:** `mammoth` (DOCX → text), `xlsx` (tracker read/write), `sharp` (image normalization)
- **PDF:** existing `compile-pdf.mjs` / print template pipeline
- **Testing/QA:** Playwright (`test-site.mjs`, `visual-qa.mjs`, `pdf-qa.mjs`)
- **Release packaging:** `release.mjs`, parameterized by `RELEASE_VERSION` (as already used for `V1_COMPLETE_REVIEW_01/02/03`)

Data flow for this sprint:

```
02_INCOMING_CONTENT/v2-incoming/*  ─┐
                                     │
BECAA_2026_Content_Tracker          ├──► [backup + append-only merge] ──► BECAA_2026_Content_Tracker.xlsx (updated)
  addendum.xlsx (rows 20-24)       ─┘                                              │
                                                                                     ▼
                                                                     publication.yaml (updated:
                                                                     COV-001 asset swap +
                                                                     GAL-007, ART-010, ART-011 added)
                                                                                     │
                                                    ┌────────────────────────────────┼────────────────────────────────┐
                                                    ▼                                ▼                                ▼
                                      src/content/articles/*.md          src/assets/normalized/           src/assets/normalized/
                                      (new Markdown, verbatim text)      images/{web,print}/GAL-007.*     cover/cover-page-new.png
                                                    │                                │                                │
                                                    └────────────────────────────────┼────────────────────────────────┘
                                                                                     ▼
                                                                    npm run validate → npm run build
                                                                                     │
                                                                    ┌────────────────┼────────────────┐
                                                                    ▼                ▼                ▼
                                                              npm run pdf     npm run test      npm run qa / qa:pdf
                                                                    │                │                │
                                                                    └────────────────┴────────────────┘
                                                                                     ▼
                                                              06_FINAL_OUTPUT/V2_REVIEW_01/
                                                          (website, PDF, QA evidence, validation
                                                           reports, release-manifest.json, build summary)
```

Item 20 and Item 24 flow only as far as the tracker (recorded, `web_include`/`print_include: false`) — they never reach the manifest or the build.

## 5. Decisions made (reversible, documented per INSTRUCTION.md §19)

These were flagged as open questions during intake; resolved here with sensible defaults so the sprint can proceed without blocking on non-editorial technical choices:

1. **Poem placement:** `ART-010`, `articles` section — following the existing precedent that "Story"-type tracker rows already fold into the `ART-` prefix rather than a separate prefix. Reversible later if a distinct "Poems" grouping is wanted.
2. **Embedded image in `Palash Article.docx`:** not extracted; the article imports as text-only, consistent with how every other current `ART-` item renders (no inline images in body text).
3. **Item 20 (missing source file):** stays excluded and recorded in the tracker, not fabricated or substituted with the similarly-named but differently-authored `ART-006` file. Requires either the correct PDF arriving in a later `v2-incoming` batch, or explicit withdrawal of the row — genuine editorial/permission matter, correctly left for the user rather than resolved by the pipeline.

## 6. Out of Scope

- Advertisements — the addendum tracker contains no advertisement rows; all 22 advertisements from V1_COMPLETE_REVIEW_03 carry forward unchanged.
- Item 20 and Item 24 content import — excluded per §5, tracked for a future batch.
- Any redesign of navigation, section structure, layout system, or build tooling beyond what's needed to place three new items and one cover asset.
- Renumbering, reordering, or reformatting of any existing tracker row or manifest ID.
- Public deployment of any kind — `V2_REVIEW_01` is a local/reviewable build only, per INSTRUCTION.md §18 (separate authorization required).
- Editorial rewriting of any Bengali or English text — all new text is extracted verbatim.
- Handling of the "up to five more documents" beyond ensuring the pipeline built this sprint can absorb them in a later batch without rearchitecture (no specific future items are known yet).

## 7. Dependencies

- `06_FINAL_OUTPUT/V1_COMPLETE_REVIEW_03` must remain the last known-good, fully validated release (confirmed in the baseline inspection).
- `sprints/v2/MATERIAL_CHANGE_REGISTER.md` is the authoritative classification of every addendum item — task implementation must not deviate from its New/Replacement/Excluded determinations without new user input.
- Existing scripts in `05_WEBSITE/scripts/` (`validate.mjs`, `validate-tracker.mjs`, `test-site.mjs`, `visual-qa.mjs`, `pdf-qa.mjs`, `release.mjs`, `compile-pdf.mjs`) are reused, extended only as needed — not replaced.
- `node_modules` already installed in `05_WEBSITE/`; no new dependencies are expected for this sprint's scope.
- User approval of this PRD before `/dev` begins implementation; deployment approval is a separate, later gate.

## 8. Validation Criteria (from the register, carried into the release gate)

- 0 duplicate manifest IDs after merge; 0 duplicate tracker Item IDs.
- All new manifest entries (`COV-001` updated, `GAL-007`, `ART-010`, `ART-011`) carry required fields: source fingerprint (SHA-256), content/asset paths, permission, editorial status, verification.
- Item 20 and Item 24 are absent from `publication.yaml` and from the built website/PDF; their absence must not raise a validator error.
- New Bengali content passes UTF-8/encoding checks — no mojibake, no dropped conjuncts.
- Cover resolves correctly on the website `<img>` and as PDF page one; dimensions/aspect ratio checked against the same A4 threshold config already in use for other assets.
- No broken internal links introduced by the two new article pages or the new gallery entry.
- Pre-existing V1 validation warnings (7 low-resolution notes) may persist unresolved — not this sprint's responsibility.
- `06_FINAL_OUTPUT/V0_PROTOTYPE_01`, `V0_EC2_VERIFY_01`, `V1_REVIEW_01`, `V1_COMPLETE_REVIEW_01`, `V1_COMPLETE_REVIEW_02`, `V1_COMPLETE_REVIEW_03` are verified unchanged (spot-checked by hash) after the release build completes.
