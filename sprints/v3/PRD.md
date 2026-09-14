# Sprint v3 — PRD: Publication Updates + Viewer Registration Portal

Status: **Approved for `/prd` → `/dev`** (all decisions A–Q approved as recommended by the user on 2026-09-14; advertisement-title correction of 2026-09-14 incorporated)
Prepared: 2026-09-14
Baseline: `06_FINAL_OUTPUT/V2_REVIEW_01/` (protected; verified intact against git `HEAD` on 2026-09-14 — see §1.1)
Requirements source: `sprints/v3/CHANGEV3_SUMMARY.md`
Proposed first output: `06_FINAL_OUTPUT/V3_REVIEW_01/`
Preserve unchanged: every folder under `06_FINAL_OUTPUT/` (V0, V1, V2), every file in `01_REFERENCE_2025/` and `03_ADVERTISEMENTS/`, and `BECAA_Magazine_2026_Master.docx`.

---

## 1. Overview

Sprint v3 does two coordinated things. **Group A (publication updates)** replaces the Secretary's Desk message with the revised version received from Abir Banerjee, publishes the now-approved Bengali story by Siddhartha Mukhopadhyay, retitles every published advertisement to "With best compliments from [Company Name]", and gives every advertisement page a restrained background colour matched to its artwork so that small or landscape artwork no longer sits in a sea of white. **Group B (application feature)** converts the purely static Eleventy site into a gated publication: visitors register (name, email, category and a few category-specific fields) before reading the magazine, registrations are stored in a managed PostgreSQL database behind server-side API endpoints, and a separately authenticated administrator can view statistics, search records and download a CSV.

Group A is a normal incremental content batch in the established V1/V2 pipeline. Group B is the first change that introduces a server, a database, secrets and personal data, and therefore the first change with a real security and privacy surface. The two groups share one release (`V3_REVIEW_01`) but are built and tested as separate task streams so that a problem in Group B never blocks reviewing Group A's content.

### 1.1 Baseline recovery findings (2026-09-14, after the EC2 reboot)

| Check | Result |
|---|---|
| `git log` | 20 commits, `HEAD = db5b6ab` (Sprint v2 walkthrough). No commits lost. |
| `V2_REVIEW_01` release manifest, `website/index.html`, print PDF | SHA-256 identical to `HEAD`. PDF: 67 pages, A4. |
| `V1_COMPLETE_REVIEW_03` manifest, `index.html`, PDF; `V0_PROTOTYPE_01` manifest | SHA-256 identical to `HEAD`. |
| `git status` | Clean except: (a) `02_INCOMING_CONTENT/secretary desk.docx` **modified**, (b) `02_INCOMING_CONTENT/v2-incoming/Siddhartha Mukhopadhyay story.docx` **modified**, (c) `sprints/v3/` untracked. Nothing changed under `05_WEBSITE`, `04_MAGAZINE_WORKING`, `06_FINAL_OUTPUT`, `01_*`, `03_*`. |
| Toolchain | Node 22.23.2, npm 10.9.8, `node_modules` present, Playwright Chromium binaries present (`chromium-1181` for the pinned Playwright 1.54.2), `vercel` CLI and local `psql`/`pg_ctl` present on this host. |
| `npm audit` | 4 high: `js-yaml` 3.x transitive via `gray-matter` (fix available, non-breaking), `playwright` (<1.55.1), `sharp` (breaking upgrade), `xlsx` (no fix). Same state the v2 walkthrough recorded. |

**Important:** the two revised DOCX files were dropped **in place over the previously committed originals** (same path, new bytes). INSTRUCTION.md §4 rule 1 says originals in `02_INCOMING_CONTENT` must never be overwritten; this happened outside the pipeline. The previous bytes are fully recoverable from git (`f90bd32`/`HEAD`), so nothing is lost, but the revised files are currently **uncommitted** and would be destroyed by any `git checkout -- .` or `git stash`. See Decision A.

---

## 2. Goals

1. `MSG-003` (Secretary Desk) publishes the revised text verbatim on the website and in the PDF, with the superseded text preserved, the replacement recorded in the tracker and `CHANGELOG.md`, and no duplicate message created.
2. Tracker Item 24 (Siddhartha Mukhopadhyay, Bengali story "প্যাঁড়া") becomes a new manifest item (`ART-012`) rendered correctly on web and print, with its existing tracker row updated in place (no new row).
3. Every published advertisement (all 22 `ADV-` items) displays the heading **With best compliments from [Company Name]** (for example `ADV-018` → "With best compliments from Eframe") everywhere the title is shown (web card, web contents/navigation list, PDF page, PDF contents, manifest, tracker display title), using the company name already recorded, with IDs, source artwork and normalized filenames unchanged and no published title still ending in "Advertisement".
4. Every advertisement page (web frame and A4 print page) has a per-advertisement background colour, auto-sampled from the artwork's edge and overridable per item in the manifest, with heading/page-number contrast guaranteed by a validator check and every page visually inspected.
5. A visitor must register (with explicit consent and a visible privacy notice) before reading the magazine; registrations are validated client- and server-side, rate-limited, and stored in managed PostgreSQL. Nothing sensitive reaches client-side code.
6. An administrator with server-side authentication, secure sessions and logout can see totals, category/batch/department breakdowns, registration timestamps, searchable records and a CSV export limited to approved fields.
7. `V3_REVIEW_01` passes validation, unit/integration tests, automated site tests, desktop/mobile visual QA, PDF QA and a live-browser end-to-end registration/admin run before packaging. No deployment happens in this sprint without a separate explicit approval.

---

## 3. User stories

- As Abir Banerjee (Secretary), I want my revised message to replace the earlier draft exactly as I wrote it, so the published magazine carries my final wording.
- As Siddhartha Mukhopadhyay, I want my story to appear with correct Bengali rendering and my correct byline (Electrical, 1986 Batch), on web and in print.
- As a sponsor (for example Eframe), I want my page headed "With best compliments from [my company]" rather than "[my company] Advertisement", and my artwork presented on a matching background rather than floating on white.
- As the editorial reviewer, I want each advertisement page to look deliberately designed, with readable headings and page numbers, and a single review sheet showing every chosen background colour.
- As a visitor (alumnus, sponsor representative or guest), I want to register once in under a minute, understand why my details are collected, and then read the whole magazine without creating a password.
- As the BECAA Maharashtra committee, I want to know how many people viewed the magazine, which batches and departments they came from, and to download a clean CSV for follow-up, without anyone being able to scrape the visitor list from the public site.
- As the project owner, I want V0, V1 and V2 outputs to remain byte-identical after this sprint, secrets to live only in deployment environment variables, and a documented rollback for both the site and the database.

---

## 4. Group A — Publication updates

### 4.1 MSG-003 — Secretary's Desk replacement

**Match evidence.** The revised `02_INCOMING_CONTENT/secretary desk.docx` (SHA-256 `ed3fd766…`, 32,923 bytes, DOCX `lastModifiedBy: Banerjee, Abir`, modified 2026-09-06) and the committed original (SHA-256 `df446f44…`, 14,879 bytes, the fingerprint currently recorded on `MSG-003` and tracker Item 18) are the same message by the same author: same sign-off ("Abir Banerjee / ETC '92 / Secretary, BECAA Maharashtra"), same subject matter, same events mentioned (Swar Setu, Bijoya Sammilani, picnic). This is a **replacement of `MSG-003`**, not a new item. Text-level comparison was done with `mammoth` on both versions:

| | Original (V1/V2 published) | Revised |
|---|---|---|
| Heading line | "Secretary's Desk" | "From the Secretary's Desk" |
| Body length | 2,594 chars, 8 paragraphs | 3,501 chars, 14 paragraphs (adds a pull-quote paragraph in quotation marks and a "With warm regards," closing) |
| Embedded images | none | one: `word/media/image1.png`, 162×65 px, a scanned handwritten signature "Abir Banerjee" placed after "With warm regards," |
| Bengali | none | none |

**Implementation.**
- New script `scripts/extract-v3-secretary-desk.mjs` (same pattern as `extract-v2-palash-article.mjs`, reusing `buildArticleMarkdown`) rewrites `src/content/messages/MSG-003-secretary-desk.md` with the revised body verbatim and the new fingerprint.
- Signature block: `mammoth` raw text collapses the soft line breaks in the closing ("SecretaryBECAA Maharashtra"). The extractor must map `<w:br/>` to line breaks so the closing renders as separate lines, exactly as V1 already had to do for the concatenated `MSG-002`/`MSG-003` signatures. No wording is changed.
- The scanned signature image is **not** imported (Decision B, recommended). 162×65 px is far below the print threshold and no other message carries an image.
- `publication.yaml` `MSG-003`: update `source_fingerprint`; keep `id`, `order: 30`, `content_file`, contributor fields. Title: see Decision C.
- Superseded source preservation: see Decision A.
- Tracker Item 18: append to `Remarks` — "Sprint v3: revised source received 2026-09-14 (SHA-256 ed3fd766…) replaces the 01.08.2026 version (SHA-256 df446f44…)." No other field changes unless Decision C changes the title. Tracker edits happen only through a snapshot-first script (existing `TRACKER_SNAPSHOTS` convention).
- `CHANGELOG.md`: "Changed — MSG-003 body replaced with revised text; earlier version preserved at …".

### 4.2 ART-012 — Siddhartha Mukhopadhyay story ("প্যাঁড়া")

**Match evidence.** The revised `02_INCOMING_CONTENT/v2-incoming/Siddhartha Mukhopadhyay story.docx` (SHA-256 `9bbe16d1…`, 11,870 bytes, no embedded media) now contains a complete 4,837-character Bengali story. First line: "প্যাঁড়া/ সিদ্ধার্থ মুখোপাধ্যায়" (title "প্যাঁড়া", author name). It extracts cleanly with `mammoth`: no mojibake, no truncation, 12 paragraphs. The committed original contained only "Story upcoming". Tracker row **24** already exists (`Type: Story`, `Contributor: Siddhartha Mukhopadhyay`, `1986 / Electrical`, `Print Section: College Memories`, `Permission: Pending`, `Status: Excluded – Content and permission pending`, Web/Print Include: No). **No new tracker row will be created.**

**Implementation.**
- Manifest ID **`ART-012`** (next free `ART-` ID; "Story"-type rows fold into `ART-`/`articles` per the V1 and V2 precedent). `order: 220` (directly after `ART-011`). `language: bn`. `contributor: Siddhartha Mukhopadhyay`, `passing_year: '1986'`, `branch: Electrical`. `web_include: true`, `print_include: true`. `notes: 'Tracker Item ID 24. Exact approved source: Siddhartha Mukhopadhyay story.docx.'`
- `scripts/extract-v3-siddhartha-story.mjs` → `src/content/articles/ART-012-item.md`, verbatim body. The author's own name in the first line stays in the body (as Palash Biswas's "লিখেছেন:" line did).
- Title: see Decision D (recommended manifest title "প্যাঁড়া", tracker `Title / Item` updated to match).
- Tracker Item 24 update (snapshot first): `Permission → Print and web`, `Status → Approved`, `Web Include → Yes`, `Print Include → Yes`, `Received Date → 14.09.2026`, `Remarks` appended: "Sprint v3: real content received and approval confirmed by the editor on 2026-09-14; published as ART-012."
- `scripts/validate-tracker.mjs` currently hard-codes that Item 24 must remain excluded; this rule must be replaced by "Item 24 approved and included" and the row count assertion kept at 52.
- The tracker's Print Section for this row is "College Memories"; the manifest has no section for that and the site groups all prose under `articles`. Keep `section: articles` (consistent with V2's handling of Item 23).

### 4.3 Advertisement titles — "With best compliments from [Company Name]" (all 22 published advertisements)

**Evidence.** Every one of the 22 advertisements published in `V2_REVIEW_01` currently carries the generic public-facing title `[Company] Advertisement` in both `publication.yaml` (`title`) and the tracker (`Title / Item`). For all 22, the manifest `contributor` field and the tracker `Contributor / Company` field hold the **same confirmed company name**, so the new title can be derived mechanically without guessing. Titles ending in "Advertisement" also appear in the PDF contents list and the web contents/navigation list because both are rendered from the manifest title.

**Requirement.** For each published `ADV-` item, replace the generic title with exactly:

`With best compliments from [Company Name]`

where `[Company Name]` is the manifest `contributor` value verbatim (identical to the tracker `Contributor / Company` value). The wording must appear consistently wherever the title is displayed: website advertisement card (`<h2>`), website contents/navigation list, PDF advertisement page (`<h1>`), PDF contents page, `publication.yaml` `title`, and tracker `Title / Item`.

| ID | Current title | Confirmed company name (manifest `contributor` = tracker) | New title |
|---|---|---|---|
| ADV-001 | Skylark Advertisement | Skylark | With best compliments from Skylark |
| ADV-002 | PNB Housing Advertisement | PNB Housing | With best compliments from PNB Housing |
| ADV-003 | Vistaar Finance Advertisement | Vistaar Finance | With best compliments from Vistaar Finance |
| ADV-004 | Gainwell Technologies Advertisement | Gainwell Technologies | With best compliments from Gainwell Technologies |
| ADV-005 | Tata Capital Ltd. Retail Finance Advertisement | Tata Capital Ltd. (Retail Finance) | With best compliments from Tata Capital Ltd. (Retail Finance) |
| ADV-006 | Tata Capital Housing Finance Ltd. Advertisement | Tata Capital Housing Finance Ltd. | With best compliments from Tata Capital Housing Finance Ltd. |
| ADV-007 | OnShore Construction Pvt Ltd Advertisement | OnShore Construction Pvt Ltd | With best compliments from OnShore Construction Pvt Ltd |
| ADV-008 | Roofs & Ceilings Advertisement | Roofs & Ceilings | With best compliments from Roofs & Ceilings |
| ADV-010 | Indus Grand Advertisement | Indus Grand | With best compliments from Indus Grand |
| ADV-011 | Axelon Advertisement | Axelon | With best compliments from Axelon |
| ADV-012 | Aarvi Encon Advertisement | Aarvi Encon | With best compliments from Aarvi Encon |
| ADV-013 | Anand Rathi Advertisement | Anand Rathi | With best compliments from Anand Rathi |
| ADV-014 | Future Netwings Solutions Advertisement | Future Netwings Solutions | With best compliments from Future Netwings Solutions |
| ADV-015 | Swaraj Shoes Advertisement | Swaraj Shoes | With best compliments from Swaraj Shoes |
| ADV-017 | UREDCONNECT Advertisement | UREDCONNECT | With best compliments from UREDCONNECT |
| ADV-018 | Eframe Advertisement | Eframe | With best compliments from Eframe |
| ADV-019 | Network Techlabs Advertisement | Network Techlabs | With best compliments from Network Techlabs |
| ADV-020 | Schnelltech Global Advertisement | Schnelltech Global | With best compliments from Schnelltech Global |
| ADV-021 | Bhavik Advertisement | Bhavik | With best compliments from Bhavik |
| ADV-022 | Pratap Caterer Advertisement | Pratap Caterer | With best compliments from Pratap Caterer |
| ADV-023 | Clover Blakefield Reality LLP Advertisement | Clover Blakefield Reality LLP | With best compliments from Clover Blakefield Reality LLP |
| ADV-026 | CETEST Advertisement | CETEST | With best compliments from CETEST |

Two names are carried exactly as recorded, per the "do not guess or rewrite" rule: `ADV-005` uses the recorded contributor form "Tata Capital Ltd. (Retail Finance)" (the old title had dropped the parentheses), and `ADV-023` keeps the recorded spelling "Reality LLP". If either should read differently, that is a tracker correction to approve separately, not a change this sprint makes on its own.

**Rules (binding on implementation).**
1. Company names come only from the confirmed `contributor` / `Contributor / Company` values already recorded; no name is guessed, expanded, abbreviated or re-spelled.
2. Advertisement IDs are unchanged.
3. Source artwork files in `03_ADVERTISEMENTS/` are not renamed, edited or replaced.
4. Normalized artwork files (`ADV-###-<old-slug>-{web,print}.*`) are not renamed; their names are deterministic ID-based paths and are referenced by QA evidence.
5. Wording printed inside the artwork itself is never altered.
6. Excluded advertisements (`ADV-009`, `ADV-016`, `ADV-024`, `ADV-025`, `ADV-027`) remain excluded; their tracker titles are left as they are and they are not retitled, imported or acknowledged by this change.
7. `alt` text ("[Company] advertisement artwork") is a description of the image, not a title, and stays unchanged.

**Implementation.**
- `scripts/retitle-advertisements.mjs` (with a pure, unit-tested core `advertisement-title-core.mjs`): for every manifest item of `type: advertisement` whose `title` matches `^(.+) Advertisement$` or `^Advertisement from (.+)$`, set `title` to `With best compliments from ${contributor}`; refuse to run if any published advertisement has an empty `contributor`, if `contributor` does not equal the tracker `Contributor / Company` for that ID, or if a title does not match one of the two generic patterns (so an unexpected title is surfaced, not silently rewritten).
- The same script updates the tracker `Title / Item` for the same 22 IDs only, after a `TRACKER_SNAPSHOTS` backup, appending a dated note to `Remarks`.
- No template change is needed for the wording itself: the web card, web contents/nav list, PDF page and PDF contents already render `item.title`. The advertisement page byline is already suppressed for advertisements in print; on the web the byline shows `contributor`, which would now duplicate the company name under the heading, so the web byline is suppressed for advertisements too.
- `validate.mjs` gains a permanent rule: every `type: advertisement` item with `web_include` or `print_include` true must have a title of the exact form `With best compliments from <contributor>`; any published advertisement title ending in "Advertisement" is an **error**, not a warning.
- `test-site.mjs` and `pdf-qa.mjs` assert the same on rendered output (see §9).
- `CHANGELOG.md`: "Changed — all 22 published advertisement titles retitled to 'With best compliments from [Company Name]'."

### 4.4 Advertisement page backgrounds

**Evidence.** All 22 published advertisement print assets were edge-sampled (2 % strips on all four sides). Every one has a uniform edge colour (all four strips agree), so automatic edge sampling is reliable for this set. Eleven artworks are landscape or near-square and therefore leave most of the portrait A4 page white (worst: ADV-003 at 3.0:1, ADV-022 at 2.1:1, ADV-012/ADV-019 at 2.0:1, ADV-018 at 1.78:1).

Sampled edge colours (proposed defaults; subject to the review sheet in the release):

| ID | Advertiser | Edge colour (RGB) | Tone | Proposed text ink |
|---|---|---|---|---|
| ADV-001 | Skylark | 182,226,242 | light blue | dark |
| ADV-002 | PNB Housing | 135,63,62 | dark maroon | light |
| ADV-003 | Vistaar Finance | 40,76,121 | dark navy | light |
| ADV-004 | Gainwell Technologies | 192,170,116 | tan | dark |
| ADV-005 | Tata Capital (Retail Finance) | 159,191,209 | light blue | dark |
| ADV-006 | Tata Capital Housing Finance | 161,181,201 | light blue-grey | dark |
| ADV-007 | OnShore Construction | 205,203,203 | light grey | dark |
| ADV-008 | Roofs & Ceilings | 139,140,138 | mid grey | dark |
| ADV-010 | Indus Grand | 194,186,181 | warm grey | dark |
| ADV-011 | Axelon | 234,217,218 | pale pink | dark |
| ADV-012 | Aarvi Encon | 207,216,218 | light grey-blue | dark |
| ADV-013 | Anand Rathi | 209,182,170 | light rose | dark |
| ADV-014 | Future Netwings | 104,127,154 | slate | light |
| ADV-015 | Swaraj Shoes | 158,160,161 | mid grey | dark |
| ADV-017 | UREDCONNECT | 101,90,96 | dark plum | light |
| ADV-018 | Eframe | 209,205,28 | **yellow** (matches the example in the summary) | dark |
| ADV-019 | Network Techlabs | 18,21,22 | near black | light |
| ADV-020 | Schnelltech Global | 172,158,97 | olive | dark |
| ADV-021 | Bhavik | 209,207,206 | light grey | dark |
| ADV-022 | Pratap Caterer | 208,211,209 | light grey | dark |
| ADV-023 | Clover Blakefield Realty | 88,214,219 | bright cyan (candidate for a manual override) | dark |
| ADV-026 | CETEST | 200,187,159 | beige | dark |

**Design rules.**
- Manifest schema gains three optional advertisement fields: `page_background` (`#rrggbb`), `page_background_mode` (`auto` | `manual` | `none`, default `auto`), `page_ink` (`dark` | `light` | `auto`, default `auto`). A new script `scripts/sample-ad-backgrounds.mjs` computes the edge colour with `sharp`, writes `page_background` into the manifest for every advertisement whose mode is `auto`, and never touches `manual`/`none` items. Values are committed, so builds are reproducible and reviewable in a diff.
- Text ink is chosen by WCAG relative luminance: the existing `--ink` (#20201d) if it reaches ≥ 4.5:1 against the background, otherwise the existing `--paper` (#fbfaf7). For any colour at least one of the two always reaches 4.5:1. `validate.mjs` enforces this and rejects malformed hex values.
- **Print:** the colour is painted on the advertisement's `.print-page` content box (inside the 18 mm page margins, like a mount board), not full-bleed. Rationale: the `@page` bottom-centre page number lives in the margin box, so it stays on white and always readable; and full-bleed negative margins are exactly the technique behind the still-open cover clipping bug (v2 Task 19). The artwork is vertically centred in the tinted area with `object-fit: contain`, unchanged size rules, never cropped or stretched. The section kicker/heading/acknowledgement text colour follows `page_ink`. `compile-pdf.mjs` already passes `printBackground: true`.
- **Web:** the same colour is applied to `.ad-frame` (the card) and the heading ink of that card follows `page_ink`. The artwork `<img>` and the link to the full-size file are unchanged.
- The source artwork and the normalized derivatives are never modified.
- A generated review sheet `qa-output/ad-backgrounds/AD_BACKGROUND_REVIEW.md` (plus a contact sheet PNG) lists every advertisement with its swatch, chosen ink, contrast ratio and rendered PDF page crop, so all 22 pages are inspected in one pass. Decision F covers the two aesthetic questions (content-box vs full-bleed; whether bright colours like ADV-023's cyan should be softened by default or only by manual override).

---

## 5. Group B — Viewer registration and administration portal

### 5.1 Architecture (recommended; Decision G/M confirm)

Keep Eleventy and the whole V0–V2 build untouched as the content generator. Add a thin, framework-light server layer that runs on Vercel and locally, and a managed PostgreSQL database.

```
                         ┌────────────────────────────────────────────────────┐
                         │ Vercel project (root = 05_WEBSITE)                 │
 browser ──HTTPS──►      │                                                    │
                         │  middleware.ts (Vercel Routing Middleware, edge)    │
                         │   • matcher: /, /magazine*, /print/*, /content/*,   │
                         │     /assets/normalized/{advertisements,images}/*    │
                         │   • verifies visitor session cookie (HMAC)          │
                         │   • no session → rewrite to /welcome/               │
                         │                                                    │
                         │  static _site/ (Eleventy output)                    │
                         │   /welcome/  public landing: cover, privacy notice, │
                         │              registration form (no magazine text)  │
                         │   /          protected magazine (today's index.html)│
                         │   /print/    protected PDF + print HTML             │
                         │   /admin/    admin login + dashboard shell          │
                         │                                                    │
                         │  api/ (Vercel Functions, Node runtime, TypeScript)  │
                         │   POST /api/register      validate → upsert → cookie│
                         │   POST /api/admin/login   verify → server session   │
                         │   POST /api/admin/logout                            │
                         │   GET  /api/admin/stats   (auth) aggregates         │
                         │   GET  /api/admin/visitors?q=&page= (auth) search   │
                         │   GET  /api/admin/export.csv (auth) CSV             │
                         │   GET  /api/health                                  │
                         └───────────────┬────────────────────────────────────┘
                                         │ DATABASE_URL (TLS), least-privilege role
                                         ▼
                              Neon PostgreSQL (Vercel Marketplace)
                              tables: visitors, visits, admin_sessions,
                                      rate_limits, schema_migrations
```

- **Runtime:** Vercel Functions (Node 22, TypeScript) using the Web-standard `Request`/`Response` handler signature, so the same handlers run locally under a tiny Node dev server (`scripts/dev-app.mjs`) and under `vercel dev`. No Next.js, no React. HTML for `/welcome/` and `/admin/` is generated by Eleventy templates like every other page; the forms use small vanilla JS with `fetch`, and degrade to a normal form POST.
- **Database access:** `pg` with parameterised queries only; migrations are plain SQL files in `db/migrations/NNN_*.sql` applied by `npm run db:migrate` (forward-only, additive; each with a documented reverse in `db/rollback/`).
- **Sessions:** visitor session = stateless signed cookie `becaa_v` (`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30d`), payload `{visitor_id, issued_at}` signed with HMAC-SHA256 using `SESSION_SECRET`; verified in middleware with Web Crypto. Admin session = random 256-bit token stored **hashed** in `admin_sessions` with a 12-hour absolute expiry and 60-minute idle expiry, cookie `becaa_a` (`HttpOnly; Secure; SameSite=Strict; Path=/`), rotated on login, deleted on logout.
- **Admin credential:** one administrator. `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (argon2id via the `argon2` package, or bcrypt if native builds are a problem on Vercel) are environment variables. `npm run admin:hash` generates the hash locally from a prompt; the plaintext is never stored, logged or committed. No admin table, no self-service password reset (the owner rotates the env var).
- **Secrets:** `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `IP_HASH_SALT`. `.env.local` is git-ignored; a committed `.env.example` lists names only. `vercel env pull` for local work.
- **Portability:** nothing provider-specific in publication logic. Provider-specific pieces are confined to `vercel.json`, `middleware.ts` and the deployment doc, satisfying INSTRUCTION.md §18.

### 5.2 Gating model (Decision G)

Recommended: **public cover + private content.** `/welcome/` shows the official cover artwork, the magazine title, a two-sentence introduction, the privacy notice and the registration form. Everything else (the magazine page, per-item pages under `/content/`, the print HTML/PDF, and the normalized advertisement and gallery images) requires a valid visitor session. The cover image and QR SVGs remain public. Keeping today's `index.html` as the protected magazine page preserves all V0–V2 URLs and anchors and keeps `test-site.mjs`/`visual-qa.mjs` working unchanged (they open the built file directly, bypassing middleware).

Note found during inspection: Eleventy currently renders every `src/content/**/*.md` as its own HTML page under `/content/...` (14 pages in `V2_REVIEW_01`). These are unnecessary leak paths; the sprint sets `permalink: false` for the content directory (via `src/content/content.11tydata.js`) so they are no longer emitted, and the middleware matcher still covers `/content/*` as belt-and-braces.

### 5.3 Registration form and validation

Fields:

| Field | Applies to | Client rule | Server rule |
|---|---|---|---|
| Name | all | required, 2–120 chars | trim, collapse internal whitespace, reject control chars, 2–120 chars |
| Email | all | `type=email`, required | RFC 5322-lite parse (one `@`, non-empty local part, domain with at least one dot and a valid TLD label), lower-cased, max 254; **no** `.com`-only assumption |
| Category | all | required radio: `alumni` / `sponsor` / `guest` | enum |
| Batch year | alumni | required, 4 digits | integer within `[BATCH_YEAR_MIN, current year]` (Decision J) |
| Department | alumni | required `<select>` from approved list + `Other` | enum from `config.departments`; if `Other`, free text 2–80 chars required |
| Organisation | sponsor (required), guest (optional) | 2–160 chars | as client |
| Mobile | sponsor / guest, optional or required per Decision K | `inputmode=numeric`; accepts `+91`, spaces, hyphens | strip `+91`/`0` prefix, spaces, hyphens; must then be exactly 10 digits starting 6–9 |
| Consent | all | required checkbox | must be `true`; stores `consent_at` and `privacy_version` |
| Honeypot | all | hidden field | any value → silent 200 with no write |

Server-side sanitisation happens first, then validation, then a single parameterised upsert. Unknown fields are ignored (allow-list). Errors return field-level messages without echoing raw input. Re-registering with an existing email updates the record's editable fields, increments `visit_count` and issues a fresh session (no email verification; Decision Q).

**Rate limiting and abuse controls:** per-IP-hash sliding window in the `rate_limits` table (`/api/register`: 5 per 10 min; `/api/admin/login`: 5 per 15 min per IP and per username, with a 15-minute lockout after 10 failures), honeypot field, minimum 2-second form-fill time, `Origin`/`Referer` check on all POSTs, and request bodies capped at 8 KB. Vercel's built-in DDoS mitigation applies; Vercel WAF rate-limit rules are optional and only if the plan supports them.

### 5.4 Database schema

```sql
create extension if not exists citext;

create table visitors (
  id               uuid primary key default gen_random_uuid(),
  name             varchar(120) not null,
  email            citext not null unique,
  category         text not null check (category in ('alumni','sponsor','guest')),
  batch_year       smallint check (batch_year between 1900 and 2100),
  department       varchar(40),
  department_other varchar(80),
  organisation     varchar(160),
  mobile           char(10) check (mobile ~ '^[6-9][0-9]{9}$'),
  consent_at       timestamptz not null,
  privacy_version  smallint not null,
  visit_count      integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now()
);
create index visitors_created_at_idx on visitors (created_at desc);
create index visitors_category_idx on visitors (category);

create table visits (
  id          bigserial primary key,
  visitor_id  uuid not null references visitors(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ip_hash     char(64),               -- sha256(ip + IP_HASH_SALT), purged after 30 days
  user_agent  varchar(255)
);
create index visits_started_at_idx on visits (started_at desc);

create table admin_sessions (
  token_hash   char(64) primary key,   -- sha256(token); raw token only in the cookie
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  ip_hash      char(64)
);

create table rate_limits (
  bucket       varchar(160) primary key, -- e.g. 'register:<ip_hash>' / 'login:<username>'
  window_start timestamptz not null,
  count        integer not null default 0
);

create table schema_migrations (
  version    integer primary key,
  applied_at timestamptz not null default now()
);
```

Design notes: no raw IP addresses anywhere; IP hashes are salted and purged; no password column for visitors (Decision H recommends no visitor password — if the user insists on accounts, add `password_hash` (argon2id) and the login/reset flows as a separately approved addition); `email` is `citext` so uniqueness is case-insensitive; "total visits" = `count(*) from visits`, "total registered viewers" = `count(*) from visitors`.

### 5.5 Administrator portal

- `/admin/` login page: username field, masked password field, CSRF token, generic failure message ("Invalid username or password"), constant-time comparison, no user enumeration, lockout as in §5.3.
- Dashboard (server-rendered HTML fragments loaded by `fetch`, no chart library, no CDN): total registered viewers; total visits; counts by category; batch-wise and department-wise counts (alumni only) as sortable tables with simple CSS bars; registrations list with date/time (IST), search box (name/email/organisation, ILIKE, parameterised), pagination (50 per page); logout button.
- CSV export (`/api/admin/export.csv`, auth required): columns **exactly** `name, email, category, batch_year, department, department_other, organisation, mobile, consent_at, registered_at, last_seen_at, visit_count`. Never includes `id`, session data, hashes, IP hashes or user agents. Every cell is quoted; cells starting with `= + - @ \t \r` are prefixed with `'` to block spreadsheet formula injection. UTF-8 with BOM so Excel opens Bengali names correctly. Each export is logged (timestamp, admin session id) in the function log, not the CSV.
- Security headers on every response: `Content-Security-Policy: default-src 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (admin), `Strict-Transport-Security` (production), `Cache-Control: no-store` on all `/api/admin/*` and `/admin/*` responses.

### 5.6 Privacy and data handling

- Privacy notice shown above the form (draft wording for Decision L):
  > "BECAA Maharashtra collects your name, email address and, for alumni, your batch and department (or, for sponsors and guests, your organisation and optional mobile number) to understand who is reading the 2026 magazine and to keep in touch about association activities. Only the BECAA Maharashtra committee's designated administrator can see this information. It is stored securely on a managed database, is never sold or shared with third parties, and will be deleted by [retention date]. Write to becaa.maharashtra@gmail.com to view, correct or delete your details."
- Consent checkbox text: "I agree to BECAA Maharashtra storing these details for the purpose described above."
- Data minimisation: no password, no raw IP, no analytics cookies, no third-party scripts.
- Retention (Decision L): proposed default — visitor records retained until **31 December 2027**, then purged by a documented `npm run db:purge` run by the owner (no unattended cron in this sprint); `visits.ip_hash` and `rate_limits` rows older than 30 days purged on each migration run and by an idempotent purge endpoint callable only by the admin.
- Deletion on request: admin dashboard "Delete" action per visitor (soft-confirm), and the documented `db:purge --email` command.
- Backups/recovery (Decision P): Neon's built-in point-in-time restore plus a documented weekly manual `pg_dump` (encrypted, stored off the public site, owner-held). The admin CSV export is not a backup.
- HTTPS everywhere (Vercel default), `Secure` cookies, HSTS in production, secrets only in Vercel environment variables.

### 5.7 Threat checks (must each have a test or a documented manual check)

| Threat | Control | Verification |
|---|---|---|
| SQL injection | parameterised queries only; no string-built SQL | unit test with hostile inputs; grep gate for template literals in SQL |
| XSS (stored, via names/organisation shown in admin) | all output HTML-escaped server-side; strict CSP | unit test rendering `<script>` payloads; CSP header test |
| CSRF on admin POSTs and register | `SameSite` cookies, `Origin` check, synchroniser token on admin forms | integration test with foreign Origin → 403 |
| Brute force / credential stuffing | rate limit + lockout + argon2id + constant-time compare | integration test: 6th attempt within window → 429 |
| Session theft / fixation | HttpOnly+Secure cookies, rotate on login, server-side revocation, idle+absolute expiry | integration test: logout invalidates token; expired token rejected |
| User enumeration | uniform login error and timing | test asserts identical body/status for bad user vs bad password |
| Visitor-list scraping | all reads behind admin session; no public listing endpoint; static JSON never generated | test: unauthenticated `/api/admin/*` → 401; grep gate for visitor data in `_site/` |
| CSV formula injection | cell prefixing | unit test |
| Mass assignment | explicit field allow-list | unit test: extra fields ignored |
| Open redirect | fixed post-login/post-register destinations | test |
| Secret leakage | `.env*` ignored; `git secrets`-style grep in `npm run check:secrets`; no secrets in logs | CI-style script in release pipeline |
| Direct asset access without registration | middleware matcher covers normalized assets, `/print/`, `/content/` | Playwright test: unauthenticated GET of an ad image → redirect/403 |
| Dependency vulnerabilities | `npm audit` gate (high/critical in new app dependencies must be 0; the four pre-existing build-tool advisories are tracked separately) | release pipeline step |

### 5.8 Migration, deployment and rollback (documented and rehearsed in this sprint; **production deploy is a separate approval**)

1. `vercel link` the `05_WEBSITE` directory to a new Vercel project (owner/team per Decision O). Build command `npm run build`, output directory `_site`, Node 22.
2. Provision Neon PostgreSQL through the Vercel Marketplace (Decision M); Vercel injects `DATABASE_URL`. Create a least-privilege application role (no `CREATE`/`DROP` outside migrations).
3. Set `SESSION_SECRET` (32 random bytes, `openssl rand -base64 32`), `IP_HASH_SALT`, `ADMIN_USERNAME` (Decision N) and `ADMIN_PASSWORD_HASH` (from `npm run admin:hash`) in Vercel for Preview and Production separately. Never in files.
4. `npm run db:migrate` against the preview database branch; verify with `npm run db:status`.
5. `vercel deploy` (preview). Run the live-browser E2E suite against the preview URL: register as each category, confirm gate, confirm assets blocked without cookie, admin login/search/export/logout, negative cases.
6. Promote to production only after user approval: `vercel deploy --prebuilt --prod` from the exact tagged commit that produced `V3_REVIEW_01`, then the post-deployment smoke test (desktop + mobile, Bengali rendering, PDF gate, QR links).
7. Record deployment time, release ID, commit and public URL in `CHANGELOG.md` and `06_FINAL_OUTPUT/V3_REVIEW_01/DEPLOYMENT.md`.

Rollback: site — Vercel "Instant Rollback" to the previous deployment (kept available); database — migrations are additive so an old deployment keeps working against a new schema; a destructive change is never shipped in the same release as the code that depends on it; each migration has a reverse SQL file; restore from Neon PITR or the latest `pg_dump` if data is damaged. Emergency "close the gate": setting `REGISTRATION_ENABLED=false` returns a maintenance notice from `/api/register` without touching the database.

### 5.9 Automated tests and live browser verification

- **Unit (hermetic):** validators (name/email/year/department/mobile normalisation), session signing/verification, CSV escaping, contrast/ink selection for §4.4, tracker-update core functions.
- **Integration (real Postgres):** run against a local PostgreSQL (present on this host) or a Neon preview branch, using `DATABASE_URL_TEST`; migrations apply from scratch; register/upsert; rate limit; admin login/lockout/logout; stats aggregates; search; CSV contents and exclusions.
- **Site tests (existing, extended):** `test-site.mjs` + advertisement-title assertions for all 22 published ads (no rendered heading, contents or nav entry ending in "Advertisement") + no `/content/*.html` in `_site` + no visitor data strings in `_site`.
- **Visual QA (existing, extended):** `visual-qa.mjs` and `pdf-qa.mjs` re-run; new `ad-backgrounds-qa.mjs` renders all 22 advertisement PDF pages and the web cards, checks the contrast ratio against the rendered background pixel, and writes the review sheet.
- **Live browser E2E (new, Playwright against the local dev server and, when deployed, the preview URL):** unauthenticated visit is redirected to `/welcome/`; invalid submissions show field errors; valid alumni/sponsor/guest registrations open the magazine; cookie flags verified; direct image/PDF requests without a cookie are blocked; admin login, dashboard counts match seeded data, search, CSV download parsed and checked, logout, expired-session redirect. Screenshots stored under `qa-output/app/` and copied into the release.
- **Release gate:** `npm run release:v3` runs tracker validation, manifest validation, unit + integration tests, build, site tests, visual QA, PDF, PDF QA, ad-background QA, app E2E (local), `npm audit` gate, secret scan, then copies to `06_FINAL_OUTPUT/V3_REVIEW_01/`. It also finally fixes the stale `REPRODUCTION.md` template (the real v3 command sequence plus the Playwright and PostgreSQL prerequisites).

---

## 6. Decisions

### 6.1 Made in this PRD (reversible technical choices; say so if you disagree)

1. `ART-012`, `articles` section, `order 220`, `language bn` for the story.
2. Text-only import for both DOCX files, verbatim, with soft line breaks preserved in the Secretary's closing.
3. Advertisement background colour is data in the manifest (auto-sampled, committed, overridable), not computed at build time.
4. Ink colour chosen by WCAG 4.5:1 rule against `--ink`/`--paper`; page number stays in the white margin box.
5. Per-item `/content/*` HTML pages are no longer emitted.
6. Visitor session = signed stateless cookie (30 days); admin session = server-side, hashed token, 12 h absolute / 60 min idle.
7. Web-standard function handlers + `pg` + SQL migrations; no ORM, no React, no CDN.
8. Integration tests run on real PostgreSQL (local or Neon branch), not a mock.
9. The four pre-existing `npm audit` items in build tooling are handled as in v2 Task 18: apply the non-breaking `js-yaml` fix in this sprint (P1), keep `sharp`/`playwright`/`xlsx` deferred. New application dependencies must audit clean.

### 6.2 Decisions A–Q — **approved as recommended on 2026-09-14**

All recommendations below were approved without change. Two still need a value supplied at deployment time, not in any file: the administrator username (N) and the Vercel account/team to link (O); neither blocks `/prd` or `/dev`, and `/dev` must use placeholder environment-variable names only.


**Editorial / source handling**

- **A. Overwritten originals.** The revised DOCX files replaced the committed originals in place. Recommended: (1) commit the two revised files now as the Sprint v3 intake commit so they cannot be lost; (2) export the superseded originals from git to `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-14/` with their original names and a `README.md` listing both SHA-256 values; (3) record in the tracker `Remarks` that the earlier version is preserved there and in git history. Alternative: keep git history as the only archive. Please also confirm the in-place drop is accepted this time; the pipeline itself never overwrites `02_INCOMING_CONTENT`.
- **B. Secretary's signature image.** Recommended: do not import the 162×65 px scanned signature; publish text-only like every other message. Alternative: include it on web only, or on web and print with a low-resolution warning.
- **C. MSG-003 display title.** The tracker and manifest say "Secretary Desk"; the revised document's heading is "From the Secretary's Desk". Recommended: keep the manifest/tracker title unchanged and keep the document heading verbatim inside the body (as V1 did). Alternative: change the title everywhere to "From the Secretary's Desk".
- **D. Story title and tracker update.** Recommended manifest title **"প্যাঁড়া"** (the document's own title) with tracker Item 24 `Title / Item` updated to "প্যাঁড়া (Siddhartha Mukhopadhyay story)". Alternative: keep the placeholder title "Siddhartha Mukhopadhyay story". Please also explicitly authorise the tracker edits listed in §4.2 (Permission, Status, Web/Print Include, Received Date, Remarks) — INSTRUCTION.md rule 2 requires your approval for any tracker change.
- **E. Advertisement titles.** Resolved by your correction of 2026-09-14: all 22 published advertisements are retitled "With best compliments from [Company Name]" using the recorded company names (table in §4.3). Two recorded names are carried verbatim and flagged only for your awareness: `ADV-005` "Tata Capital Ltd. (Retail Finance)" and `ADV-023` "Clover Blakefield Reality LLP". Confirm they are acceptable as-is, or approve a separate tracker correction.

**Presentation**

- **F. Advertisement backgrounds.** Confirm: (1) content-box mount (inside the 18 mm margins) rather than full-bleed; (2) the same treatment on the web card; (3) auto colours used as sampled with manual override available, rather than softening bright colours automatically — ADV-023's bright cyan and ADV-019's near-black are the two I would expect you to override after seeing the review sheet.

**Application (the eight questions from the change summary, with recommendations)**

- **G. (Q1) Gating model.** Recommended: public cover/landing page with the privacy notice and form; all magazine content, images and the PDF private. Alternative: everything private including the cover.
- **H. (Q2) Visitor password.** Recommended: **no password**. One-time registration issues a 30-day secure session; the same email may re-register from another device (counted as a new visit). If you want accounts, say so and the sprint adds hashed passwords, login and reset flows (larger scope).
- **I. (Q3) Department dropdown.** Proposed list (BE College / IIEST Shibpur): Civil Engineering; Mechanical Engineering; Electrical Engineering; Electronics & Telecommunication Engineering; Computer Science & Technology; Information Technology; Metallurgy & Materials Engineering; Mining Engineering; Architecture; Aerospace Engineering & Applied Mechanics; Other (free text). Please add, remove or rename.
- **J. (Q4) Batch year range.** Proposed: 1950 to the current year (2026), four digits.
- **K. (Q5) Mobile number.** Proposed: optional for guests; **required for sponsor/company representatives** (organisation also required for them); never asked of alumni. Alternative: optional for everyone.
- **L. (Q6) Privacy notice and retention.** Approve or edit the wording in §5.6, and confirm the retention date (proposed 31 December 2027) and that purging is a manual owner-run command.
- **M. (Q7) Database and authentication.** Recommended: Neon PostgreSQL via the Vercel Marketplace (free tier, branching for preview databases) and the single-administrator environment-variable credential with server-side sessions described in §5.1. Alternative: Clerk/Auth0 for the admin login (adds a vendor and account; not needed for one administrator). This creates a new Vercel project and a Neon resource — INSTRUCTION.md §19 requires your approval for new accounts/infrastructure.
- **N. (Q8) Administrator username.** Please supply it. The password will be entered by you locally into `npm run admin:hash` and the hash pasted into Vercel; it is never written to any file in the repository or to this PRD/TASKS.
- **O. Vercel project.** Confirm the Vercel account/team to link, and whether a custom domain is intended (domain purchase/DNS is out of this sprint).
- **P. Backups.** Confirm Neon point-in-time restore plus a documented weekly manual encrypted `pg_dump` held by you. Alternative: automated dumps to Vercel Blob (another service).
- **Q. Email verification.** Recommended: none (no email-sending vendor; registration is a gate and a count, not an identity proof). Alternative: magic-link verification via an email provider (new vendor, new secrets).

**Carried-over items not in scope unless you say otherwise:** Item 20 (Sudipta Chakraborty, source file still not received); Palash Biswas "Civil" vs "Mech" branch discrepancy; v2 P2 Tasks 19 (cover clipping) and 20 (`shell: true`).

---

## 7. Out of scope

- Any change to V0/V1/V2 release folders, original source files, `BECAA_Magazine_2026_Master.docx`, or existing manifest IDs/ordering beyond the four items above.
- Public/production deployment, custom domain, DNS, paid plans — separate approval after `/walkthrough`.
- Visitor accounts with passwords, password reset, email verification, social login (unless Decision H/Q change).
- Analytics beyond registration and visit counts; no third-party trackers.
- Multi-administrator roles, admin self-registration, audit-log UI.
- Editorial rewriting of any text; resolving Item 20 or the Palash Biswas branch discrepancy.
- Re-normalising any advertisement artwork; the background colour is presentation only.
- Automated (cron) data purging; Vercel WAF paid rules.

## 8. Dependencies

- `06_FINAL_OUTPUT/V2_REVIEW_01` remains the last known-good release (verified 2026-09-14).
- User decisions A–Q above; `/prd` converts this PRD into `sprints/v3/TASKS.md` only after approval.
- Vercel account access and a Neon resource (Decision M/O) — needed for preview deployment and the hosted E2E run; local development and tests must not depend on them (local PostgreSQL is available on this host).
- New application dependencies (expected: `pg`, `argon2` or `bcryptjs`, TypeScript, `@vercel/functions` or equivalent types) must be pinned in `package-lock.json` and audit clean. Optional dev dependency for local function serving.
- `npx playwright install chromium` remains an undocumented-until-now prerequisite; this sprint documents it in `README.md` and `REPRODUCTION.md`.

## 9. Validation criteria for `V3_REVIEW_01`

- Tracker: 52 rows, no duplicate IDs; Item 18 remark recorded; Item 24 approved and included; all 22 published `ADV-` rows have `Title / Item` = "With best compliments from [Contributor / Company]" and the five excluded `ADV-` rows are unchanged and still excluded; all edits preceded by a `TRACKER_SNAPSHOTS` backup.
- Manifest: 44 items (43 + `ART-012`); `MSG-003` fingerprint = `ed3fd766…`; `ART-012` fingerprint = `9bbe16d1…`; all 22 published advertisement titles equal `With best compliments from <contributor>` exactly (§4.3 table) and **no published advertisement title ends with "Advertisement"** (validator error otherwise); the five excluded advertisements are still absent from the manifest; every advertisement has a valid `page_background` and a passing contrast check; 0 errors; only the 7 pre-existing low-resolution warnings.
- Content: `MSG-003-secretary-desk.md` body equals fresh `mammoth` extraction of the revised DOCX (with line breaks preserved); `ART-012-item.md` body equals fresh extraction of the story; no `NEEDS VERIFICATION` comments.
- Website: 44 publication items; every rendered advertisement card `<h2>` and every advertisement entry in the contents/navigation list reads "With best compliments from [Company Name]" for all 22 IDs, and no rendered advertisement heading, contents entry or nav entry ends with "Advertisement" (automated check in `test-site.mjs`); no `/content/*.html`; no visitor data or secrets anywhere in `_site`; no horizontal overflow; `/welcome/` renders with the cover, privacy notice and form; desktop/mobile screenshots reviewed.
- PDF: page count = 67 + 1 (new story) ± pages from ad-page reflow, A4, zero blank pages, every advertisement page tinted with readable heading and page number, all 22 pages inspected in the review sheet; every advertisement page `<h1>` and every advertisement line in the PDF contents page reads "With best compliments from [Company Name]" and none ends with "Advertisement" (automated check via `pdftotext` in `pdf-qa.mjs`, with the artwork itself untouched); `MSG-003` and `ART-012` pages inspected for Bengali shaping and clipping.
- Application: unit + integration tests green on a real PostgreSQL; live-browser E2E green locally; all rows of the §5.7 threat table have a passing test or a recorded manual check; `npm audit` shows 0 high/critical in new dependencies; secret scan clean; `.env*` untracked.
- Baseline: SHA-256 of `V0_PROTOTYPE_01`, `V1_COMPLETE_REVIEW_03` and `V2_REVIEW_01` key files unchanged after the release build; `git status` clean apart from intended changes.
- `CHANGELOG.md` has a `## V3_REVIEW_01` section listing Changed (MSG-003, all 22 advertisement titles, ad backgrounds), Added (ART-012, registration portal, admin dashboard, schema), Unchanged (all other 41 items, V0–V2 outputs), and Not deployed.

## 10. Proposed task streams for `/prd` (indicative, not yet atomised)

**Stream A — publication (P0):** intake commit + superseded-source archive → tracker updates (18, 24, and the 22 published ADV titles) with snapshot → extract MSG-003 (revised) → extract ART-012 → manifest edits → `validate-tracker.mjs` rule update → ad-background schema + sampler script + validator contrast check → print/web CSS and templates → advertisement retitle script + validator rule + rendered-output title checks → tests for headings/contrast → build, validate, site tests, visual QA, PDF, PDF QA, ad-background review sheet.

**Stream B — application (P0):** dependencies + TypeScript config → SQL migrations + migrate/status/purge scripts → validators (unit-tested) → session and CSRF utilities → `/api/register` → middleware gate + `/welcome/` template + `permalink:false` for content → admin login/logout/session store → stats, search, CSV endpoints + `/admin/` dashboard template → security headers + rate limiting → integration tests on PostgreSQL → local dev server → Playwright E2E → `vercel.json`, `.env.example`, deployment/rollback docs.

**Stream C — release (P0/P1):** `release:v3` pipeline with audit and secret gates, fixed `REPRODUCTION.md`, `README.md` prerequisites, `CHANGELOG.md`, baseline integrity check, `js-yaml` audit fix (P1).

`/walkthrough` then verifies `V3_REVIEW_01` end-to-end before any deployment decision.
