# Sprint v5 — Walkthrough (Tasks 1–18)

Scope note: Sprint v5 has 21 planned tasks. This walkthrough covers Tasks 1–18:
- **Tasks 1–14:** intake, the `MSG-001` replacement, the `ART-011` branch correction, the tracker, and verification (`a823182..8b8164b`).
- **Tasks 15–18:** the V5 release list, the PDF comparison against `V4_REVIEW_02`, CHANGELOG, and the `V5_REVIEW_01` review build (`a70d2da..21c1201`, plus one follow-up fix, `af3386b`).

Everything is on `main`. Leaving aside the 286-file release folder, the sprint changed 51 files (+2,378 / −92 lines).

Not done yet: Task 19 (manual verification record) and Tasks 20–21 (Preview and Production deployments, each needing its own approval). `V5_REVIEW_01` is built but not deployed; Production still serves `V4_REVIEW_02` plus the front-page hero change.

## Summary

The President's message (`MSG-001`) is replaced by his new English message, `02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx`. It is published word for word, with three exceptions:
- its four charity items render as a bulleted list;
- its signature is on three lines;
- one recorded correction, `CE  87` → `CE ’87`, restores an apostrophe the file lost.

The old Bengali source, `President Desk.docx`, was archived byte for byte and removed from the intake folder. The Sprint v4 committee correction that applied only to the old text was retired, not deleted.

`ART-011`'s byline now reads **Palash Biswas, Mechanical, 2006 Batch**. The tracker records both changes.

The manifest still has 47 items, the PDF is still 72 pages, and the website, print HTML and PDF differ from the Sprint v4 build only in those two items.

Tasks 15–18 turned this into a review release, `06_FINAL_OUTPUT/V5_REVIEW_01/`, built by `npm run release:v5` with all 32 gated steps green. The new PDF comparison against `V4_REVIEW_02` finds 69 pages unchanged, the `ART-011` byline page as a recorded `correction`, the two `MSG-001` pages as a verified `replaced-item`, and nothing unexplained. The front-page hero test now gates releases, and the deployable PDF is the V5 one.

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

## Test Coverage

**Final state (Tasks 15–18):** the `V5_REVIEW_01` release at `b7ab7d1` ran all 32 gated steps and passed each:
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
- **Scans:** `semgrep --config auto --quiet --error` is clean on every changed file. `npm audit` shows the same 3 allow-listed highs (`playwright`, `sharp`, `xlsx`), and there were no dependency changes.

## Known Limitations

- **Built, not deployed.** `V5_REVIEW_01` exists and the deployable PDF is updated, but no Preview or Production deployment has been made; Production still shows the old message and the old ART-011 byline. Deploying needs the owner's explicit approval (Tasks 20–21).
- **Task 19 (manual verification record) is not done.** The evidence render of `MSG-001` p. 5 was inspected, but there is no browser pass through the local registration gate for V5 yet.
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

The rest of this sprint:
1. **Task 19:** manual verification of `V5_REVIEW_01` through the local registration gate at 1440 and 390 px (the new message card, the ART-011 byline, the PDF renders), recorded in `sprints/v5/MANUAL_VERIFICATION.md`.
2. **Tasks 20–21:** Preview, then Production, from the release commit, each only after its own explicit approval. After deploying, check the served PDF byte for byte against `V5_REVIEW_01` (SHA-256 `d982f11e…`).

Owner decisions that can come at any time:
- which, if any, of the §3 wording slips to correct;
- the remaining front-page review-era wording.
