# BECAA Magazine 2026 Portal

## Change Request: Publication Updates and Website Navigation Correction

### 1. Background

Sprint v3 has been completed and deployed to production:

- Production portal: `https://becaa-magazine-2026-portal.vercel.app`
- Viewer registration is working.
- Access control for magazine content is working.
- The administrator login and dashboard are working.
- Production uses its own Neon database and production-only environment variables.

During manual production review, a presentation defect was found in the navigation area at the top of the magazine home page. Revised source material and three additional advertisement contributions have also been received. The next sprint must address these publication changes together with the navigation correction and incoming-content folder consolidation described below.

### 2. Work Included in the Next Sprint

The next sprint contains these five work packages:

1. Preserve the intended line breaks in Shubhra Basu's poem.
2. Add two text-only company advertisements.
3. Add one memorial advertisement with its supplied image.
4. Merge `02_INCOMING_CONTENT/v2-incoming` into `02_INCOMING_CONTENT` safely.
5. Remove repeated website section-navigation links.

The publication changes must be applied consistently to the source-of-truth files, tracker, manifest, website, print output, QA checks, and new release output wherever applicable.

### 3. Shubhra Basu Poem Line Break Correction

#### 3.1 Revised source

The revised source file has replaced the earlier file at:

`becaa-magazine-2026/02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.docx`

The file uses a different type of line break because the earlier extraction did not detect the intended poetic line endings.

Before moving or processing the file, preserve both the earlier committed source and the revised source according to the repository's intake and archival rules. Do not silently destroy either version.

#### 3.2 Required rendering

The poem must retain its line-by-line structure on both the website and in the PDF. A new rendered line must appear after every source poem line.

For example, the following passage contains exactly four lines and must render as four lines:

```text
এনেছি এক গোলাপের চারা—
রেখেছি তার ভার ভার মাটি ভরা টবে,
জল দিই তারে, রোদ্দুরেও রাখি তারে।
ধীরে ধীরে বেড়ে ওঠে, গোলাপের চারা—
```

Extract the complete poem afresh from the revised DOCX. Do not reconstruct the full poem from this example and do not manually rewrite its words. Preserve the revised source text verbatim, including punctuation, Bengali characters, stanza boundaries, and line breaks.

#### 3.3 Extraction requirement

Determine which DOCX break element is used in the revised file and update the reusable extraction logic if necessary. Add a regression fixture and tests proving that paragraph boundaries, explicit line breaks, and the break form used in this DOCX survive extraction without merging separate poem lines.

Verify the entire extracted poem against the revised DOCX, not only the four-line example.

### 4. New Text-Only Advertisement for M/s Balajee Infrate

No artwork or advertisement design has been received. Create a restrained text-only advertisement page containing only:

> Best Compliment from M/s Balajee Infrate

The sentence must be displayed prominently at a larger size appropriate for an advertisement page. It must remain readable and visually balanced without inventing a logo, address, contact details, slogan, decorative artwork, or other company information.

Add a new advertisement entry using the next valid advertisement ID and the correct publication order after inspecting the current manifest and tracker.

Update the tracker note with:

`Source: Keya Mukhopadhya. Intended for magazine printing. No design available.`

Record clearly that the advertisement is text-only and that no source artwork was supplied.

### 5. New Text-Only Advertisement for Sarc Epic

No artwork or advertisement design has been received. Create a restrained text-only advertisement page containing only:

> Best Compliment from Sarc Epic

The sentence must be displayed prominently at a larger size appropriate for an advertisement page. It must remain readable and visually balanced without inventing a logo, address, contact details, slogan, decorative artwork, or other company information.

Add a new advertisement entry using the next valid advertisement ID and the correct publication order after inspecting the current manifest and tracker.

Update the tracker note with:

`Source: AniketPal (Debojit da). No design available.`

Record clearly that the advertisement is text-only and that no source artwork was supplied.

### 6. Memorial Advertisement for Late Shri Bhakta Mohon Mitra

#### 6.1 Supplied content

This contribution is a memorial sponsored by a son and daughter, not an advertisement from a company. The advertisement page must contain the following text, preserving the wording and line structure:

```text
In fond memory of
Late Shri Bhakta Mohon Mitra
B E (Mechanical) April 1951
Bengal Engineering College, Shibpur, Howrah.
With Love from
Subrata Mitra (son)
Soma Mitra (daughter)
```

Do not change `In fond memory of` to another phrase without explicit editorial approval.

#### 6.2 Supplied image

The image filename is:

`Supriyo.JPG`

The expected source path is:

`becaa-magazine-2026/02_INCOMING_CONTENT/Supriyo.JPG`

Verify that the file exists and inspect it before implementation. Preserve the original source file. Create normalised web and print derivatives following the project's established image-processing conventions. Do not crop away meaningful content, distort the image, or invent missing visual material.

#### 6.3 Tracker information

Add the memorial advertisement to the tracker and manifest using the next valid advertisement ID and appropriate publication order.

Record:

- Source: `SUPRIO CHOUDHURY`
- Source filename: `Supriyo.JPG`
- Contributors: `Subrata Mitra (son), Soma Mitra (daughter)`

The website and PDF must identify this as a memorial contribution rather than implying that Late Shri Bhakta Mohon Mitra is a company or commercial advertiser.

### 7. Incoming-Content Folder Consolidation

There must be only one active incoming-content location:

`becaa-magazine-2026/02_INCOMING_CONTENT`

Merge the contents of:

`becaa-magazine-2026/02_INCOMING_CONTENT/v2-incoming`

into the parent `02_INCOMING_CONTENT` folder.

Before moving anything:

1. Inventory every file in both locations.
2. Compare filenames case-insensitively and identify collisions.
3. Compare hashes for files with matching or similar names.
4. Preserve revised and superseded versions in the repository's approved archive structure.
5. Update every manifest, tracker, script, test, and documentation reference that points to `v2-incoming`.
6. Confirm that no source file is lost or overwritten.
7. Remove the empty `v2-incoming` directory only after all references and preservation checks pass.

The consolidation must be committed separately or otherwise made easy to audit. Do not use broad destructive commands.

### 8. Observed Navigation Defect

The navigation currently appears to be generated once for every magazine item rather than once for every section. This causes labels such as the following to appear repeatedly:

- Messages
- Articles
- Gallery
- Advertisements

For example, `Articles` appears once for each article and `Advertisements` appears once for each advertisement. The result is a large, crowded block of repeated links above the cover and introductory content.

This is unnecessary and makes the front page difficult to read and navigate, especially on desktop displays.

### 9. Required Navigation

The website navigation must contain exactly one link for each main section, in this order:

1. Contents
2. Messages
3. Articles
4. Gallery
5. Advertisements
6. Cultural Programmes
7. Connect
8. With Thanks

No section label should be repeated merely because the section contains multiple items.

### 10. Link Behaviour

Each navigation link must lead to the beginning of the corresponding section:

| Navigation label | Required destination |
| --- | --- |
| Contents | Start of the website contents section |
| Messages | First published message |
| Articles | First published article |
| Gallery | First published gallery item |
| Advertisements | First published advertisement |
| Cultural Programmes | Start of the cultural-programmes section |
| Connect | Start of the contact/connect section |
| With Thanks | Start of the acknowledgements/thanks section |

Use stable section anchors or the existing first-item anchors. Do not hard-code an item ID if the build system can determine the first eligible published item from the manifest. The links must remain correct if additional items are added later.

### 11. Navigation Implementation Requirement

Identify the source of the repeated links in the Eleventy templates, navigation collection, manifest mapping, or build logic. Correct the source-generation logic rather than deleting repeated links from generated HTML after the build.

The intended data model is:

- one navigation entry per website section;
- zero navigation entries for individual items unless a separate item-level contents component explicitly requires them;
- each section entry targets the first published item or the section container.

The built navigation must remain deterministic and derived from approved publication data.

### 12. Navigation Presentation Requirements

- Keep the existing visual style unless a small layout adjustment is required for the corrected eight-link navigation.
- Display the navigation cleanly on desktop and mobile.
- Allow links to wrap naturally on narrow screens without clipping or horizontal overflow.
- Preserve keyboard navigation and visible focus states.
- Preserve meaningful accessible link text.
- Do not introduce a dropdown menu unless the existing design already uses one or testing shows it is necessary.

### 13. Scope Boundaries

This sprint authorises only the four publication/intake changes and the navigation correction described in this document.

Apart from those expressly authorised changes, do not change:

- unrelated magazine articles, messages, gallery items, advertisements, or editorial content;
- existing item ordering, except to insert the three approved new advertisements at a justified position;
- unrelated titles, tracker rows, manifest fields, advertisement backgrounds, or artwork;
- existing PDF content or pagination beyond changes necessarily caused by the revised poem and three new advertisement pages;
- viewer registration fields or validation;
- authentication, cookies, middleware, or access-control behaviour;
- administrator login or dashboard;
- database schema, migrations, records, or Neon resources;
- rate limiting, security headers, or environment variables;
- protected V0, V1, V2, or V3 release folders.

Do not modify or overwrite protected V0, V1, V2, or V3 release folders. Create a new review release for this sprint.

Do not deploy while developing or testing. Production deployment must be a separate final action after review and explicit authorization.

### 14. Tests to Add or Update

Add automated tests that verify the built website navigation.

At minimum, the tests must confirm:

1. The navigation contains exactly eight main section links.
2. Each required label appears exactly once within the main navigation.
3. The links appear in the required order.
4. Every link has a valid non-empty destination.
5. Every destination exists in the built page.
6. `Messages` points to the first published message.
7. `Articles` points to the first published article.
8. `Gallery` points to the first published gallery item.
9. `Advertisements` points to the first published advertisement.
10. Adding another item to a section in a hermetic fixture does not create another section-navigation link.
11. Existing access-control tests remain green.
12. Existing viewer and administrator tests remain green.
13. Every source line and stanza boundary in Shubhra Basu's revised poem is preserved in the built website and extracted PDF text.
14. The supplied four-line poem example renders as exactly four lines.
15. Both text-only advertisement sentences match the approved wording exactly everywhere they appear.
16. The memorial wording and contributor names match the approved text exactly.
17. The memorial image derivatives exist, load correctly, and meet the project's normalisation rules.
18. The three new advertisement IDs are unique and consistently represented in the tracker, manifest, website, and PDF.
19. No live reference to `02_INCOMING_CONTENT/v2-incoming` remains after consolidation.
20. The source inventory proves no incoming file was lost or silently overwritten.

Prefer testing the navigation by semantic role or a dedicated navigation selector so unrelated occurrences of words such as `Articles` inside page content do not cause false failures.

### 15. Manual Browser and PDF Verification

Verify the corrected build in a real browser at these sizes:

- desktop width;
- mobile width;
- at least one intermediate/tablet width.

Confirm that:

- only eight main navigation links are visible;
- no repeated `Messages`, `Articles`, `Gallery`, or `Advertisements` links remain;
- every link scrolls or navigates to the correct section;
- navigation does not overlap the logo, cover, or hero area;
- there is no horizontal overflow;
- registration still opens the magazine correctly;
- refreshing or revisiting protected content still follows the existing session rules;
- the administrator page is unaffected.
- the complete Shubhra Basu poem preserves every intended line and stanza break;
- the two text-only advertisement pages are readable and visually balanced on desktop, mobile, and PDF;
- the memorial text and supplied image are complete, readable, undistorted, and appropriately identified;
- no new page is blank, clipped, overlapping, or missing content in the PDF.

Capture desktop and mobile screenshots, render the affected PDF pages, and include them in the walkthrough evidence.

### 16. Build and Regression Verification

Before proposing deployment:

- run the full unit and integration test suite;
- run the production website build;
- run the existing security and secret scans;
- run the relevant Playwright/browser suite;
- confirm the item count increases only by the three approved advertisements;
- compare the new PDF with the Sprint v3 baseline and explain every changed or shifted page;
- confirm all unchanged existing content remains equivalent to the Sprint v3 release;
- confirm all protected earlier release folders remain unchanged;
- review the git diff and ensure it contains only files needed for this correction and its tests/documentation.

PDF changes are expected only for the revised poem, the three new advertisement pages, contents/page-number updates, and necessary downstream pagination. Any other content difference must be investigated and reported.

### 17. Release and Deployment Approach

Treat this as a new, small sprint rather than modifying Sprint v3 records as though the defect had been fixed there.

Recommended sequence:

1. Read the current repository instructions and Sprint v3 walkthrough.
2. Inventory and preserve all revised and new incoming source files.
3. Inspect the production navigation defect and trace its generation source.
4. Create the new sprint PRD and atomic task list covering all five work packages.
5. Write failing regression tests before each implementation group.
6. Implement the source preservation, poem, advertisement, folder, and navigation changes.
7. Build a new review release and run the complete verification listed above.
8. Produce a walkthrough with source comparisons, desktop/mobile screenshots, and affected PDF-page evidence.
9. Create a preview deployment for manual approval.
10. Deploy to production only after explicit authorization.
11. Verify production and record the final URL, deployment, commit, and test results.

Do not modify production database contents during this publication-and-navigation sprint. If browser tests create viewer records, clearly identify and remove only those test records afterwards.

### 18. Acceptance Criteria

#### 18.1 Publication and intake

- [ ] The complete revised Shubhra Basu poem is extracted verbatim.
- [ ] Every intended poem line and stanza break is preserved on the website and in the PDF.
- [ ] The supplied four-line example renders as exactly four lines.
- [ ] The prior and revised poem source files remain recoverable and traceable.
- [ ] The M/s Balajee Infrate text-only advertisement is included with exactly the approved sentence.
- [ ] The Sarc Epic text-only advertisement is included with exactly the approved sentence.
- [ ] Both text-only advertisements are visually balanced without invented information or artwork.
- [ ] The memorial advertisement contains the exact approved wording and contributors.
- [ ] `Supriyo.JPG` is preserved and normalised without meaningful cropping or distortion.
- [ ] All three new advertisements have unique IDs and consistent tracker, manifest, website, contents, and PDF representation.
- [ ] Tracker source notes and contributor details match this change request.
- [ ] All files formerly under `v2-incoming` are safely consolidated or archived.
- [ ] No active path reference to `02_INCOMING_CONTENT/v2-incoming` remains.
- [ ] No incoming source file is lost or silently overwritten.

#### 18.2 Navigation

The change is accepted only when all of the following are true:

- [ ] The main website navigation contains exactly eight section links.
- [ ] Each required section label appears exactly once in the main navigation.
- [ ] The links follow the approved order.
- [ ] Each link points to the correct section start or first published item.
- [ ] Additional items do not create duplicate section links.
- [ ] Desktop navigation is readable and balanced.
- [ ] Mobile navigation wraps cleanly without clipping or overflow.
- [ ] Keyboard navigation and focus visibility remain functional.
- [ ] Viewer registration and gated magazine access remain functional.
- [ ] Administrator login and dashboard remain functional.
- [ ] Unrelated magazine content, manifest data, and tracker data are unchanged.
- [ ] PDF differences are limited to the authorised publication additions, poem correction, contents/page references, and resulting pagination.
- [ ] Earlier release outputs are unchanged.
- [ ] Automated tests, build, browser checks, security scan, and secret scan pass.
- [ ] A preview is reviewed before production deployment.
- [ ] Production deployment occurs only after explicit approval.

### 19. Instruction to the Development Session

Review this change request together with the repository instructions, the current Sprint v3 PRD, task list, walkthrough, and production deployment record. Verify the defect independently from the generated website and trace its root cause.

Create the next sprint planning files first and include all five work packages in the PRD and atomic task list. Then proceed through the approved development workflow with tests before implementation. Preserve and trace all source files before moving or transforming them. Do not treat the navigation correction as the only scope.

Stop and report any ambiguity in advertisement IDs or ordering, any filename collision during folder consolidation, any mismatch between the revised poem and this example, any missing `Supriyo.JPG`, or any requirement that would change unrelated editorial content, the database, authentication, or production configuration.
