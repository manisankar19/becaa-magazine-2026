# BECAA Maharashtra Magazine 2026
## Autonomous Codex Project Instructions

**Project status:** Version 0 (prototype and foundation)  
**Local Windows project root:** `E:\BECAA Works\2026 BECAA Magazine\BECAA_Magazine_2026`  
**Primary agent:** Codex in VS Code Agent mode, running locally on Windows  
**Last instruction update:** 1 August 2026

---

## 1. Mission

Build a maintainable publication system for the BECAA Maharashtra 2026 magazine. One structured publication source must produce:

1. A responsive website for desktop and mobile. This is the mandatory Version 0 deliverable.
2. A small working website prototype using real approved content.
3. If practical after the website works, a print-friendly HTML/PDF preview generated from the same source. This is useful preparation for the later magazine compilation, but it must not delay or block Version 0.

This is **Version 0**. More messages, articles, photographs and advertisements may arrive later. Design the system so new material can be added, validated, rebuilt and redeployed without recreating the website or manually rebuilding the whole magazine.

Do not begin with a full Word compilation. The current master Word file and the 2025 magazine are references and content sources. The first implementation target is a small website prototype containing exactly three publication items. A new Word file is not required.

---

## 2. Confirmed project structure

```text
BECAA_Magazine_2026
├── 01_REFERENCE_2025
├── 02_INCOMING_CONTENT
├── 03_ADVERTISEMENTS
├── 04_MAGAZINE_WORKING
├── 05_WEBSITE
└── 06_FINAL_OUTPUT
```

Confirmed important files:

- `01_REFERENCE_2025\Complete Magazine 2025.pdf`
- `01_REFERENCE_2025\2025 Magazine word file.docx`
- `04_MAGAZINE_WORKING\BECAA_2026_Content_Tracker.xlsx`
- `04_MAGAZINE_WORKING\BECAA_Magazine_2026_Master.docx`

Confirmed inventory at the start of Version 0:

- `02_INCOMING_CONTENT`: 19 files (`.docx` 12, `.jpeg` 3, `.jpg` 2, `.pdf` 2)
- `03_ADVERTISEMENTS`: 42 files (`.jpeg` 12, `.jpg` 13, `.pdf` 5, `.png` 10, `.pptx` 1, `.xlsx` 1)
- `05_WEBSITE`: empty
- `06_FINAL_OUTPUT`: empty

Recheck this inventory before implementation because files may have been added after this instruction was written.

---

## 3. Source-of-truth rules

Use the following hierarchy:

1. **Editorial register:** `04_MAGAZINE_WORKING\BECAA_2026_Content_Tracker.xlsx`
2. **Publication manifest:** a central YAML file inside `05_WEBSITE`
3. **Normalized publication content:** Markdown and normalized asset copies inside `05_WEBSITE`
4. **Original evidence:** untouched files in folders 01, 02 and 03

The tracker controls editorial identity, permission, status and source matching. The publication manifest controls what the current website and print build include. Do not duplicate full article text in YAML. Store text in Markdown files referenced by the manifest.

The master Word file is not the final technical source of the web and PDF builds. Use it to identify existing material, wording, ordering ideas and layout references only.

---

## 4. Non-negotiable safety rules

1. Never delete, rename, move, overwrite, resize in place, or edit any original file in:
   - `01_REFERENCE_2025`
   - `02_INCOMING_CONTENT`
   - `03_ADVERTISEMENTS`
2. Do not alter `BECAA_2026_Content_Tracker.xlsx` unless the user explicitly approves a tracker update.
3. Do not alter `BECAA_Magazine_2026_Master.docx` during Version 0.
4. Put all code, Markdown and normalized asset copies under `05_WEBSITE`.
5. Put generated review and release artifacts under versioned folders in `06_FINAL_OUTPUT`.
6. Never invent missing text, contributor details, sponsor matches, permissions or approval status.
7. Mark uncertainty as `Needs verification` and exclude it from a release build unless the user explicitly authorizes a labelled prototype placeholder.
8. Preserve English and Bengali Unicode exactly. Do not silently rewrite editorial content.
9. Do not expose personal information on the public website unless it is approved for publication.
10. Do not commit credentials, tokens, `.env` files, deployment metadata or machine-specific secrets.
11. Do not deploy Version 0 until the local prototype passes and the user gives explicit deployment approval.
12. Before overwriting existing generated output, create a new versioned release folder or confirm that regeneration is safe.

Actions inside a newly created `05_WEBSITE` tree and a new versioned output folder may proceed autonomously. Stop and ask only when a decision changes editorial meaning, permissions, an existing user file, publication scope, or deployment target.

---

## 5. Required technology

Use a lightweight static architecture:

- Eleventy (11ty)
- Nunjucks or Liquid templates
- HTML5 and CSS
- Markdown for message/article text
- Minimal vanilla JavaScript
- YAML publication manifest
- Playwright with bundled Chromium for website testing and screenshots
- Optional CSS paged media and Chromium PDF compilation after the website prototype passes

Avoid React, a database and a heavy UI framework for Version 0. Avoid essential CDN dependencies. Store approved fonts locally when licensing permits. Provide sensible system-font fallbacks for English and Bengali.

Use Node.js LTS. Pin important dependency versions in `package-lock.json`. The build must work from PowerShell on Windows.

---

## 6. Target website structure

Create or adapt the following structure:

```text
05_WEBSITE
├── package.json
├── package-lock.json
├── eleventy.config.mjs
├── README.md
├── .gitignore
├── src
│   ├── _data
│   │   └── publication.yaml
│   ├── _includes
│   │   ├── layouts
│   │   └── components
│   ├── content
│   │   ├── messages
│   │   └── articles
│   ├── assets
│   │   ├── css
│   │   ├── js
│   │   ├── fonts
│   │   └── normalized
│   │       ├── advertisements
│   │       │   ├── print
│   │       │   └── web
│   │       └── images
│   │           ├── print
│   │           └── web
│   ├── index.njk
│   └── print.njk
├── scripts
│   ├── inventory.mjs
│   ├── import-content.mjs
│   ├── normalize-assets.mjs
│   ├── validate.mjs
│   ├── compile-pdf.mjs
│   ├── visual-qa.mjs
│   └── release.mjs
├── tests
└── _site
```

Generated folders such as `_site`, temporary screenshots and local caches should be reproducible and ignored by Git where appropriate.

---

## 7. Publication manifest

Use `05_WEBSITE\src\_data\publication.yaml` as the single build manifest. Include publication metadata and an ordered item list.

Each item should support at least:

```yaml
- id: MSG-001
  type: message
  title: ""
  language: en
  contributor: ""
  designation: ""
  passing_year: ""
  branch: ""
  section: messages
  order: 10
  source_file: ""
  source_fingerprint: ""
  content_file: ""
  web_asset: ""
  print_asset: ""
  permission: ""
  editorial_status: ""
  verification: verified
  web_include: true
  print_include: true
  caption: ""
  credit: ""
  notes: ""
```

Use stable IDs such as `MSG-001`, `ART-001`, `EVT-001`, `ADV-001` and `GAL-001`. Never reuse an ID. Do not renumber existing IDs when later content is inserted. Control presentation order with the separate `order` field.

Record a source fingerprint such as SHA-256 for imported files. This supports change detection during later updates.

---

## 8. Phase V0-A: audit before coding

Recursively inspect all six folders. Create:

`04_MAGAZINE_WORKING\PROTOTYPE_INSPECTION_REPORT.md`

The report must cover:

- Current folder inventory and timestamps
- Tracker sheet names, exact column names and populated row count
- Tracker ID pattern, duplicate IDs and malformed IDs
- Missing files referenced in the tracker
- source files not represented in the tracker
- probable duplicate files using hashes and normalized filenames
- content approval and permission gaps
- advertisement-to-sponsor/file matching, with confidence and reasons
- uncertain advertisement matches marked `Needs verification`
- PDF page counts and text/scanned classification
- DOCX extraction feasibility
- image dimensions, DPI metadata, aspect ratio and A4 print suitability
- Bengali content and font requirements
- relevant layout patterns from the 2025 PDF and Word reference
- structure and condition of the 2026 master Word file

Independently verify previously suspected duplicate tracker Item ID `12` and repeated sponsor serial `12`. Report findings but do not automatically correct source workbooks.

Also create a machine-readable inventory in:

`04_MAGAZINE_WORKING\source-inventory.json`

The inventory must contain relative path, extension, size, modified time, SHA-256 hash and relevant media metadata. Never store absolute `E:` paths in publication-facing output.

---

## 9. Phase V0-B: select exactly three items

Select only:

1. One approved office-bearer message
2. One approved ordinary article or event report
3. One reliably matched advertisement

Selection priority:

1. Item is present in the tracker.
2. Permission covers both print and web.
3. Editorial status is approved or its clear equivalent.
4. Source file exists.
5. Text/artwork can be extracted or normalized reliably.
6. Contributor or sponsor identity is unambiguous.

If no qualifying office-bearer message exists, a clearly labelled master-Word reference sample may be used only in the prototype with:

`Reference sample — not approved for 2026 publication`

If no advertisement artwork can be matched reliably, use a clearly labelled non-release placeholder:

`Advertisement artwork awaiting verification`

Do not invent an advertisement. Record selected items and the selection reason in the inspection report.

---

## 10. Phase V0-C: normalize selected content

For the message and article:

- Extract text into separate UTF-8 Markdown files.
- Preserve wording, headings, paragraphs, Bengali script, captions and credits.
- Do not correct grammar or rewrite prose without approval.
- Represent unclear extraction with `<!-- NEEDS VERIFICATION: reason -->`.
- Exclude unreliable OCR text from a release build.
- Keep a traceable relative path to the original source.

For the advertisement:

- Keep the original untouched.
- Create a print derivative suitable for its intended A4 placement, normally near 300 dpi at placed size.
- Create a web-optimized WebP or JPEG derivative.
- Maintain aspect ratio.
- Do not crop logos, company names, addresses, contact details, QR codes or legal text.
- Preserve transparency only where it improves output.
- Record original, print and web paths in the manifest.

Use deterministic normalized filenames based on stable IDs, for example:

```text
ADV-001-company-name-print.png
ADV-001-company-name-web.webp
```

Rerunning normalization should produce the same paths and must not create duplicate variants with names such as `final2`, `latest` or `copy`.

### Advertisement availability and exclusion rule

- An advertisement may be published as artwork only when its exact source artwork file is available and can be matched unambiguously with the tracker entry.
- If an advertisement source file is not available, mark that advertisement artwork as `Excluded from the current release`.
- Exclusion of missing advertisement artwork does not require stopping the complete magazine release.
- If the advertiser or sponsor name is confirmed from the tracker or sponsor-detail workbook, the company name may instead appear in a separate `Sponsor Acknowledgements / With Thanks` section.
- A sponsor acknowledgement is not an advertisement and must not be represented as if advertisement artwork were available.
- Do not use advertisement artwork from Magazine 2025 or any earlier year unless explicit approval for reuse in 2026 is recorded.
- Repeated or duplicate advertisement artwork must remain excluded from the release until the preferred occurrence is approved.
- Where the advertiser name itself is missing or cannot be verified, exclude the item completely.
- Items marked `Yet to receive` may remain recorded in the tracker but must not block the current release. Include them only in a later release after the source content arrives and receives the required approval.
- Missing, duplicate, ambiguous and previous-year advertisement artwork must be reported, but these items must not prevent release of all other eligible content.

---

## 11. Phase V0-D: build the mandatory website prototype

Website requirements:

- Responsive desktop and mobile layouts
- Elegant, restrained alumni-souvenir appearance
- Warm and dignified colour palette
- Clear cover/landing area and navigation
- Message, article and advertisement views
- English and Bengali rendering
- Semantic HTML and keyboard accessibility
- Useful alt text
- Lightweight pages and minimal JavaScript
- No essential external CDN dependency
- Link to a print-preview page only if the optional print feature is implemented

Optional print-preview requirements, to implement only after the website works and without blocking Version 0:

- Separate A4 portrait print HTML from the same manifest and Markdown
- Cover page and consistent margins
- Page numbers except where intentionally omitted
- Clear section starts
- Controlled page breaks
- Reduced widows and orphans
- Captions kept with images
- Ads fitted without distortion or cropping
- Print-safe colours
- No web navigation or interactive controls
- No overflow, clipped text or accidental blank pages
- Correct Bengali glyph shaping and font embedding where practical

No Word output is required. Do not copy the 2025 design mechanically. Use it as a visual reference while making a cleaner 2026 website.

---

## 12. Validation gates

Create automated validation that exits non-zero for release-blocking errors:

- Duplicate manifest IDs
- Missing required manifest fields
- Missing referenced Markdown or asset files
- Invalid relative paths or paths escaping the project
- Missing permission or editorial status
- `web_include` or `print_include` enabled while verification is unresolved
- Unresolved `TBD`, `TODO`, `Needs verification` or extraction comments in release content
- Broken internal links
- Missing image dimensions or metadata
- Raster artwork below the configured print threshold at placed size
- Missing required caption, credit or alt text
- Duplicate content hashes where duplication is not intentional
- Unsupported language/encoding problems

Warnings are allowed for explicitly labelled prototype references, but warnings must appear in both reports:

- `validation-report.json`
- `validation-summary.md`

Keep thresholds in a small documented configuration file so they can be adjusted later without rewriting the validator.

---

## 13. Required commands

Provide and test these commands, or clear equivalents:

```powershell
npm install
npm run inventory
npm run validate
npm run build
npm run serve
npm run pdf
npm run test
npm run qa
npm run release:v0
```

`npm run release:v0` must perform, in order:

1. Validate manifest and content.
2. Build the website.
3. Run automated website tests.
4. Capture desktop and mobile QA screenshots.
5. If the optional print feature has been implemented, build and test its HTML/PDF without making it a Version 0 release blocker.
6. Copy the reproducible deliverables into a new versioned output folder.
7. Exit non-zero if an essential website step fails.

Do not claim success only because commands exited successfully. Confirm expected files exist and inspect visual outputs.

---

## 14. Visual QA

Use Playwright at representative mobile and desktop sizes. Inspect every website route and state for:

- clipped or overlapping text
- horizontal overflow
- unreadable font size or contrast
- broken navigation
- missing images
- distorted artwork
- advertisement scaling errors
- Bengali missing glyphs, broken conjuncts or incorrect line wrapping

If the optional A4 HTML/PDF preview is implemented, also inspect its pages for unexpected blanks, bad page breaks, clipped content, separated captions and low-resolution print assets.

Fix observed defects, rebuild and rerun the relevant test. Store QA evidence with the release output.

---

## 15. Version 0 outputs

Create:

`06_FINAL_OUTPUT\V0_PROTOTYPE_01`

Include:

- built static website or a reproducible packaged build
- desktop and mobile website screenshots
- optional print-layout HTML/PDF, if implemented
- `validation-report.json`
- `validation-summary.md`
- build summary
- website QA screenshots and, if applicable, rendered PDF page images
- reproduction instructions
- release manifest containing version, build time, Git commit if available, included item IDs and source fingerprints

Do not label this as the final 2026 magazine.

At completion, report:

- files inspected
- three selected prototype items
- files created or changed
- commands run
- test and QA results
- exact website location and, if implemented, print HTML/PDF locations
- warnings and items requiring human verification
- blockers
- recommended next step

Then stop. Wait for the user's approval before full import or public deployment.

---

## 16. Incremental content workflow after Version 0

Once Version 0 is approved, future content must be handled incrementally. Do not recreate the project.

For each update batch:

1. Rescan folders 02 and 03 and compare size, modified time and SHA-256 against `source-inventory.json`.
2. Classify files as new, changed, unchanged, moved/renamed candidate, or possible duplicate.
3. Match new/changed files to the tracker.
4. Produce an update report before publication changes.
5. Import only approved, permission-cleared and reliably matched items.
6. Assign new stable IDs without renumbering existing items.
7. Normalize only new or changed assets.
8. Preserve any human-edited Markdown unless the source changed and the user approves re-extraction.
9. Update manifest ordering without breaking existing URLs.
10. Run complete validation, website build, automated tests and visual QA. Also rebuild the optional print HTML/PDF if that feature exists.
11. Create a new output folder, for example `V0_PROTOTYPE_02`, `V1_REVIEW_01` or `V1_RELEASE_01`.
12. Record added, changed, removed and excluded items in `CHANGELOG.md`.

Never remove an already published item merely because its original file is temporarily missing. Flag the condition and ask for direction.

Recommended future commands:

```powershell
npm run update:scan
npm run update:report
npm run import:approved
npm run release:review
```

These may be implemented after the Version 0 prototype succeeds.

---

## 17. Git and recoverability

If the project is not already a Git repository, propose initializing Git after Version 0 files are created. Do not publish the repository without approval.

Recommended practice:

- Commit the clean foundation before importing full content.
- Commit each approved content batch separately.
- Tag tested releases, for example `v0.1-prototype` and `v1.0-2026`.
- Exclude secrets, temporary caches and bulky reproducible files as appropriate.
- Keep the manifest, Markdown, templates, styles, scripts, lockfile and documentation under version control.
- Never use destructive Git commands on user work.

---

## 18. Deployment and redeployment

Deployment is a separate approval stage. First make the static build portable. Do not hard-code Vercel, EC2 or any one provider into publication logic.

After the user selects a target, add provider configuration without changing content architecture. A deployment must always use the tested website output from the same manifest and commit that passed review. If a print/PDF edition also exists, it must be built from that same release source.

Before first deployment, provide:

- recommended target and rationale
- required account/project configuration
- environment variables, if any
- expected public URL behavior
- rollback method
- deployment and bandwidth considerations

Deployment rules:

1. Ask for explicit approval before the first public deployment.
2. Never expose credentials in logs or source files.
3. Run the full release pipeline before deployment.
4. Deploy only if validation passes.
5. Perform a post-deployment smoke test on desktop and mobile routes.
6. Confirm Bengali text, images and internal links. Also confirm print-preview behavior if that optional feature exists.
7. Record deployment time, release ID, commit and public URL.
8. Keep the previous successful deployment available for rollback where the provider supports it.

For later approved content additions, Codex may rebuild and redeploy autonomously only when:

- the user has authorized that update batch for publication;
- no unresolved verification or permission errors remain;
- the complete validation and test pipeline passes; and
- the selected deployment provider is already configured and the change does not require new credentials, billing or infrastructure decisions.

If any condition fails, prepare the build and report the blocker without deploying.

---

## 19. Decision policy for autonomous work

Proceed without interruption for reversible technical decisions inside the agreed architecture. Make sensible choices, document them and keep the implementation simple.

Stop and ask the user when:

- source-to-tracker matching is ambiguous;
- permission or approval is missing;
- editorial wording needs correction or rewriting;
- a source file appears corrupted;
- existing user work would be overwritten;
- full-magazine import is about to begin;
- the first public deployment is ready;
- a new paid service, account, domain, credential or infrastructure change is required;
- validation finds a release-blocking problem that cannot be resolved without editorial judgment.

When blocked, continue all independent safe work and present one concise grouped question rather than repeatedly stopping for minor choices.

---

## 20. Immediate execution instruction

Use the confirmed inspection summary as a starting point, but verify it against the current local files. Then perform Phases V0-A through V0-D and the Version 0 validation/QA pipeline.

Do **not** follow the earlier proposed sequence of building the complete Word magazine first and leaving `05_WEBSITE` empty. For Version 0:

- keep the master Word document unchanged;
- build the three-item website prototype in `05_WEBSITE` as the mandatory Version 0 output;
- optionally generate a matching A4 HTML/PDF preview after the website passes, without creating or requiring a Word output;
- place reviewed prototype outputs in `06_FINAL_OUTPUT\V0_PROTOTYPE_01`;
- stop before full import and deployment.

Begin by stating the current project root, the three-item boundary, the files you will not modify, and the first inspection action. Then work autonomously until a genuine approval decision or blocker is reached.
