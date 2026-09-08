# Sprint v2 — Material Change Register

Generated: 2026-09-07
Sources inspected:
- `02_INCOMING_CONTENT/v2-incoming/` (5 files)
- `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker addendum.xlsx` (5 content rows)
- `04_MAGAZINE_WORKING/BECAA_2026_Content_Tracker.xlsx` (47 rows, active)
- `05_WEBSITE/src/_data/publication.yaml` (V1 manifest, 40 included items)
- `06_FINAL_OUTPUT/V1_COMPLETE_REVIEW_03/website` (built V1 site + PDF)
- `05_WEBSITE/src/assets/normalized/` (normalized asset copies)

No files in `v2-incoming` or the main tracker were modified, renamed or deleted during this analysis. All hashes below were computed read-only.

---

## 1. Inventory — `02_INCOMING_CONTENT/v2-incoming/`

| File | Type | Size | SHA-256 (short) |
|---|---|---|---|
| `Palash Article.docx` | DOCX | 3.4 MB (1 embedded PNG, 2.5 MB) | `b0a1ba37…` |
| `Shubhra Basu.docx` | DOCX | 14 KB | `83ae8311…` |
| `Siddhartha Mukhopadhyay story.docx` | DOCX | 13.5 KB | `a13de2ba…` |
| `chatgpt kallol.jpeg` | JPEG, 1600×1236, no DPI tag | 191 KB | `b3a24a98…` |
| `cover page new.png` | PNG, 1240×1748, 300 DPI declared | 1.8 MB | `29a12bcb…` |

All 5 files are structurally valid (verified with `file`, `mammoth`, `PIL`). No corruption detected.

## 2. Addendum tracker — `Content Tracker` sheet

5 rows, Item IDs **20–24**, continuing directly from the main tracker's last plain numeric ID (**19**) with no collision. `Lists` and `Instructions` sheets are byte-identical in structure/content to the main tracker's — no dropdown/validation conflicts to reconcile.

| Item ID | Title | Type | Contributor | Passing Yr / Branch | Source File Name (as entered) | Permission | Status |
|---|---|---|---|---|---|---|---|
| 20 | Climate Change and its Impact on Amchi Mumbai | Technical Article | Sudipta Chakraborty | 1978 / Civil | `Article for BECAA Maharashtra Souveneir.pdf` | Print and web | **Approved** |
| 21 | Chatgpt | Painting / Drawing | Kallol Roy | 1991 / Civil | `chatgpt kallol.jpeg` | Print and web | Approved |
| 22 | গোলাপ (Golap) | Poem | Shubhra Basu (wife of Pranab Basu) | 1978 / Civil | `Shubhra Basu.docx` | Print and web | Approved |
| 23 | বেঁচে থাকার লড়াই ও স্বপ্নের পথ | Article | Palash Biswas | 2006 / Civil | `Palash Article.docx` | Print and web | Approved |
| 24 | Siddhartha Mukhopadhyay story | Story | Siddhartha Mukhopadhyay | 1986 / Electrical | `Siddhartha Mukhopadhyay story.docx` | **Pending** | **Awaiting** |

## 3. Per-item classification

### Item 21 — GAL candidate — **NEW, ready**
- File present, matches addendum exactly. JPEG 1600×1236, valid, no corruption.
- No name/title collision with any existing tracker row or manifest entry.
- Proposed manifest ID: **GAL-007** (next free ID in the `gallery` section; precedent shows "Painting / Drawing" tracker rows map to the `GAL-` prefix, not a new prefix).
- Website inclusion: Yes. PDF inclusion: Yes, subject to the same print-resolution warning tier as other GAL/ADV items in V1 (1600 px wide is comfortably above the smallest V1 items that only produced warnings, e.g. GAL-001 at 485 px) — expect a **pass or warning-only**, to be confirmed by `npm run validate` at build time, not a blocker.
- Tracker change: append row 21 as-is to the main tracker.
- Ambiguity: none.

### Item 22 — ART candidate — **NEW, ready**
- File present, matches addendum exactly. Full Bengali text (556 chars) extracts cleanly via `mammoth`, no cutoff, no encoding damage.
- Type "Poem" has no existing precedent in the current manifest (only `message`, `article`, `gallery`, `advertisement`, `cover` types exist today). Following the same precedent used for "Story"-type rows in the main tracker (which were folded into the `ART-` prefix and `articles` section rather than a separate prefix), the poem should also use **ART-010** and the `articles` section — **recommended, not yet applied**.
- Website inclusion: Yes. PDF inclusion: Yes (text-only, no print-resolution risk).
- Tracker change: append row 22 as-is.
- Ambiguity: **approval needed** — confirm the `ART-`/`articles` placement for a poem is acceptable, or specify a different section (e.g. a distinct "Poems" print section, matching the addendum's "Stories / Literature" print-section label rather than "College Memories" used by other poems in the Lists template).

### Item 23 — ART candidate — **NEW, ready**
- File present, matches addendum exactly. Full Bengali text (5,207 chars) extracts cleanly, no truncation at either end.
- Contains one embedded image (`word/media/image1.png`, 2.5 MB) inside the DOCX — referenced narratively in the story text (illustrative "horse picture"), not marked as a required caption/credit image in the tracker. Recommend extracting it as an optional inline illustration only if the article layout supports inline images; otherwise text-only import is sufficient and faithful to the source.
- Proposed manifest ID: **ART-011** (or ART-010 if the poem in Item 22 is placed elsewhere — final numbering depends on the Item 22 decision, both are free either way).
- Website inclusion: Yes. PDF inclusion: Yes.
- Tracker change: append row 23 as-is.
- Ambiguity: none on the text; minor optional decision on whether to surface the embedded image.

### Item 24 — **UNRESOLVED — exclude from V2**
- File present (`Siddhartha Mukhopadhyay story.docx`) but its entire extractable content is the placeholder text **"Story upcoming."** — the real story has not actually been delivered yet, independent of the permission question.
- Tracker also records `Permission: Pending`, `Status: Awaiting` — fails the approval gate on its own.
- Per INSTRUCTION.md, this must be excluded from the release (not blocking) and remains recorded in the tracker for a later batch once (a) real content arrives and (b) permission is confirmed.
- Website inclusion: No. PDF inclusion: No.
- Tracker change: append row 24 as-is (recorded, not published) — matches the instruction that "yet to receive" items may stay in the tracker without blocking release.
- Ambiguity: none — this is a clear exclusion, not a question.

### Item 20 — **UNRESOLVED — genuine ambiguity, needs your decision**
- Addendum names the source file `Article for BECAA Maharashtra Souveneir.pdf` (note the spelling **"Souveneir"**, and a **.pdf** extension).
- This file **does not exist** anywhere in the project — not in `v2-incoming`, not in `02_INCOMING_CONTENT` root, not elsewhere. A project-wide filename search for this name and for "Chakraborty"/"Climate" found nothing.
- A **different, already-published file** exists at `02_INCOMING_CONTENT/Article for BECAA Maharashtra Souvenir.docx` (correct spelling "Souvenir", `.docx`) — but that file is already tracker row 8 / manifest **ART-006**, "Medicine Free Life – a dream or reality!" by a **different author** (Indranil Ghosh), already live in V1. It is not Sudipta Chakraborty's article and must not be substituted for it — doing so would misattribute content to the wrong contributor.
- **Conclusion: the source file for Item 20 was never actually delivered.** The addendum row is either a template/typo carry-over or the PDF is still to be added in a later drop (the project brief allows up to 5 more revised documents).
- Website inclusion: **No, until source file arrives.** PDF inclusion: **No.**
- Tracker change: append row 20 as-is (recorded, flagged), so it is not lost or overwritten later.
- **This is a genuine approval question — see §8 of the report.**

### `cover page new.png` — **REPLACEMENT, ready pending your confirmation**
- Not referenced anywhere in the addendum tracker's `Content Tracker` sheet — its inclusion is based solely on your direct instruction, not a tracker row.
- Corresponds to existing tracker row **`COV-001`** ("একই শিকড় — Official Cover") and manifest entry `COV-001`, currently pointing at `02_INCOMING_CONTENT/Cover page.jpg` (SHA-256 `d8dfb14b…`, 1240×1748, 300 DPI JPEG).
- New file is **pixel-identical in dimensions and DPI** to the current cover (1240×1748, 300 DPI) — a clean drop-in replacement for both the web `<img>` and the print PDF page-one placement, no resizing/recropping required.
- Content differs materially: same official Bengali title "একই শিকড়" (glyphs and conjuncts render correctly, verified visually), but a different illustration style (STEM/drafting-tools motif vs. the current tree-roots/campus motif) and different secondary copy (adds "Since 1856"; the current cover's tagline "স্মৃতি · বন্ধুত্ব · উত্তরাধিকার" is not present on the new artwork). Social-media handles shown (email, Instagram, YouTube, Facebook) match the existing official links exactly.
- File metadata contains Canva export XMP/EXIF tags, including `pdf:Author: Manisankar Dhabal` and internal Canva document/user IDs. Recommend the normalization step strip this metadata before publishing (privacy hygiene, INSTRUCTION.md rule 9), even though it doesn't render visibly.
- Website inclusion: Yes (replaces `COV-001` web asset). PDF inclusion: Yes (replaces `COV-001` print asset / PDF page one).
- Tracker change: update row `COV-001`'s `Source File Name` to `cover page new.png` (with the current file preserved unmodified in `02_INCOMING_CONTENT/Cover page.jpg` and its normalized copy left in place, untouched, as the V1 historical record). **Do not renumber or delete `COV-001`.**
- Ambiguity: none technical — dimensions/format are confirmed safe. Design change is already stated as approved by you; noted here for the record only.

## 4. Duplicate check

No filename, title, author, or content hash in `v2-incoming` collides with any file already present in `02_INCOMING_CONTENT`, `03_ADVERTISEMENTS`, the main tracker, or `publication.yaml`. No duplicates found.

## 5. Summary table

| Source file | Addendum row | Proposed ID | Status | Website | PDF | Tracker action | Approval needed? |
|---|---|---|---|---|---|---|---|
| `cover page new.png` | — (direct instruction) | `COV-001` (replace asset) | Replacement | Yes | Yes | Update `Source File Name` on existing row | No (already approved by you) |
| `chatgpt kallol.jpeg` | Item 21 | GAL-007 | New | Yes | Yes | Append row 21 | No |
| `Shubhra Basu.docx` | Item 22 | ART-010 (proposed) | New | Yes | Yes | Append row 22 | Section placement only |
| `Palash Article.docx` | Item 23 | ART-011 (proposed) | New | Yes | Yes | Append row 23 | No (embedded image handling optional) |
| `Siddhartha Mukhopadhyay story.docx` | Item 24 | — | Unresolved / excluded | No | No | Append row 24 (recorded, excluded) | No — clear exclusion |
| *(missing)* `Article for BECAA Maharashtra Souveneir.pdf` | Item 20 | — | Unresolved / missing source | No | No | Append row 20 (recorded, excluded) | **Yes — see report §8** |

## 6. Proposed main-tracker change (not yet applied)

1. Create a timestamped backup of `BECAA_2026_Content_Tracker.xlsx` in `04_MAGAZINE_WORKING/TRACKER_SNAPSHOTS/` before any edit (consistent with existing snapshot practice).
2. Append addendum rows 20–24 verbatim to the `Content Tracker` sheet as new rows 48–52 (or the next free physical rows), preserving all existing 47 rows, their IDs, and formatting untouched.
3. Update the `Source File Name` for `COV-001` to record the new cover file, preserving the old value in the tracker's `Remarks`/history so the V1 source is traceable.
4. Do not touch `Lists` or `Instructions` sheets (already identical).
5. No existing ID is renumbered or reused.
