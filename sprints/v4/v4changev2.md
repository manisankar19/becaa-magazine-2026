# BECAA Magazine 2026 Sprint v4 Change Addendum v2

## 1. Purpose

This addendum records additional corrections received from the BECAA committee after Sprint v4 planning and after Task 1 was completed in commit `fbe59d6`.

The existing Sprint v4 PRD and task list must be amended before `/dev` continues. Task 1 must not be repeated, reverted, or rewritten. New tasks should be inserted or appended with clear dependencies, and any numbering changes must preserve the record that the original Task 1 is complete.

This addendum supplements, rather than replaces, the already approved Sprint v4 scope:

- the authoritative `Shubhra Basu.md` poem source;
- reuse of `ADV-027` for Sarc Epic;
- the Balajee Infrate and memorial advertisements;
- incoming-content consolidation;
- removal of repeated website section links;
- the remaining approved Sprint v4 decisions.

## 2. Committee Corrections

### 2.1 Bengali wording correction on current PDF page 5

The committee has identified an incorrect Bengali expression on page 5 of the current review PDF.

Required correction recorded by the committee:

- Replace: `বেকান`
- With: `BECAA র`

The attached committee note states that the page has been replaced with a corrected version. Before editing, locate the exact source item and exact sentence that produces this text. Compare the committee's corrected replacement page with the repository source.

Do not rely on the PDF page number alone because page numbers may shift after Sprint v4 adds new material. Identify the item by its manifest ID and source file, then make the correction at the source-of-truth level.

**Editorial confirmation rule:** If the supplied corrected page clearly uses `BECAA-র` with a hyphen, follow that page exactly. If only the text `BECAA র` is available and the punctuation remains ambiguous, stop and request confirmation rather than silently choosing a spelling.

### 2.2 MSG-002 title spelling

The current heading contains:

`Vice Preseident Desk`

Correct the spelling to:

`Vice President Desk`

This is a spelling correction only. Do not independently change it to `Vice President's Desk` or another editorial form unless that wording already exists in the approved source or is separately approved.

Apply the corrected heading consistently wherever this title is displayed or indexed, including as applicable:

- manifest;
- tracker;
- website navigation or contents;
- website item heading;
- PDF contents;
- PDF item heading;
- QA expectations.

Ensure the title is not duplicated on the item page.

### 2.3 Biswajit Chakraborty article corrections

The committee identified two Bengali spelling corrections in Biswajit Chakraborty's article, currently appearing around page 16 of the review PDF.

Apply these exact replacements in the article source:

| Incorrect | Correct |
| --- | --- |
| `ভাইবই` | `ভাবায়` |
| `পারিমা` | `পরিমা` |

Locate the article by its manifest ID and source file rather than relying only on the PDF page number. Preserve every other character, punctuation mark, paragraph break, and mixed-language expression in the article.

Add a regression test showing that the corrected forms appear and the two superseded forms do not appear in the built website and extracted PDF text.

### 2.4 Late Biswajit Sengupta designation

The committee advised that Biswajit Sengupta passed away on 9 September and requested the prefix `Late`.

Add the display name:

`Late Biswajit Sengupta`

to both of his articles:

- `ART-004`
- `ART-005`

Apply the display-name correction consistently in all reader-facing locations, including:

- website contents;
- website cards and article bylines;
- PDF contents;
- PDF article bylines;
- manifest display metadata;
- tracker contributor/display-name fields or notes, as appropriate.

Do not alter the article bodies except for a name occurrence that is clearly functioning as the author byline. Preserve the contributor's underlying identity and provenance. If the schema supports a separate display name, prefer that over changing unrelated source or audit fields.

Do not add the date or circumstances of death to the publication unless separately approved. The date is recorded here only as the committee's reason for the requested prefix.

### 2.5 Print justification for article prose

The committee requested justified article text in the printed magazine.

Apply full justification to article body prose in the print/PDF stylesheet only.

The rule must apply to ordinary prose paragraphs inside article bodies. It must not automatically apply to:

- article titles;
- author bylines;
- Bengali or English poems and verse lines;
- headings and subheadings;
- lists;
- captions;
- quotations where justification harms the intended layout;
- messages;
- gallery captions;
- advertisements;
- memorial text;
- contents pages.

Do not force justification on the website unless separately approved. The website may retain its present readable alignment.

Use CSS appropriate to the existing print pipeline. Visually inspect all article pages after the change, with particular attention to:

- excessive word spacing;
- isolated stretched lines;
- Bengali conjunct rendering;
- mixed Bengali and English lines;
- URLs, names, and long unbreakable words;
- clipping and overflow;
- changes in pagination.

Do not use manual spaces or per-paragraph line breaks to imitate justification.

## 3. Source and Master Document Policy

### 3.1 Recommendation

The authoritative source content must reflect these approved corrections, but original incoming files should not be overwritten in place.

Use this approach:

1. Preserve each currently committed original source unchanged and hash it.
2. Archive a superseded source under the repository's established dated archive only when a revised source file will replace it.
3. Add a revised source with a clear revision suffix such as `_R1`, or create a small correction-source Markdown file that records the exact approved substitutions when no complete revised original has been supplied.
4. Update the manifest and tracker to point to, or record, the authoritative revised source.
5. Retain provenance linking the original, committee instruction, revised source, affected item ID, date, and commit.
6. Never reconstruct an entire contributor document merely to apply one spelling correction if a traceable correction layer is supported by the project.

### 3.2 What should be added to `02_INCOMING_CONTENT`

Add the committee correction document itself to the incoming-content intake using a descriptive filename, for example:

`BECAA Committee Corrections 2026-09-16.docx`

If the committee has supplied complete corrected replacement documents, add those as new revision files rather than overwriting the originals, for example:

- `<original-name>_R1.docx`
- `<original-name>_R1.md`

If no complete corrected source exists, add one controlled correction record, for example:

`BECAA Committee Corrections 2026-09-16.md`

That record should identify the item IDs and exact old-to-new text. It can serve as the approved editorial source for targeted corrections while the original contributor documents remain intact.

### 3.3 What should not be changed directly

Do not silently edit or overwrite the original contributor files already stored in `02_INCOMING_CONTENT`.

Do not replace the original master documents merely because their rendered publication requires:

- a corrected display title;
- a `Late` prefix in publication metadata;
- print justification;
- template or CSS changes.

Those changes belong in structured content, manifest/tracker metadata, or templates unless a revised contributor source was explicitly supplied.

### 3.4 Recommended treatment by correction

| Correction | Change original incoming master? | Recommended authoritative location |
| --- | --- | --- |
| Page 5 Bengali wording | No silent overwrite | Corrected replacement source if supplied; otherwise committee correction record plus working content update |
| MSG-002 title spelling | Usually no | Manifest/tracker title and item front matter; retain original source |
| Biswajit Chakraborty spellings | Preserve original; add revision or correction record | Revised article source or approved correction record, then regenerate working content |
| `Late Biswajit Sengupta` | No | Manifest/tracker display metadata and rendered bylines |
| Print justification | No | Print stylesheet/template only |

## 4. Planning Changes Required

Before resuming `/dev`, update both:

- `sprints/v4/PRD.md`
- `sprints/v4/TASKS.md`

The updated plan must:

1. Record this addendum as a post-Task-1 scope amendment.
2. Preserve Task 1 as completed at commit `fbe59d6`.
3. Add a new intake/provenance task for the committee correction document and any revised source files.
4. Add separate tested tasks for:
   - page 5 Bengali wording correction;
   - MSG-002 title spelling;
   - both Biswajit Chakraborty spelling corrections;
   - `Late Biswajit Sengupta` across `ART-004` and `ART-005`;
   - print-only article justification;
   - regression and visual QA of all affected pages.
5. Recalculate dependencies and task numbering without losing completed-task history.
6. Update expected item counts only for the advertisements already approved in Sprint v4. These committee corrections do not create new publication items.
7. Require a new review release. Do not overwrite any V0, V1, V2, V3, or earlier V4 review output.
8. Require explicit approval before production deployment.

## 5. Test and Verification Requirements

At minimum, add or update tests to confirm:

- the corrected page 5 expression is present and the superseded expression is absent;
- `Vice President Desk` appears consistently and `Vice Preseident Desk` is absent;
- `ভাবায়` and `পরিমা` appear in the correct article;
- `ভাইবই` and `পারিমা` are absent from the built article and PDF text;
- `Late Biswajit Sengupta` appears for both `ART-004` and `ART-005` in website and PDF bylines and contents where names are shown;
- unrelated contributors are not given the `Late` prefix;
- article prose receives the print-only justification rule;
- poems, advertisements, messages, headings, lists, captions, and contents are excluded from that rule;
- all earlier Sprint v4 requirements remain covered;
- protected release folders remain byte-identical;
- registration, authentication, database, and administrator functions remain unchanged and pass their existing tests.

Render and inspect every PDF page affected by these edits. Because justification can alter pagination, scan the complete PDF for blank pages, overflow, clipped text, unexpectedly stretched lines, broken Bengali glyphs, and displaced advertisements.

## 6. Acceptance Criteria

- [ ] The exact page 5 wording approved by the committee is confirmed from an authoritative source and rendered correctly.
- [ ] `Vice Preseident Desk` is replaced consistently with `Vice President Desk`.
- [ ] `ভাইবই` is replaced with `ভাবায়` without any other article-body change.
- [ ] `পারিমা` is replaced with `পরিমা` without any other article-body change.
- [ ] Both `ART-004` and `ART-005` display `Late Biswajit Sengupta` consistently.
- [ ] No unrelated contributor name changes.
- [ ] Article prose is justified in print/PDF only.
- [ ] Verse, headings, bylines, lists, captions, messages, advertisements, memorial text, and contents are not inadvertently justified.
- [ ] The committee instruction and every revised source are preserved and traceable.
- [ ] No original incoming source is silently overwritten.
- [ ] Existing Sprint v4 scope and approved decisions remain intact.
- [ ] Task 1 remains recorded as complete at `fbe59d6`.
- [ ] Automated tests, security checks, build, PDF QA, desktop/mobile browser QA, and source-integrity checks pass.
- [ ] A new review release is produced without modifying protected earlier outputs.
- [ ] Production is changed only after explicit approval.

## 7. Instruction for the New Claude Session

Start from the clean repository state after commit `fbe59d6`. Read `INSTRUCTION.md`, `sprints/v4/PRD.md`, `sprints/v4/TASKS.md`, this addendum, git status, and recent git history.

First verify the committee corrections against the repository source files and manifest IDs. Update the PRD and task list, preserving Task 1 as complete. Show the amended plan and any remaining ambiguity for approval. Do not begin the remaining `/dev` tasks and do not deploy until the amended plan is approved.
