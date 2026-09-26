# Sprint v5 — Walkthrough (Tasks 1–30)

Scope note: Sprint v5 had 21 planned tasks plus a 9-task addendum (PRD §11), and all 30 are complete. This walkthrough covers:
- **Tasks 1–14:** intake, the `MSG-001` replacement, the `ART-011` branch correction, the tracker, and verification (`a823182..8b8164b`).
- **Tasks 15–18:** the V5 release list, the PDF comparison against `V4_REVIEW_02`, CHANGELOG, and the `V5_REVIEW_01` review build (`a70d2da..21c1201`, plus one follow-up fix, `af3386b`).
- **Tasks 19–21:** manual verification, then Preview and Production deployment (`c7c9643..46cd606`, documentation only).
- **Tasks 22–30 (addendum):** after `V5_REVIEW_01` went live, the owner reported that no gallery or advertisement image appeared on the website. The fix covers ad-blocker-proof class names, card tints and table alignment without inline styles, guards against both defect classes, `V5_REVIEW_02`, and Preview and Production (`a8bb51a..48b9530`, plus this update). Leaving aside the 294-file release folder, the addendum changed 32 files (+13,707 / −62 lines), of which 13,083 lines are the committed EasyList selector snapshot.

Everything is on `main`. Leaving aside the 286-file release folder, the sprint changed 51 files (+2,378 / −92 lines).

**Production:** `https://becaa-magazine-2026-portal.vercel.app` serves `V5_REVIEW_02` (deployment `…-acdyrs0h7-…`, 2026-09-26 15:41 UTC). The earlier Production deployments are kept for Instant Rollback: `…-efkqodur5-…` (`V5_REVIEW_01`) and `…-3rbvgbgd5-…` (`V4_REVIEW_02` + front-page hero). The deployment record is `sprints/v5/PREVIEW_DEPLOYMENT.md`.

## Summary

The President's message (`MSG-001`) is replaced by his new English message, `02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx`. It is published word for word, with three exceptions:
- its four charity items render as a bulleted list;
- its signature is on three lines;
- one recorded correction, `CE  87` → `CE ’87`, restores an apostrophe the file lost.

The old Bengali source, `President Desk.docx`, was archived byte for byte and removed from the intake folder. The Sprint v4 committee correction that applied only to the old text was retired, not deleted.

`ART-011`'s byline now reads **Palash Biswas, Mechanical, 2006 Batch**. The tracker records both changes.

The manifest still has 47 items, the PDF is still 72 pages, and the website, print HTML and PDF differ from the Sprint v4 build only in those two items.

Tasks 15–18 turned this into a review release, `06_FINAL_OUTPUT/V5_REVIEW_01/`, built by `npm run release:v5` with all 32 gated steps green. The new PDF comparison against `V4_REVIEW_02` finds 69 pages unchanged, the `ART-011` byline page as a recorded `correction`, the two `MSG-001` pages as a verified `replaced-item`, and nothing unexplained. The front-page hero test now gates releases, and the deployable PDF is the V5 one.

Tasks 19–21 verified the release and shipped it:
- **Task 19:** a browser pass through the local registration gate at 1440 and 390 px (16/16 checks).
- **Task 20:** a Preview deployment, checked end to end. Its security probes pass, its served page and PDF are byte-identical to the release, and the public browser suite passes. Its database is left exactly as it was found.
- **Task 21:** Production. The session's permission policy blocked reading Production's environment and database, so the owner chose checks that leave nothing behind: probes and public-file identity only, no registration.

**The addendum (Tasks 22–30).** The owner's screenshot of Production showed each gallery and advertisement card as a title followed directly by its status pills, with no image. The server was fine: the Production request log showed every image served with 200. Two website defects were found:
- **Images hidden by ad blockers.** Every image sat in `<figure class="ad-frame">` inside `<a class="ad-link">`. EasyList, the base list of uBlock Origin, AdBlock Plus, Brave and others, hides both names on every site, so visitors with a blocker saw no images. This had been true since the first commit, which is why V4 "looked fine" to a browser without a blocker.
- **Card tints refused by the security policy.** The tints were inline `style` attributes, which the site's CSP (`default-src 'self'`) refuses, so the live site never showed them. The same applied to the right-aligned columns of the ART-006 table. Both date from Sprint v3. The tests never caught it because they opened the pages as local files, with no CSP.

**What changed:**
- the two names are now `artwork-frame` / `artwork-link`;
- tints come from a generated stylesheet, `assets/css/ad-tints.css`;
- table alignment is set by classes;
- the page tests now run under the production headers;
- three new release gates — `qa:blocklist`, `test:e2e:csp` and `test:e2e:blocker` — make both defect classes fail the release.

`V5_REVIEW_02` passed all 35 steps. Its PDF is pixel-identical to `V5_REVIEW_01`. It was verified locally, deployed to Preview (30/30 images, 25/25 tints, 0 CSP errors, images intact under all EasyList generic rules), and then to Production with the same no-trace checks.

## Architecture Overview

```
 02_INCOMING_CONTENT/                                   04_MAGAZINE_WORKING/
 ├─ Souvenir President message 05-09-2026.docx (new)    ├─ SUPERSEDED_SOURCES/2026-09-26/
 ├─ President Desk.docx  ── git show HEAD ──────────────▶│    President Desk.docx + README  (Task 1)
 │     (git rm, Task 2)                                  ├─ BECAA_2026_Content_Tracker.xlsx (rows 16, 23)
 ├─ BECAA Owner Corrections 2026-09-26.md (Task 5) ─┐    └─ TRACKER_SNAPSHOTS/…pre-v5-tracker-updates.xlsx
 └─ BECAA Committee Corrections 2026-09-16.md       │              ▲
      (§11 addendum: MSG-001 retired, Task 8)       │              │ tracker-v5-core + apply-v5-tracker-updates (Task 11)
                                                    │
   new DOCX ── SHA-256 gate ── mammoth.convertToHtml
        │
        ▼
   docxHtmlToParagraphText(html, { lists: true })   (article-markdown-core, Task 3)
        │  buildArticleMarkdown(MSG-001, "President Desk")
        ▼
   buildPresidentDeskMarkdown() ─▶ extractPresidentDesk()   (extract-v5-president-desk, Tasks 4/6)
        │
        ▼
   src/content/messages/MSG-001-president-desk.md ◀─┐
                                                    ├── apply-v5-corrections ◀── v5-corrections.mjs
   src/_data/publication.yaml ◀─────────────────────┘     (MSG-001 signature, Task 6;
     MSG-001: source_file / fingerprint / language / notes (Task 7)
     ART-011: branch Civil → Mechanical (Task 10)
        │
        ▼  Eleventy (byline filter renders branch)
   _site/index.html ── _site/print/index.html ── compile-pdf ──▶ BECAA-2026-complete-review.pdf
        │                                                              │
        └──────────── tests/integration/v5-updates (Task 12) ◀─────────┘
                      + 06_FINAL_OUTPUT/V4_REVIEW_02 (byline baseline, read-only)

   v4-corrections.mjs: MSG-001 entries marked `superseded` → apply-v4 skips them (Task 8)
```

## How the work was run

The owner approved decisions A–N as recommended on 2026-09-26 and asked for independent tasks to run in parallel. Four subagents worked in isolated git worktrees at the same time:
- Tasks 3→4;
- Task 5;
- Tasks 8–9;
- Task 11.

None of them was allowed to run the build, the PDF or Playwright, because the host has 2 CPUs and about 2 GB of free memory. Their commits were cherry-picked onto `main`. The only conflicts were in `package.json` test chains, merged as an ordered union with no duplicates. Tasks 6, 7, 10 and 12–14 depend on the others or touch the same files, so the coordinator did them in sequence on `main`. The agents' worktrees and branches were removed after merging.

All commits carry a single `Co-Authored-By` trailer. None carries a `Claude-Session:` trailer: Sprint v4 recorded that trailer as unauthorized, and that convention was kept.

## Files Created/Modified

### Stream A — Intake (Tasks 1–2, commit `a823182`)

#### `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/President Desk.docx` and `README.md` (new)
**Purpose**: Keep the President's earlier message recoverable after it leaves the intake folder.

**How it works**: The DOCX was exported with `git show HEAD:"02_INCOMING_CONTENT/President Desk.docx"` rather than copied from disk, so it is the exact committed bytes (SHA-256 `c9f5d073…`, 16,200 bytes). The README follows the 2026-09-15 format:
- the old and new SHA-256 (`67d8a418…` for the new message);
- the published item (`MSG-001`);
- the reason (owner request, Decision G);
- a note that the Sprint v4 wording correction applied only to this superseded text (Decision H).

The same commit `git rm`s the original from `02_INCOMING_CONTENT/`. Because the bytes are identical, git records it as a rename into the archive, and its history is kept.

#### `05_WEBSITE/tests/integration/superseded-sources.test.mjs` (extended)
A third block asserts that:
- the archive copy exists with SHA-256 `c9f5d073…`;
- the new source exists with `67d8a418…`;
- the README names both hashes and `MSG-001`.

It was run red (README missing), then green.

### Stream B — `MSG-001` replacement (Tasks 3–9)

#### `05_WEBSITE/scripts/article-markdown-core.mjs` — list mode (Task 3, commit `b248531`)
**Purpose**: Turn mammoth's DOCX HTML into Markdown paragraph text. It is shared by the Sprint v3 extractors and the new v5 extractor.

**Key functions**:
- `docxHtmlToParagraphText(html, { lists = false })` — now takes an opt-in option;
- `cleanHtmlBlock(block)` — the per-block cleanup, factored out and unchanged.

**How it works**: Before this sprint every `<li>` became a plain paragraph, so the four charity items would have lost their bullets. The function now splits on closing block tags with a capture group, so it knows which blocks were list items. With `{ lists: true }`, consecutive items join into one block of `- ` lines:

```js
const parts = String(html).split(/<\/(p|h[1-6]|li)\s*>/i);   // [text, tag, text, tag, …]
for (let index = 0; index < parts.length; index += 2) {
  const text = cleanHtmlBlock(parts[index]);
  if (text.length === 0) continue;
  const isItem = lists && String(parts[index + 1] ?? "").toLowerCase() === "li";
  if (!isItem) blocks.push(text);
  else {
    const bullet = `- ${text.replaceAll("\n", "\n  ")}`;       // a soft break stays inside the item
    if (previousWasItem) blocks[blocks.length - 1] += `\n${bullet}`; else blocks.push(bullet);
  }
  previousWasItem = isItem;
}
```

Without the option, the output is byte-identical to before. Unit tests prove this on six fixtures, with no option, with `{}` and with `{ lists: false }`. Re-running the v3 `MSG-003` and `ART-012` extractors produced no git diff.

#### `05_WEBSITE/scripts/extract-v5-president-desk.mjs` (new, Task 4; split in Task 6)
**Purpose**: Produce `MSG-001-president-desk.md` from the new DOCX.

**Key exports**:
- `EXPECTED_SOURCE_SHA256` and `verifySourceFingerprint(path)` — refuse any other file;
- `buildPresidentDeskMarkdown()` — returns the Markdown and writes nothing;
- `extractPresidentDesk({ outputPath })` — writes it; the default target is the real content file;
- `npm run extract:v5-president-desk`.

**How it works**: The script follows Sprint v3's `extract-v3-secretary-desk.mjs`. It runs `mammoth.convertToHtml` → `docxHtmlToParagraphText(html, { lists: true })` → `buildArticleMarkdown({ id: "MSG-001", title: "President Desk", … })`. The decisions it implements:
- the display title stays "President Desk" (A);
- the source heading "From the President's Desk" is the first body line, as plain text (B);
- the three embedded images are dropped by `cleanHtmlBlock` (F). They are 1×2, 7×17 and 18×19 px Word artefacts.

The output has 12 blocks: the heading, 8 prose paragraphs (7 before the list, 1 after), one 4-item list, the thanks line, and the signature. The PRD first said "11 paragraphs"; the source has 8, and the PRD was corrected. mammoth flattens the superscript in `24<sup>th</sup>` to "24th".

**Why it was split (Task 6)**: As first written, the Task 4 test ran the extractor onto the real content file. Every `npm run test:integration` would then have silently overwritten the recorded signature correction. The pure `buildPresidentDeskMarkdown()` and an overridable `outputPath` let the test extract into a temp file. The published file is now always extraction + recorded corrections. The CLI prints a reminder to run `corrections:apply-v5` afterwards.

#### `05_WEBSITE/src/content/messages/MSG-001-president-desk.md` (replaced, Tasks 4 and 6)
The Bengali message is replaced by the English one. Its front matter names the new source and fingerprint. The body ends:

```
- Extending Medical aids to the members and their immediate families in emergency situation.

In our journey so far, I felt all our members … irrespective of their ages and social status.

On behalf of my entire Managing Committee and its members I sincerely thank you all.

Manik Barman  
CE ’87  
President, BECAA Maharashtra
```

The signature lines end in two spaces, which Markdown renders as `<br>`. The old file had run the signature together as `Manik BarmanCE ’87President…`, because the Sprint 1 raw-text import dropped the soft breaks. The new extraction fixes that as a side effect.

#### `02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md` (new, Task 5)
**Purpose**: The authoritative editorial record for the two v5 corrections. It follows the 2026-09-16 committee record, since no revised contributor document exists for either change.

**How it works**: Each entry states:
- the working file and the untouched original source;
- the exact old and new text, with code points for the apostrophe (U+2019);
- the count to change and the reason.

The `ART-011` entry explains that `branch: Civil` occurs on ten items, so the edit is anchored on ART-011's own four lines.

§3, "Published as supplied (Decision C)", quotes nine suspected slips in the new message exactly, with context:
- `energies`, `alma matter` / `Alma Matter`, `llTs`, `GABESSU`, `GAABESU Maharashtra`, `at per`, `Sanmilani`;
- a double space after `Association)`.

It also notes two more found while quoting: the double space in `social media  connectivity` (left where an image was removed) and the lower-case `Gaabesu`. None is changed. They await the owner's review.

#### `05_WEBSITE/scripts/v5-corrections.mjs` (new, Task 5)
**Purpose**: The correction record in machine-readable form.

**Exports**:
- `V5_FILE_CORRECTIONS` — edits to working files;
- `V5_CORRECTIONS` — how each change reads in rendered text; used by the Task 12 test and, later, the PDF comparison.

```js
{ id: "MSG-001", file: "src/content/messages/MSG-001-president-desk.md", find: "CE  87", replace: "CE \u201987", expectedCount: 1 },
{ id: "ART-011", file: "src/_data/publication.yaml",
  find: "    contributor: Palash Biswas\n    designation: ''\n    passing_year: '2006'\n    branch: Civil\n",
  replace: "    contributor: Palash Biswas\n    designation: ''\n    passing_year: '2006'\n    branch: Mechanical\n",
  expectedCount: 1, wholeWord: false },
```

The `’` escape keeps the apostrophe visible in source, so an editor cannot silently turn it into an ASCII quote.

#### `05_WEBSITE/scripts/apply-v5-corrections.mjs` (new, Task 6)
**Purpose**: `npm run corrections:apply-v5 [-- --only MSG-001,ART-011]`.

**How it works**: It delegates to the Sprint v4 applier, `applyV4FileCorrections({ only, root, corrections: V5_FILE_CORRECTIONS })`, so it inherits every safeguard:
- the path must stay inside `05_WEBSITE/`;
- `correctionState` decides whether the edit is pending or applied, and throws on a mixed state;
- it writes only from the pending state.

Task 6 applied `MSG-001` only. Task 10 applied `ART-011`. Re-runs report `already applied`.

#### `05_WEBSITE/src/_data/publication.yaml` (Tasks 7 and 10)

| Item | Field | Before | After |
|---|---|---|---|
| `MSG-001` | `language` | `mixed` | `en` |
| `MSG-001` | `source_file` | `02_INCOMING_CONTENT/President Desk.docx` | `02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx` |
| `MSG-001` | `source_fingerprint` | `c9f5d073…` | `67d8a418…` |
| `MSG-001` | `notes` | `…Exact approved source: President Desk.docx.` | `…Exact approved source: Souvenir President message 05-09-2026.docx.` |
| `ART-011` | `branch` | `Civil` | `Mechanical` |

Every edit is an exact, count-guarded replacement via `text-correction-core`, never a YAML rewrite. `title`, `alt`, contributor details and `order` are unchanged (Decision A).

The PRD said `language: english`, but `validate` accepts only the manifest's codes (`en`, `bn`, `mixed`). Decision K is therefore recorded as `en`, and the PRD wording was aligned.

#### `05_WEBSITE/scripts/v4-corrections.mjs` and `apply-v4-committee-corrections.mjs` (Task 8)
**Purpose**: Retire the Sprint v4 `MSG-001` wording correction (`বেকান পরিচয়` → `BECAA-র পরিচয়`), whose sentence no longer exists (Decision H).

**How it works**: The entries are kept and marked, not deleted:

```js
export const MSG001_SUPERSEDED = Object.freeze({ date: "2026-09-26", reason: "MSG-001 replaced by the new President's message (Sprint v5, Decision H)" });
export const isSuperseded = (correction) => Boolean(correction?.superseded);
export const activeCorrections = (corrections) => corrections.filter((c) => !isSuperseded(c));
```

Each consumer handles the mark on purpose:
- **The apply script:** reports `skipped (superseded)` with the date and reason, without reading the file.
- **`tracker-corrections-core`:** still builds the row-16 remark from the entry. That remark was written in Sprint v4 and must stay byte-identical, so a re-run stays a no-op.
- **`pdf-compare`:** keeps it, because it compares the V4-era PDF with `V3_REVIEW_02`. Both of these consumers got comment-only changes.

A dated §11 addendum was appended to `BECAA Committee Corrections 2026-09-16.md`; §§1–10 are unchanged.

#### `05_WEBSITE/scripts/import-content.mjs` (Task 9)
The Sprint 1 importer gained a `HISTORICAL` header. Re-running it would write a fresh manifest and overwrite later work, so nothing runs it. Its `MSG-001` source path now points at the archive copy, so it still resolves.

#### `05_WEBSITE/tests/integration/v5-source-references.test.mjs` (new, Task 9; extended while merging)
**Purpose**: Prove no live code, data or test depends on the removed file.

**How it works**: It walks every text file under `scripts/`, `src/` and `tests/` (208 files) and fails on any of these:
- the intake path written directly (either slash);
- `"02_INCOMING_CONTENT", "President Desk.docx"` joined in code;
- any bare mention of the file name other than its archive path.

Legitimate mentions are allow-listed by exact path, each with a reason:
- the tracker note;
- tests that assert absence;
- tests that read the archive copy.

It also checks that the intake file is gone and the archive copy's hash is `c9f5d073…`.

### Stream C — `ART-011` (Task 10, commit `098322f`)
The manifest edit is covered above. The article body, with its own `লিখেছেন: Palash Biswas, Mech 2006…` line, is not edited. The `byline` filter in `eleventy.config.mjs` already renders `branch`, so no code changed: the website card and the print page change together.

### Stream D — Tracker (Task 11, commit `40ee350`)

#### `05_WEBSITE/scripts/tracker-v5-core.mjs` and `apply-v5-tracker-updates.mjs` (new)
**Purpose**: Record both changes in `BECAA_2026_Content_Tracker.xlsx` (`npm run tracker:apply-v5`).

**How it works**: The pure `buildV5TrackerRows(headers, rows)` reuses Sprint v3's `applyTrackerFieldUpdates` with a decision table. Field overrides are no-ops once applied, and a remark already present is not appended again. The I/O wrapper:
- takes a snapshot first (`TRACKER_SNAPSHOTS/BECAA_2026_Content_Tracker_2026-09-26T03-46-43-816Z_pre-v5-tracker-updates.xlsx`, committed like earlier snapshots);
- writes preserving styles;
- skips the write if nothing changed.

| Row | Field | Before | After |
|---|---|---|---|
| 16 (`MSG-001`) | Source File Name | `President Desk.docx` | `Souvenir President message 05-09-2026.docx` |
| 16 | Received Date | `01.08.2026` | `26.09.2026` (Decision I: arrival date) |
| 16 | Remarks | Sprint v4 remark | Same, plus the v5 note (replacement, archive, v4 correction retired) |
| 23 (`ART-011`) | Branch | `Civil` | `Mechanical` |
| 23 | Remarks | empty | v5 note naming the owner correction record |

### Stream E — Verification (Tasks 12–14)

#### `05_WEBSITE/tests/integration/v5-updates.test.mjs` (new, Task 12)
**Purpose**: The sprint's regression suite (`npm run test:v5-updates`; also the last step of `test:integration`). Needs `build` + `pdf`.

**How it works**: It reads the built website, the print HTML, and the PDF text from `pdftotext -layout`, split into pages by item kicker. It checks the following.

- **`MSG-001` on the website:**
  - title "President Desk";
  - the heading and prose samples;
  - exactly one `<ul>` whose four `<li>` equal the four charity items in order;
  - the signature as `Manik Barman<br>\nCE ’87<br>\nPresident, BECAA Maharashtra`;
  - no image or `data:` URI;
  - byline unchanged.
- **`MSG-001` in print and the PDF:**
  - 4 `<li>` and the signature in the print HTML;
  - in the PDF, the prose, four indented `Extending…` lines (pdftotext drops the CSS bullet, so indentation is compared with the first paragraph), and the signature on three consecutive lines;
  - nowhere is there an apostrophe-less `CE 87`.
- **Nothing of the old message remains:**
  - the archived DOCX is read with mammoth, and every paragraph of 20 or more characters is checked absent from all three surfaces;
  - so are four distinctive phrases, including the v4-corrected `BECAA-র পরিচয়`.
- **`ART-011`:**
  - the exact new byline on web, print and PDF, and the old one absent;
  - every other published item's web byline equals the one in `06_FINAL_OUTPUT/V4_REVIEW_02/website/index.html` (46 compared).

The markdown typographer turns `'` into `’`, so the comparisons expect the rendered form.

Because the implementation already existed, the failing mode was proven by mutating the built HTML, restoring it after each run. Reverting the ART-011 byline, removing the signature apostrophe, or turning one `<li>` into a `<p>` each failed with the matching assertion.

#### `05_WEBSITE/tests/integration/v5-manifest-msg001.test.mjs` (new, Task 7) and `apply-v5-corrections.test.mjs` (new, Task 6)
- **`v5-manifest-msg001`:** pins the four changed `MSG-001` fields and the unchanged ones (title, alt, contributor, designation, year, order, content file). It also checks that the content front matter agrees and that `publication.yaml` no longer names the old file.
- **`apply-v5-corrections`:**
  - runs the applier in a temporary root: applied, then `already applied`, only the recorded substitution;
  - checks the guards: unknown ID, a path escaping the root, and a mixed state;
  - proves the real file equals `buildPresidentDeskMarkdown()` plus that one substitution.

#### Historical tests adjusted by the gate (commits `b8a97d1`, `11bd2b4`)
The full `test:integration` chain stops at the first failure. It exposed two older tests that pinned exactly what Sprint v5 changed on purpose. Each got a narrow, commented allowance in the same style as Sprint v4 Task 38:
- **`add-v2-manifest-items`:** ART-011 may differ from its Sprint v2 entry only by `branch: Mechanical`, as ART-010 already may by its Sprint v4 source fields.
- **`incoming-consolidation`:** the 2026-09-15 inventory's `President Desk.docx` must now be absent from the intake folder and present, with the same size and hash, in the 2026-09-26 archive.

#### Task 13 — expectation sweep (no code change)
The new message is about 57% longer than the old one but still fits on PDF pp. 5–6, so the PDF stays at 72 pages and no hard-coded count changed. Page 6 was rendered and inspected: the bullets, the three-line signature, no overflow.

#### Task 14 — full gate (no code change)
The run is described under **Test Coverage**.

### Stream F — Build and release (Tasks 15–18)

| Commit | Task | Content |
|---|---|---|
| `a70d2da` | 15 | `V5_STEPS`, `release:v5`, V5 reproduction text |
| `8ae16b9` | 16 | `replaced-item` class; `pdf-compare` profiles; `qa:pdf-compare:v5`; `qa:v5-pages` |
| `b7ab7d1` | 17 | CHANGELOG `V5_REVIEW_01` section; DEPLOYMENT note |
| `21c1201` | 18 | `06_FINAL_OUTPUT/V5_REVIEW_01/` (built at `b7ab7d1`); deployable PDF replaced |
| `af3386b` | — | Follow-up: `v5-corrections.mjs` writes the apostrophe as a `\u2019` escape |

#### `05_WEBSITE/scripts/release-core.mjs` — V5 step list and reproduction (Task 15)
**Purpose**: The pure half of the release pipeline: which `npm run` steps a version runs, in what order, and the generated `REPRODUCTION.md`.

**Key additions**:
- `V5_STEPS`, returned by `stepsForVersion("V5_*")`;
- `V5_CONTENT_MIGRATION`;
- `reproductionMarkdownV5()`.

**How it works**: `V5_STEPS` is derived from `V4_STEPS` rather than copied, so the two can't drift apart:

```js
const V5_RENAMED = { "qa:pdf-compare": "qa:pdf-compare:v5", "qa:v4-pages": "qa:v5-pages" };
const V5_STEPS = V4_STEPS.flatMap((step) => {
  if (step === "test:e2e:nav") return [step, "test:e2e:hero"];
  if (step === "test:v4-committee-corrections") return [step, "test:v5-updates"];
  return [V5_RENAMED[step] ?? step];
});
```

Three decisions are built into this:
- **The hero test gates releases.** `test:e2e:hero` joins the list. The v4 walkthrough flagged it as missing.
- **The V5 checks get new names.** The comparison and page renders use `qa:pdf-compare:v5` and `qa:v5-pages`, and `V4_STEPS` is left untouched. The closed V4 releases (`release:v4`, `release:v4:02`) therefore stay reproducible as they were.
- **The v4 ordering constraints are inherited.** `pdf` runs right after `build`, and every evidence step runs after `qa`, which wipes `qa-output/`.

The unit test asserts all of this. It also asserts that every V5 step exists as an npm script; that check was added in Task 16, once the two new scripts existed.

The V5 reproduction text names:
- `release:v5`;
- the `V4_REVIEW_02` baseline;
- a foreground-run note;
- the content migration in order: `extract:v5-president-desk` → `corrections:apply-v5` → `tracker:apply-v5`. The corrections must follow the extraction, or the signature fix is lost.

`package.json` gains `release:v5` (`RELEASE_VERSION=V5_REVIEW_01`). `release.mjs` only gained a header comment.

#### `05_WEBSITE/scripts/pdf-compare-core.mjs` — `replaced-item` (Task 16)
**Purpose**: Classify every page of the new PDF against a baseline release and fail on anything unexplained.

**The problem**: Sprint v4's comparison could explain an edit only as a find → replace pair on the baseline text. A whole new message can't be described that way. Simply exempting `MSG-001` would let any text through.

**How it works**: The caller declares `replacedItems: [{ id, expectedText }]`. An item's pages become `replaced-item` only if all of these hold:
- the item exists in both PDFs;
- its text differs from the baseline;
- its text equals the expected text.

Anything else is `unexplained`. The comparison ignores letter case, because CSS uppercases the kicker (`MESSAGES · MSG-001` in the PDF, `Messages · MSG-001` in the HTML). It also ignores whitespace, as the v4 design did for justification and pdftotext spacing.

```js
function checkReplacedItem(baseSpan, curSpan, expectedKey) {
  if (!baseSpan) return { ok: false, class: "unexplained", note: "item not in the baseline; only an existing item can be replaced" };
  if (!curSpan) return { ok: false, class: "unexplained", note: "item missing from the current PDF" };
  const before = baseSpan.map((p) => p.key).join("").toLowerCase();
  const after = curSpan.map((p) => p.key).join("").toLowerCase();
  if (after === before) return { ok: false, class: "unexplained", note: "item declared replaced but its text is unchanged (not replaced)" };
  if (after !== expectedKey) return { ok: false, class: "unexplained", note: `replacement text differs from the expected text: …` };
  return { ok: true, class: "replaced-item", note: "authorised replacement; text equals the expected text" };
}
```

A declared replacement is checked before any correction list for the same ID. As with a failed correction, a failed replacement overrides an exact page match on the item's first page, so an item that was never replaced cannot pass by looking unchanged.

`PAGE_CLASSES` gains `replaced-item`, so V4-profile reports now show a zero row for it; nothing else changes for V4.

Seven new hermetic scenarios cover:
- a same-length replacement;
- a longer replacement that shifts later pages;
- wrong text;
- an item that was not replaced;
- an ID absent from the baseline;
- precedence over corrections, including an unapplied correction failing alongside a replacement;
- unchanged V4 behaviour without a declaration.

#### `05_WEBSITE/scripts/pdf-compare.mjs` — profiles (Task 16)
**Purpose**: The CLI around the core. It runs `pdftotext` (argument array, no shell) and writes `qa-output/pdf-compare/<baseline>-vs-current.{json,md}`.

**How it works**: There are two profiles:
- **`v4`** is the default, so `npm run qa:pdf-compare` behaves exactly as before: V3 baseline, the v4 poem, new items and corrections.
- **`v5`** is `npm run qa:pdf-compare:v5`:
  - the baseline is `06_FINAL_OUTPUT/V4_REVIEW_02`'s PDF;
  - there are no poem or new items;
  - the corrections are `V5_CORRECTIONS` without `MSG-001`, leaving ART-011's byline;
  - `MSG-001` is a replaced item.

`MSG-001`'s signature correction is relative to the extraction, not to the baseline, so the replacement check covers it instead.

The expected text for `MSG-001` is its `<section>` in the built print HTML, which is what the PDF is printed from. That alone would let a wrong build define its own "truth", so the text is first anchored to the approved content: every line of `MSG-001-president-desk.md` must appear in it, in order. The line's `- ` list prefix is dropped and `'` becomes `’`, the typographer's form. If the anchor fails, the script throws with "rebuild the site".

**Real result**:

| Class | Pages |
|---|---:|
| unchanged | 69 |
| correction | 1 (p. 34, `ART-011` byline) |
| replaced-item | 2 (pp. 5–6, `MSG-001`) |
| unexplained | 0 |

**Negative checks, run by hand, all as expected:**
- `--no-corrections` makes `ART-011` unexplained;
- using the current PDF as the baseline makes `MSG-001` "not replaced";
- editing one list item in the built print HTML makes the anchor throw;
- the V4 profile still reports exactly the three pages it did before.

#### `05_WEBSITE/scripts/render-v5-pages.mjs` (new, Task 16)
**Purpose**: `npm run qa:v5-pages` — PNG evidence of the pages this sprint changed, kept in the release.

**How it works**: It reuses Sprint v4's `planV4PageRenders`, which was already generic, with evidence IDs `MSG-001` plus every `V5_CORRECTIONS` ID. It renders each page with `pdftoppm` at 150 dpi into `qa-output/v5-pages/pNN-<ID>.png` and writes `index.json`. On the release PDF that is 8 renders:
- contents, pp. 2–3;
- `MSG-001`, pp. 5–6;
- `ART-011`, pp. 34–37 (the whole article, as v4 rendered whole items).

The new integration test `render-v5-pages` runs the script and checks:
- the rendered set is exactly the contents pages plus the page ranges of the two items;
- each file is a real PNG over 10 KB;
- the page count in `index.json` is correct.

It was red first (module missing) and is part of `test:integration`.

#### `CHANGELOG.md` and `05_WEBSITE/DEPLOYMENT.md` (Task 17)
- **CHANGELOG:** a new `V5_REVIEW_01` section:
  - Changed: `MSG-001`, `ART-011`, the tracker, the retired v4 correction, the release list and the deployable PDF.
  - Added: the v5 scripts, `qa:pdf-compare:v5` with `replaced-item`, `qa:v5-pages` and the tests.
  - Removed: `President Desk.docx` from the intake folder, archived.
  - Unchanged: the other 45 items and the application layer.
- **DEPLOYMENT.md:** a Sprint v5 note. Use `release:v5` in the foreground; the smoke test still expects 47 items; after registering, check the new message and the ART-011 byline.
- **No test:** this is documentation only, and no test pins either file's text. `release.mjs` copies `DEPLOYMENT.md` into the release.

#### `06_FINAL_OUTPUT/V5_REVIEW_01/` and the deployable PDF (Task 18)
**Build**: `npm run release:v5` at `b7ab7d1` with Node 22.23.2. All 32 steps ran in order and passed, in about 3 minutes; the pipeline stops at the first failure.

**Output**: 286 files, 152 MB:
- `website/`, containing the site and the 72-page PDF (SHA-256 `d982f11e…`);
- `release-manifest.json` (47 item IDs and source fingerprints);
- `BUILD_SUMMARY.md`, `REPRODUCTION.md`, the validation and audit reports, `DEPLOYMENT.md`, `THREAT_CHECKS.md`;
- `qa-output/`, including `pdf-compare/V4_REVIEW_02-vs-current.*`, `v5-pages/` and `front-page/`.

The release now also contains the front-page hero change, so the archive matches what a V5 deployment would serve.

**Checks after the build:**
- no tracked file in the V0–V4 release folders changed;
- all 286 files were scanned for the literal values of the five local secrets (`DATABASE_URL`, `DATABASE_URL_TEST`, `SESSION_SECRET`, `IP_HASH_SALT`, `VERCEL_OIDC_TOKEN`), with 0 hits;
- the `MSG-001` evidence render (p. 5) was inspected.

**Deployable PDF**: Vercel's build cannot run Chromium, so the site serves the committed `05_WEBSITE/release-assets/print/BECAA-2026-complete-review.pdf`. It was replaced with the V5 PDF (it was `cd1197db…`), and the copy was checked byte-identical.

**How it was run**: a foreground call in this environment is capped at 10 minutes, and a harness-managed background run was stopped for low memory in Sprint v4. So the pipeline ran as a detached process, logging to the session scratchpad. A waiter reported its exit code, and the log was checked while it ran.

#### Follow-up fix: `v5-corrections.mjs` (`af3386b`)
While writing this walkthrough I found that the correction data held a literal `’`. Its header comment, which was meant to explain the `\u2019` escape, had itself been turned into the character. The code now uses the escape, as intended and as Sprint v4 did for Bengali. The string value is identical: the tests pass, and `corrections:apply-v5` reports both entries `already applied`. `V5_REVIEW_01`, built one commit earlier, is unaffected.

#### An environment incident during Task 15
Partway through Task 15 the host lost its Node 22. `~/.local/bin/node` was a link into `~/.hermes/node/`, and the whole `~/.hermes` directory had been deleted by something outside this session. `node` then resolved to the system Node 18: `session.test` segfaulted, `gate.test` failed, and `npm`/`npx` stopped working.

The Task 15 commit was first written claiming `test:unit` was green, which had not been verified. It was amended before any push to say what had actually run. With the owner's approval, Node v22.23.2 was reinstalled user-locally:
- the official tarball, checked against nodejs.org's `SHASUMS256.txt`;
- unpacked to `~/.local/node-v22`;
- `~/.local/bin/{node,npm,npx}` repointed there.

`test:unit` then passed in full, and everything after that ran on Node 22.23.2. With the new npm, `npx semgrep` no longer resolves, so semgrep is called directly (the same installed tool).

### Stream G — Verification and deployment (Tasks 19–21)

| Commit | Task | Content |
|---|---|---|
| `c7c9643` | 19 | `sprints/v5/MANUAL_VERIFICATION.md` |
| `0ff7e60` | 20 | `sprints/v5/PREVIEW_DEPLOYMENT.md` (Preview) |
| `46cd606` | 21 | Production section, rollback, Sprint v5 marked complete |

These tasks changed no code; their output is records. The Playwright, probe and cleanup drivers were throwaway scripts kept outside the repository, as in Sprint v4, so this section describes what they did.

#### `sprints/v5/MANUAL_VERIFICATION.md` (new, Task 19)
**Purpose**: The manual verification record for `V5_REVIEW_01`.

**How it works**:
1. **Same bytes as the release.** `diff -rq 05_WEBSITE/_site 06_FINAL_OUTPUT/V5_REVIEW_01/website` reported no differences, so the pages served locally were exactly the release's.
2. **Local server.** A throwaway driver started the local dev-app (`scripts/dev-app.mjs`, the same gate code as `middleware.ts`) against the local test database `becaa_test`.
3. **Browser pass**, at 1440 and 390 px:
   - `/` without a session shows the registration form and no magazine;
   - register a guest, then reload: 47 items;
   - the `MSG-001` card: title "President Desk", unchanged byline, first body line "From the President’s Desk", exactly four `ul > li` with a visible `disc` marker, and a last paragraph that `innerText` splits into `Manik Barman` / `CE ’87` / `President, BECAA Maharashtra`, with no Bengali text of the old message;
   - the `ART-011` byline;
   - the hero tagline;
   - no horizontal overflow;
   - the PDF served with a session, SHA-256 equal to the release PDF;
   - without a session, the PDF is refused (403) and `/admin/` shows its login form.
4. **Evidence.** Element screenshots, inspected by eye, are in git-ignored `qa-output/v5-manual/`. The 2 test registrations were deleted from `becaa_test`.

The first run failed on the driver itself, not the site: it expected a redirect to `/welcome/`, but the gate serves the welcome page at `/` directly. The check was corrected to look for the registration form. **Result:** 16/16 checks pass, and no defects were found. Two known points are recorded for the editor: the wording published as supplied, and the source heading shown as the first body line (Decisions A–C).

#### `sprints/v5/PREVIEW_DEPLOYMENT.md` — Preview (new, Task 20)
**Purpose**: The deployment record for Tasks 20–21, in the Sprint v4 format.

**How it was done**:
- **Access, without exposing anything:**
  - The Preview environment and a fresh development OIDC token were pulled into a mode-700 scratch folder outside the repository. Only key names were ever listed, and the files were shredded at the end.
  - The protected Preview was reached by sending the token as `x-vercel-trusted-oidc-idp-token`. The header was added only for `*-mani125slm.vercel.app` deployment URLs.
- **Before deploying:**
  - The Preview database was at 3 visitors, 3 visits, 0 admin sessions and 0 rate-limit rows. The verification start time was recorded for cleanup.
  - Migrations: Applied 1, Pending none.
  - A false alarm was ruled out. The pulled environment listed `VERCEL_GIT_*` keys, but they were empty placeholders, and `vercel ls` showed no deployment since Sprint v4. The pushes to GitHub had not triggered anything.
- **Deploy:** `vercel deploy` (no `--prod`) from the clean tree at `c7c9643` produced `…-1wxfioxpc-…` (`dpl_8SUCuYZZUSfU7XA6pHrxveh2QnKP`).
- **Probes:** 12 unauthenticated checks, all as expected:
  - welcome at `/` and `/print/`;
  - health `{"ok":true,"db":true}`;
  - PDF and artwork 403;
  - a forged cookie treated as no session;
  - admin stats 401, wrong-password login 401;
  - cross-origin register 403, `GET /api/register` 405;
  - `/admin/` with `X-Frame-Options: DENY` and `no-store`;
  - CSP, `nosniff`, referrer policy and HSTS on `/welcome/`.

  Five public files (`site.css`, `print.css`, `site.js`, `/welcome/`, `/admin/`) were compared by SHA-256 with the build: identical.
- **Content check:** one registered guest. The served `index.html` and the PDF were byte-identical to `V5_REVIEW_01`, and the new message, the ART-011 byline and the hero were all correct.
- **Browser suite:** `e2e:app --public-only` passed 14 steps. Registration is limited to 5 per IP per 10 minutes and the suite needs all five, so it ran only after the content check's window had cleared; a background timer waited until 14:16:40 UTC.
- **Admin flow on Preview:** not run. It would have needed a new temporary Preview `ADMIN_PASSWORD_HASH`, a configuration change, and nobody holds the current one. Running it was also unnecessary: `git diff 75688c9..HEAD` on `api/`, `lib/`, `middleware.ts`, `db/` and `vercel.json` is empty, and the full admin flow passed locally in the release's `e2e:app`.
- **Cleanup, in one transaction:**
  - 4 `e2e-*` visitors (their visits cascade);
  - 3 rate-limit windows started since the recorded start time;
  - 0 admin sessions.

  No genuine registration arrived meanwhile. The database was left at 3/3/0/0, exactly as found.

#### `sprints/v5/PREVIEW_DEPLOYMENT.md` — Production (Task 21)
**What happened**: The first step of the v4 Production procedure was pulling the Production environment to check migrations and database counts. The session's permission policy denied it ("Production Reads"). That was not worked around. The owner was offered three options and chose **"Deploy with checks that leave nothing behind"**.

**How it was done**:
- **Deploy.** First confirmed:
  - the tree was clean;
  - `git diff c7c9643 HEAD -- 05_WEBSITE` was empty, so Production got exactly the Preview-verified files.

  Then `vercel deploy --prod` produced `…-efkqodur5-…` (`dpl_3rDCrfTKqGFLinh4BYpEE6bw5imR`), aliased to `becaa-magazine-2026-portal.vercel.app`. `…-3rbvgbgd5-…` stays in the list for rollback.
- **Checks, with no environment file and no token:**
  - the same probes minus the wrong-password login, which was skipped so the owner's live login counter was not touched: 11/11;
  - the five public files: byte-identical to the build.
- **Nothing written.** The checks wrote nothing to Production, by construction:

  ```
  // api/register.ts — order of checks (each one stops the request without touching the database unless noted):
  //   method → REGISTRATION_ENABLED → same-origin → body size/shape → honeypot (silent 200)
  //   → minimum form-fill time → per-IP rate limit (one upsert) → validation → upsert visitor …
  ```

  The two register probes stop at "method" (405) and "same-origin" (403), before the rate-limit upsert. `/api/health` only runs `select 1`, and `/api/admin/stats` refuses without a session.
- **Not done on Production:**
  - no migration check (it needs the database URL); safe because Sprint v5 changed no schema or application code;
  - no registration or content check behind the gate;
  - no browser suite.

  The content itself was proven on Preview from the identical tree, and Production's public files match that build.
- **Cleanup:** the scratch folder with the pulled Preview and development environment files was shredded and removed.

### Stream H — Addendum: ad-blocker-proof images, tints without inline styles (Tasks 22–30)

| Commit | Task | Content |
|---|---|---|
| `a8bb51a` | — | PRD §11 and Tasks 22–30 (owner-approved) |
| `ec5a3c1` | 22 | `blocklist-guard-core`, EasyList snapshot, `qa:blocklist` |
| `f516bb9` | 23 | `ad-frame`/`ad-link` → `artwork-frame`/`artwork-link` |
| `84f9cf8` | 24 | Tests served with the production headers; `test:e2e:csp` |
| `20f5bbf` | 25 | `ad-tints.css`; table alignment classes |
| `cbcaa0b` | 26 | `test:e2e:blocker`; full gate |
| `fa83b7d`, `1d10015` | 27 | V5 release list + `release:v5:02` + CHANGELOG; `V5_REVIEW_02` |
| `76b39df` | 28 | Manual verification addendum |
| `fe49e0e`, `48b9530` | 29, 30 | Preview and Production records |

#### How the cause was found
Four observations narrowed it down:
1. **The markup was intact.** The card HTML was identical in V4 and V5, and the template always renders the frame for artwork.
2. **The server worked.** On Preview, a registered Chromium session loaded all 30 images. Production's request log (`vercel logs`, paths and status codes only) showed a newly registered visitor receiving all 30 images with 200, and another browser revalidating 17 cached ones (304), with no refusals.
3. **The browser hid the elements.** When images are forced to fail (403), the frame and alt text still show. The owner's view had no frame at all, so the elements themselves were hidden.
4. **The names matched EasyList.** It has the site-wide rules `##.ad-frame` (line 6348) and `##.ad-link` (line 6487). Injecting exactly those two rules on Preview reproduced the owner's screenshot.

Along the way the console showed the CSP refusing the cards' inline styles; the computed header background was transparent instead of the manifest tint.

#### `05_WEBSITE/scripts/blocklist-guard-core.mjs`, `qa-blocklist.mjs`, `refresh-blocklist-snapshot.mjs`, `scripts/data/easylist-generic-hide-selectors.txt` (new, Task 22)
**Purpose**: Keep the site's own class and id names clear of the rules ad blockers apply on every site.

**How it works**: `extractGenericHideSelectors(text)` keeps only site-wide single-name rules and ignores domain rules, exceptions, element-qualified, compound and attribute selectors. `findBlockedTokens(html, selectors)` compares every class and id in the HTML by exact name, so `ad-frame` never matches `ad-frame-container`.

```js
const GENERIC_CLASS = /^##\.(-?[_a-zA-Z][\w-]*)$/;
const GENERIC_ID = /^###(-?[_a-zA-Z][\w-]*)$/;
```

- **The snapshot:** 13,078 selector names (8,841 classes, 4,237 ids) from EasyList version 202609261449, with a header giving the source, date and licence (GPLv3 / CC BY-SA 3.0). It is regenerated by `refresh-blocklist-snapshot.mjs`, which refuses to write a suspiciously small list.
- **`npm run qa:blocklist`:** checks the magazine, print, welcome and admin pages. It was red on the pre-fix build (`.ad-frame`, `.ad-link`) and is green now.

#### Class rename (Task 23)
`ad-frame` → `artwork-frame`, `ad-frame--memorial` → `artwork-frame--memorial` and `ad-link` → `artwork-link`, in `index.njk`, `print.njk`, `site.css`, `print.css`, `visual-qa.mjs` and `web-ad-cards`. Checks:
- **No visual change:** 6 web cards and 4 PDF pages rendered before and after the rename are pixel-identical.
- **Test:** `web-ad-cards` now also asserts that no `.ad-frame`/`.ad-link` element exists and that every publication image sits in an `.artwork-frame`.
- **Old pin:** `v4-committee-corrections` pins `site.css` byte for byte against an old commit. It now maps the new names back, so exactly this rename is the only difference tolerated.

Other `ad-*` names (`ad-text`, `ad-memorial`, `ad-ink--*`) match no generic rule and are watched by the guard.

#### `tests/e2e/static-server.mjs` and `tests/e2e/csp.test.mjs` (Task 24)
**Purpose**: Make the page tests see what production browsers enforce.

**How it works**: The test server reads `vercel.json` and applies its header rules by path prefix (`/(.*)`, `/admin/(.*)`); an unsupported source form throws. The first version used a dynamic `RegExp` and `Object.assign`, which semgrep flagged, so it is plain prefix matching:

```js
export function productionHeaders(urlPath) {
  const out = {};
  for (const rule of HEADER_RULES) {
    if (!urlPath.startsWith(rule.prefix)) continue;
    for (const { key, value } of rule.headers) out[key.toLowerCase()] = value;
  }
  return out;
}
```

`test:e2e:csp` opens `/`, `/welcome/` and `/admin/`, and records every `securitypolicyviolation` event and CSP console error. It was red first (no CSP header), then red for the real reason: 46 refused inline styles on `/` (25 advertisement tints and 21 ART-006 table cells).

`web-ad-cards`, `ad-backgrounds-qa` and `visual-qa` moved from `file://` to this server. `web-ad-cards` then failed exactly as production behaves ("frame background is the manifest colour"). It and `test:e2e:csp` were deliberately red until Task 25.

The hero and navigation tests had injected a `<style>` tag to turn off smooth scrolling. The policy refuses that too, so they now set `scroll-behavior` through the CSSOM (`element.style.setProperty`), which the CSP allows.

#### `05_WEBSITE/scripts/ad-tints-core.mjs`, `src/ad-tints.11ty.js` (new), `eleventy.config.mjs`, `index.njk`, `base.njk`, `site.css`, `print.css` (Task 25)
**Purpose**: Show the tints and the table alignment without loosening the CSP. There is no `'unsafe-inline'`.

**How it works**:
- **Tints.** `adTint(item)` keeps the tint resolution the old filters used, but only hex colours can reach CSS. `adTintsStylesheet(items)` writes one rule per web-published advertisement, and an id that isn't `AAA-000` throws, so a hostile manifest value cannot inject CSS.
- **The stylesheet.** `src/ad-tints.11ty.js` renders it to `assets/css/ad-tints.css`, which `base.njk` links. `index.njk` no longer has any `style=` attribute.
- **Print.** `print.njk` keeps its inline tint through the same helper, because the PDF is compiled without the CSP.

```css
#ADV-001 { --ad-bg: #b6e2f2; --ad-ink: #20201d; }
```

- **Table alignment.** markdown-it's `th_open`/`td_open` renderer rules turn `style="text-align:…"` into an `align-left|center|right` class, styled in `site.css` (appended) and `print.css`.
- **Old pin.** The `site.css` guard in `v4-committee-corrections` now accepts only those three table-alignment rules after the Task 43 block, and never justification.

**Results:**
- 0 inline styles on `/`;
- `test:e2e:csp` reports 0 violations on the three pages;
- `web-ad-cards` finds 25 tinted cards under the production CSP;
- all 72 PDF pages are pixel-identical to `V5_REVIEW_01` (60 dpi), with identical text.

#### `tests/e2e/ad-blocker.test.mjs` (new, Task 26)
**Purpose**: Prove the images survive a real ad blocker.

**How it works**: It serves the site with the production headers and injects **all** 13,078 generic hide rules as one stylesheet, as a blocker applies them. That needs a CSP-bypassing test context, used only to inject the rules. It then asserts, at 1440 and 390 px, that the 30 publication images are loaded and have a non-zero rendered box.

To prove it can fail, it was run against a copy of the build with the old names restored (`AD_BLOCKER_SITE`): the images were hidden by `.ad-frame .ad-link`. On the new build: 30/30 at both widths. The full gate after a fresh build passed 34 steps.

#### Release `V5_REVIEW_02` (Task 27)
- **Release list:** `V5_STEPS` gains `qa:blocklist` after `qa:v5-pages`, and `test:e2e:csp`, `test:e2e:blocker` after the hero test, for 35 steps.
- **Test gotcha:** the release-core unit test was red first. My first check misread an earlier success line in the output; the real exit code was 1.
- **Build:** `release:v5:02` at `fa83b7d`, detached with an exit-code waiter. All 35 steps passed:
  - the comparison is unchanged (69 unchanged, 1 correction, 2 replaced-item, 0 unexplained);
  - the guard, CSP and blocker checks all pass.
- **Output:** 294 files, 47 items, 0 local secret values, earlier release folders unchanged.
- **PDF:** text and all 72 pages are identical to `V5_REVIEW_01`, and only the embedded creation date differs, so the deployable PDF was replaced with the V5_REVIEW_02 file (`d274c154…`).
- **CHANGELOG:** a `V5_REVIEW_02` section.

#### Verification and deployment (Tasks 28–30)
- **Task 28 — local gate.** 1440/390 px, each as a normal browser (dev-app CSP enforced) and with all EasyList generic rules injected. All 4 runs passed: 30/30 images, ADV-001 tint `rgb(182, 226, 242)`, ART-006 right-aligned, 0 CSP errors. The test registrations were deleted.
- **Task 29 — Preview `…-k5q4b6721-…`.**
  - probes 12/12; 6 public files (incl. `ad-tints.css`) byte-identical;
  - one registered session under Vercel's own CSP: page and PDF byte-identical to the release, 30/30 images visible, 25/25 tints, 0 CSP errors, and 30/30 images with all generic rules injected (390 px);
  - `e2e:app --public-only` passed 14 steps after the registration window cleared;
  - the Preview database returned to 3/3/0/0.
- **Task 30 — Production `…-acdyrs0h7-…`.** The same no-trace scope as Task 21: probes 11/11 (wrong password skipped), 6 public files byte-identical. No environment or database access, no registration.
- **Incident.** Two untracked throwaway scripts sat in `05_WEBSITE/` during the deploys, and `.vercelignore` does not exclude them, so they were uploaded with the deployment source. They contain no secrets, return 404, are not part of the built site, and were deleted. The follow-up is recorded.

## Data Flow

1. **Intake.** The owner drops the new DOCX. Task 1 archives the old one from git, and Task 2 removes it from the intake folder in the same commit that adds the new one.
2. **Extraction.** `extract-v5-president-desk`:
   - verifies the SHA-256;
   - runs mammoth, then `docxHtmlToParagraphText` in list mode, then `buildArticleMarkdown`;
   - writes `MSG-001-president-desk.md`.
3. **Corrections.** `corrections:apply-v5` reads `V5_FILE_CORRECTIONS`, which mirrors the owner correction record:
   - it changes the signature in the content file;
   - it changes ART-011's `branch` in the manifest;
   - each edit happens only from the pending state.
4. **Manifest.** `MSG-001` points at the new source and fingerprint, with `language: en`.
5. **Tracker.** `tracker:apply-v5` takes a snapshot, then updates rows 16 and 23.
6. **Build.** Eleventy renders `MSG-001` (Markdown `- ` lines become `<ul><li>`, two-space line ends become `<br>`) and each item's byline (`contributor, branch, year Batch`). `compile-pdf` prints the print HTML to the 72-page PDF.
7. **Proof.** `test:v5-updates` checks all three surfaces against the expected text, the archived old message, and the `V4_REVIEW_02` bylines. The v4 suite skips the retired `MSG-001` correction and still checks every other v4 correction.
8. **Release.** `npm run release:v5` → `release.mjs` gets `stepsForVersion("V5_REVIEW_01")` and runs the 32 steps with no shell, stopping at the first failure. Along the way:
   - `qa:pdf-compare:v5` reads the new PDF, `V4_REVIEW_02`'s PDF, the built print HTML and the `MSG-001` content file, then classifies every page;
   - `qa:v5-pages` renders the evidence.

   Packaging copies `_site/`, `qa-output/` and the reports into `06_FINAL_OUTPUT/V5_REVIEW_01/` (refusing to overwrite) and writes `release-manifest.json`, `BUILD_SUMMARY.md` and `REPRODUCTION.md`. The PDF is then copied to `release-assets/print/`, which is the file a deployment serves.
9. **Deployment.** `vercel deploy` uploads `05_WEBSITE/` minus `.vercelignore` entries (`.env*`, `_site`, `qa-output`, `node_modules`, reports). Vercel builds the site with `npm run build` and serves:
   - the static pages behind `middleware.ts`, the registration gate;
   - the `api/` functions, backed by the environment's Neon database;
   - the committed PDF from `release-assets/print/`.

   A visitor at `/` gets the welcome page. Registering sets the `becaa_v` session cookie, after which `/` is the magazine with the new `MSG-001` and the corrected `ART-011` byline, and `/print/…pdf` is the V5 PDF.
10. **Tints and images in the browser (addendum).** The page links `site.css` and the generated `ad-tints.css`, whose `#ADV-…` rules set `--ad-bg`/`--ad-ink`, and `site.css` paints each card header and frame with them. No inline style is needed, so the CSP (`default-src 'self'`) refuses nothing. Images sit in `.artwork-frame`/`.artwork-link`, names no generic ad-blocker rule hides. At release time, `qa:blocklist`, `test:e2e:csp` and `test:e2e:blocker` fail the build if either property is lost.

## Test Coverage

**Addendum (Tasks 22–30):**
- **New unit tests:** `blocklist-guard-core` (generic vs domain rules, tokens, exact matching) and `ad-tints-core` (tint resolution, hex-only, hostile id refused). `eleventy-config` gains table-alignment and inline-filter cases, and `release-core` gains the 35-step V5 order.
- **New browser tests:** `test:e2e:csp` (0 violations on `/`, `/welcome/`, `/admin/`) and `test:e2e:blocker` (30/30 images under 13,078 rules at 1440 and 390 px).
- **Now under the production CSP:** `web-ad-cards`, `ad-backgrounds-qa`, `visual-qa`, the hero, navigation and welcome tests.
- **QA gate:** `qa:blocklist`.
- **Release:** `V5_REVIEW_02` passed 35/35 steps.
- **Deployments:** Preview content check (30/30 images, 25/25 tints, 0 CSP errors, blocker-proof) and `e2e:app --public-only` 14 steps; Production probes 11/11 with public files byte-identical.

Each new test was run red first. Two were proven red by reproducing the original defect: `test:e2e:blocker` against the old names, and `web-ad-cards` under the CSP before Task 25. `test:e2e:csp` and `web-ad-cards` were knowingly red between the Task 24 and Task 25 commits.

**Deployment verification (Tasks 19–21):**
- **Local gate:** 16/16 browser checks at 1440 and 390 px.
- **Preview:** 12/12 probes; 5 public files byte-identical; a registered content check with the page and PDF byte-identical to the release; `e2e:app --public-only` 14 steps.
- **Production:** 11/11 probes (wrong-password login skipped); 5 public files byte-identical. No registration, so no content check there.
- **Admin flow:** not run on either deployment; it passed locally in the release's `e2e:app` (24 steps) and `test:e2e:admin`.

**Release (Tasks 15–18):** the `V5_REVIEW_01` release at `b7ab7d1` ran all 32 gated steps and passed each:
- `tracker:validate`, `validate`, `typecheck`, `test:unit` (32 files), `build`, `pdf`, `test`, `test:integration` (40 files, now including `render-v5-pages`);
- `qa`, `qa:v2-items`, `qa:pdf`, `qa:pdf-compare:v5`;
- `test:e2e:cover`, `test:e2e:poem`, `qa:pdf:v2-items`, `qa:ad-backgrounds`, `qa:art006`, `qa:contact`, `qa:v5-pages`;
- `test:e2e:{print-ads,web-ads,nav,hero}`, `test:v4-advertisements`, `test:v4-committee-corrections`, `test:v5-updates`, `test:e2e:{welcome,admin}`;
- `e2e:app`, `check:secrets` (253 files), `check:sql`, and the `audit` gate.

What Tasks 15–16 added or changed in the tests:
- `release-core`: V5 order, V4 unchanged, reproduction text, every V5 step an npm script;
- `pdf-compare-core`: 7 replaced-item scenarios;
- the new `render-v5-pages` integration test.

Each was run red before green. Task 17 is documentation only, with no test.

**Tasks 1–14.** Every task's tests were run red before green, except Task 12. That test was written after its implementation, so its failing mode was proven by mutation (see above). The state on `main` at `8b8164b`, with a fresh `build` + `pdf`, run sequentially in the foreground:

- **Gates:** `validate` (47 items, 0 errors, the 7 long-standing low-resolution print warnings), `tracker:validate` (54 rows, 3 sheets), `typecheck`, `check:secrets`, `check:sql` — pass.
- **Unit:** `test:unit`, 32 files, passes.
  - New: `v5-corrections`, `tracker-v5-core`, `v4-corrections-superseded`.
  - Extended: `article-markdown-core` (list mode; default byte-identical), `eleventy-config` (real ART-011 byline), `tracker-corrections-core` (row-16 v4 remark pinned).
- **Integration:** `test:integration`, 39 files, passes, including the 8 database-backed ones against `becaa_test` on the local cluster (127.0.0.1:5433).
  - New: `extract-v5-president-desk`, `apply-v5-corrections`, `v5-manifest-msg001`, `apply-v5-tracker-updates`, `v5-source-references`, `v5-updates`.
  - Updated: `superseded-sources`, `v4-committee-corrections` (MSG-001 assertions removed; skip behaviour asserted), `add-v2-manifest-items`, `incoming-consolidation`.
- **Browser, PDF and QA** (20 suites), all pass unchanged:
  - `test`, `qa`, `qa:v2-items`, `qa:pdf`, `qa:pdf:v2-items`, `qa:ad-backgrounds`, `qa:art006`, `qa:contact`, `qa:v4-pages`;
  - `test:e2e:{cover,poem,print-ads,web-ads,nav,hero,welcome,admin}`;
  - `test:v4-advertisements`, `test:v4-committee-corrections`, `test:v5-updates`.
- **Application:** `e2e:app`, 24 steps (registration gate → magazine → admin), passes.
- **Expected failure at the time:** `qa:pdf-compare`, wired to the Sprint v3 baseline, reported exactly three unexplained pages: `MSG-001` pp. 5–6 and `ART-011` p. 34. That was precisely the intended change set. Task 16 gave V5 its own comparison against `V4_REVIEW_02`, which explains them; the V4 profile still reports the same three pages, which is correct for a closed V4 release.

## Security Measures

- **Source fingerprint gate:** the extractor refuses any DOCX whose SHA-256 is not `67d8a418…`, so a different or re-saved file can't be published silently.
- **Count-guarded, code-point-exact edits only:** both corrections and the four `MSG-001` manifest fields went through `text-correction-core`. The ART-011 edit is anchored on four lines, because a bare `branch: Civil` would match ten items. The apostrophe is written as the `\u2019` escape in source (since `af3386b`; before that it was a literal `’`).
- **No silent overwrite:** the Task 4 test no longer writes to the real content file. A future re-extraction must be followed by `corrections:apply-v5`, which is re-run safe.
- **Provenance preserved:**
  - the old source is archived byte-exact from git before removal;
  - the retired v4 correction is kept and marked, not deleted;
  - both correction records are append-only;
  - the tracker is snapshotted before its write.
- **Scope:** `git diff 75688c9..HEAD` touches only Sprint v5 files. Nothing changed under `06_FINAL_OUTPUT/`, `01_REFERENCE_2025/`, `03_ADVERTISEMENTS/`, `api/`, `lib/`, `middleware.ts`, `db/`, `src/assets/`, the welcome and admin templates, or `release-assets/`. The application layer and databases are untouched; `e2e:app` used only the local test database.
- **Output escaping:** the list and signature reach the page through markdown-it and the existing templates. No template, `| safe` or script changed, so the CSP is unaffected.
- **Release comparison cannot be satisfied by the build itself:** a replaced item must equal text anchored to the approved content file, so a stale or tampered build fails `qa:pdf-compare:v5` instead of defining its own expected text. An item declared replaced but unchanged also fails.
- **Release output checked:** no local secret value appears in the 286 release files, and `check:secrets` and `check:sql` ran inside the pipeline. Release folders are never overwritten, and the earlier ones are unchanged.
- **No shell in the new tooling:** `pdftotext` and `pdftoppm` run via `execFileSync` with argument arrays. The release runs steps through `node npm-cli.js` with `shell: false`.
- **Runtime provenance:** the reinstalled Node was checked against nodejs.org's published SHA-256 before use.
- **Deployment hygiene (Tasks 20–21):**
  - environment files lived only in a mode-700 scratch folder and were shredded afterwards; no value was printed;
  - the protected Preview was reached with the short-lived development OIDC token, sent only to deployment URLs;
  - no environment variable, credential, protection setting, project or database was changed or deleted;
  - Preview test records were removed in one transaction, leaving the database exactly as found;
  - the Production checks were limited to requests that cannot write to the database;
  - the previous Production deployment was kept for rollback.
- **Security policy kept strict (addendum):** the tint fix did not add `'unsafe-inline'` to the CSP. Tints are served from a same-origin stylesheet built only from validated hex colours and item ids, so manifest data cannot inject CSS. The CSP is now enforced in the page tests, so a future inline style fails `test:e2e:csp`.
- **Ad-blocker resilience:** a committed EasyList snapshot drives both a static name check (`qa:blocklist`) and a browser simulation (`test:e2e:blocker`), and both gate every V5 release.
- **Investigation with minimal access:** the Production request log (paths and status codes) was read to locate the fault; no Production environment or database was read, and no Production record was created.
- **Permission boundary respected:** when Production environment/database reads were denied, the work stopped and the owner chose the scope, rather than reaching the same data another way.
- **Scans:** `semgrep --config auto --quiet --error` is clean on every changed file. `npm audit` shows the same 3 allow-listed highs (`playwright`, `sharp`, `xlsx`), and there were no dependency changes.

## Known Limitations

- **Throwaway scripts uploaded with two deployments.** Untracked verification drivers were in `05_WEBSITE/` during the Task 29/30 deploys, and `.vercelignore` does not exclude them. There were no secrets and they return 404, but they are in the deployment source listing. Fix in Sprint v6: add `.*.mjs` to `.vercelignore`, or keep drivers outside `05_WEBSITE/`.
- **The web copy of `/print/` is still untinted.** `print.njk` keeps inline tints for the PDF, and the CSP refuses them on the website. Visitors use the PDF, which is unaffected.
- **Image paths containing "advertisement" were not renamed** (Decision R): no generic EasyList rule matches them, but stricter lists might. This is a Sprint v6 candidate.
- **The EasyList snapshot ages.** It is dated 2026-09-26; refresh it with `node scripts/refresh-blocklist-snapshot.mjs` before future releases.
- **Production content behind the gate was not opened.** No registration was made on Production (owner-chosen scope). The evidence is indirect but strong: the Production deployment is the identical `05_WEBSITE/` tree whose Preview served the release's exact page and PDF, and Production's public files match the build. The owner can confirm by registering; that creates a real record.
- **No migration or database check on Production.** It was blocked by the permission policy; safe because nothing in `db/`, `api/`, `lib/` or `middleware.ts` changed since Sprint v4.
- **Administrator flow not exercised on either deployment.** It passed locally with the same code. On Production only the owner holds the password, and on Preview it would need a new temporary credential.
- **Deployment records are committed locally.** The Task 19–21 commits and this walkthrough update are not pushed yet.
- **The V4 release lists no longer pass on today's tree.** Running `release:v4`/`release:v4:02` would stop at the V3-baseline comparison (the three intended pages). That is correct, because those releases are closed; V5 uses `release:v5`.
- **The release ran detached, not in the foreground.** A single tool call is capped at 10 minutes. The pipeline's own exit code and log are the record: the log is in the session scratchpad and not committed, but the release folder holds the reports.
- **The host's Node is now user-installed** in `~/.local/node-v22`. Whatever removed `~/.hermes` is unknown. If that tool comes back, it may relink `~/.local/bin/node`.
- **The author's wording is published as supplied** (Decision C). Nine suspected slips, plus two double spaces and `Gaabesu`, are listed in the owner correction record §3 for review; any approved fix goes there first.
- **Double space after `Association)` and in `social media  connectivity`.** They survive in the Markdown. Browsers collapse them on the website; `pdftotext` shows single spaces in the PDF.
- **The `24th` superscript is flattened** by mammoth to plain "24th".
- **Re-extraction is two steps.** `extract:v5-president-desk` alone would reintroduce `CE  87`. The CLI prints a reminder, and `apply-v5-corrections.test` fails if the real file is not extraction + correction.
- **Allow-lists grow by hand.** `v5-source-references` and the two historical tests carry explicit allowances. A future legitimate mention of the old file name needs an allow-list entry with a reason.
- **PDF list check is layout-based.** Because pdftotext drops the bullet glyph, the PDF check relies on indentation. A layout change that removes the indent would fail it, which is a false alarm, not a silent pass.
- **Carried from Sprint v4:**
  - review-era wording on the front page;
  - the stale `ART-010` note;
  - mixed Unicode forms;
  - the three dependency advisories.

## What's Next

Sprint v5 is complete, with `V5_REVIEW_02` in Production. Suggested priorities for a Sprint v6, owner decisions first:
1. **Wording slips in the President's message.** Decide which, if any, of the §3 items in `BECAA Owner Corrections 2026-09-26.md` to correct. Each approved fix is one count-guarded entry in the correction record and `v5-corrections.mjs`, plus a new review build.
2. **Front-page review-era wording.** The eyebrow "Version 1 local review", "Prototype Contents" and the "Local review only" footer are still there, carried since Sprint v4.
3. **Production verification access.** Decide whether future deployments may read the Production environment and database (a permission rule). With it, the full v4 procedure — migration check, content check, cleanup — can run on Production again.
4. **Owner check on Production.** Register once, confirm the new message and ART-011 byline, and optionally log in to `/admin/` with the real password to confirm the dashboard.
5. **Addendum follow-ups:**
   - exclude throwaway scripts from uploads (`.*.mjs` in `.vercelignore`);
   - decide on renaming the "advertisement" image paths;
   - refresh the EasyList snapshot before each release;
   - optionally tint the web copy of `/print/` from the stylesheet as well.
6. **Carried technical items:**
   - normalise Bengali content to one Unicode form;
   - refresh the stale `ART-010` note;
   - the three allow-listed dependency advisories (`playwright`, `sharp`, `xlsx`);
   - find out what removed `~/.hermes`, so the host's Node setup stays stable.
