# BECAA Committee Corrections — 2026-09-16

Controlled correction record for the BECAA Maharashtra Magazine 2026, Sprint v4.

- **Source instruction:** BECAA committee corrections received after Sprint v4 Task 1 (commit `fbe59d6`), recorded in `sprints/v4/v4changev2.md`; plan amended and approved 2026-09-16 (`sprints/v4/PRD.md` §1.2, §4.7, Decisions O–U).
- **Why this file exists:** no corrected replacement page or revised contributor document was supplied. Per the addendum §3.1–3.2 and Decision T, this record is the authoritative editorial source for the targeted corrections below. The original contributor documents in `02_INCOMING_CONTENT/` are **not** modified.
- **Scope:** five corrections to already-approved content. No publication item is added, removed or reordered; the manifest stays at 47 items.
- **Matching rule:** each replacement is applied to the exact text shown, with the stated occurrence count. If the text is found a different number of times, the correction must stop rather than guess.
- **Unicode encoding:** the Bengali letter য় can be stored as one code point (U+09DF) or two (U+09AF U+09BC); they are canonically equivalent and render identically. The text in this record is in Unicode NFC (two code points). The working files differ: `MSG-001-president-desk.md` stores য় as U+09DF throughout, and `ART-003-item.md` stores it as U+09AF U+09BC throughout. Each correction is applied in the target file's own encoding (so `পরিচয়` in `MSG-001` stays U+09DF, and the new `ভাবায়` in `ART-003` uses U+09AF U+09BC); the machine-readable forms are in `05_WEBSITE/scripts/v4-corrections.mjs`.

---

## 1. `MSG-001` — President Desk (Bengali wording, review PDF page 5)

- **Working content file:** `05_WEBSITE/src/content/messages/MSG-001-president-desk.md` (line 14, last sentence of the message's second paragraph)
- **Original source (unchanged):** `02_INCOMING_CONTENT/President Desk.docx`
- **Committee instruction:** replace `বেকান` with `BECAA র`; confirmed form `BECAA-র` (Decision O).
- **Occurrences to change:** exactly 1.

Old sentence (exact):

```
কর্মজীবনে আমরা যে যেখানেই পৌঁছে থাকি না কেন, বেকান পরিচয় আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।
```

New sentence (exact):

```
কর্মজীবনে আমরা যে যেখানেই পৌঁছে থাকি না কেন, BECAA-র পরিচয় আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।
```

**Out of scope — must not be touched:**

- The other standalone `বেকান` in the salutation `প্রিয় বেকান ও বেকানী বন্ধুরা,` (line 12). There `বেকান` is a plain adjective paired with `বেকানী`; the possessive `BECAA-র` would not parse.
- Every occurrence of `বেকানী` (a different word, the feminine form).

**Reason (committee):** incorrect Bengali expression; the possessive `BECAA-র পরিচয়` ("BECAA's identity") is the intended wording.

## 2. `MSG-002` — title spelling

- **Manifest:** `05_WEBSITE/src/_data/publication.yaml` (`title`, and the `alt` field that repeats the title)
- **Working content file:** `05_WEBSITE/src/content/messages/MSG-002-vice-preseident-desk.md` (front matter `title`)
- **Original source (unchanged):** `02_INCOMING_CONTENT/Vice president desk.docx`

| Field | Old (exact) | New (exact) |
|---|---|---|
| Title | `Vice Preseident Desk` | `Vice President Desk` |

**Out of scope (Decision P):** the content filename `MSG-002-vice-preseident-desk.md` and the body's own first line `Vice President’s Desk` stay unchanged. No other editorial form (e.g. `Vice President's Desk`) is substituted for the title.

**Reason (committee):** spelling correction only.

## 3. `ART-003` — Biswajit Chakraborty (বিশ্বজিৎ চক্রবর্তী), স্মৃতির গলিতে

- **Working content file:** `05_WEBSITE/src/content/articles/ART-003-item.md`
- **Original source (unchanged):** `02_INCOMING_CONTENT/Smritir Golite.docx`

| # | Old (exact) | New (exact) | Occurrences | Context (old) |
|---|---|---|---|---|
| 1 | `ভাইবই` | `ভাবায়` | 1 | `…যা আজকের দিনে কোন কলেজে ভাইবই যায় না।` |
| 2 | `পারিমা` | `পরিমা` | 1 | `…লেডিস হোস্টেল পারিমা টার্গেট করলাম।` |

Every other character, punctuation mark, paragraph break and mixed-language expression is preserved.

**Reason (committee):** Bengali spelling corrections.

## 4. `ART-004` and `ART-005` — Late Biswajit Sengupta

- **Manifest:** `05_WEBSITE/src/_data/publication.yaml` — new reader-facing field `display_name: Late Biswajit Sengupta` on `ART-004` (হাজতবাস থেকে খুব জোর বেঁচে গেছিলাম) and `ART-005` (A Reflection on Cancer, Ageing, and Helplessness in the Face of Science).
- **Unchanged:** `contributor: Biswajit Sengupta` (provenance/audit identity), both original documents (`Memory from 5th Year - B. Sengupta.docx`, `Why we die- B. Sengupta.docx`), and both article bodies (Decision R).

| Where shown | Old (exact) | New (exact) |
|---|---|---|
| Web and PDF byline name for `ART-004`, `ART-005` | `Biswajit Sengupta` | `Late Biswajit Sengupta` |

**Not published:** the date or circumstances of death. They are recorded in the addendum only as the committee's reason and must not appear in the magazine.

**No other contributor** receives a `Late` prefix.

**Reason (committee):** Biswajit Sengupta has passed away; the committee requested the prefix `Late`.

## 5. Print-only justification of article prose

Not a text correction; recorded here for completeness. Article body prose paragraphs are justified in the print/PDF stylesheet only (Decision S). Titles, bylines, headings, verse, lists, captions, quotations, messages, gallery, advertisements, memorial text and contents are excluded, and the website is not justified. No content file changes.

**Reason (committee):** justified article text requested for the printed magazine.

---

## Addendum — approvals of 2026-09-17

Recorded from the project owner's written approval in the Sprint v4 session on 2026-09-17, after the `V4_REVIEW_01` verification (`sprints/v4/MANUAL_VERIFICATION.md`). The same rules apply: exact text, stated occurrence counts, and no original contributor document modified.

### 6. `ADV-028` — M/s Balajee Infrate advertisement wording

| Field | Old (exact) | New (exact) |
|---|---|---|
| Title and the single text line (`text_lines[0]`) | `Best Compliment from M/s Balajee Infrate` | `We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate` |

The sentence is shown **once** on the advertisement page (website card and PDF page). `contributor` stays `M/s Balajee Infrate`. The contents lists keep showing the title, as for every item.

### 7. Text-only advertisements and the memorial — no repeated heading

The visible heading that repeated the page text is removed on the website and in the PDF:

- **Text-only advertisements** (`ADV-027`, `ADV-028`): the heading repeated the sentence.
- **Memorial** (`ADV-029`): the heading "In fond memory of Late Shri Bhakta Mohon Mitra" repeated text lines 1–2.

On each page the approved text appears once. The section kicker and the contents entries are unchanged. This resolves `MANUAL_VERIFICATION.md` findings 1–2.

### 8. `ART-004` and `ART-005` — Bengali author line in the article body

| File | Old (exact) | New (exact) | Occurrences |
|---|---|---|---|
| `05_WEBSITE/src/content/articles/ART-004-item.md` | `বিশ্বজিৎ সেনগুপ্ত` | `প্রয়াত বিশ্বজিৎ সেনগুপ্ত` | 1 |
| `05_WEBSITE/src/content/articles/ART-005-…-science.md` | `বিশ্বজিৎ সেনগুপ্ত` | `প্রয়াত বিশ্বজিৎ সেনগুপ্ত` | 1 |

The new `প্রয়াত` uses the Unicode NFC form of য় (U+09AF U+09BC). No other character of either article changes.

### 9. `ART-009` — remove the stray page-break character

`05_WEBSITE/src/content/articles/ART-009-tokenomics-how-your-ceo-learned-that-ai-isnt-actually-free.md` contains one U+000C (form feed), a page-break code carried over from DOCX extraction, just before the word "meeting". It printed as a missing-glyph box. It is removed; the wording is unchanged ("…in a meeting he scheduled…").

### 10. Website navigation — anchor jumps clear the sticky header

This is a presentation fix, not a text change: after a navigation or contents jump, the target's top is no longer hidden behind the sticky site header.

---

## 11. Addendum 2026-09-26 — MSG-001 correction superseded

Recorded in Sprint v5 (`sprints/v5/PRD.md` §4.3, Decision H). Sections 1–10 above are unchanged and remain the record of what was approved and applied in Sprint v4.

- The corrected sentence of §1 (`বেকান পরিচয়` → `BECAA-র পরিচয়`) belonged to the President's earlier Bengali message. On 2026-09-26 the President supplied a new message in English (`02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx`), which replaces `MSG-001` in full and does not contain that sentence.
- The superseded source, `President Desk.docx`, is archived byte for byte at `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/` (SHA-256 `c9f5d073f3b732ef6c30466b210db2622a7e9afc756bff070e537bce2db38ddb`) and was removed from `02_INCOMING_CONTENT/` (Decision G).
- The §1 correction is therefore **retired, not reversed**: it is kept in `05_WEBSITE/scripts/v4-corrections.mjs` as history, marked `superseded` (date 2026-09-26, reason: `MSG-001` replaced by the new President's message, Sprint v5 Decision H). The correction script skips it and says why; the Sprint v4 regression test no longer checks `MSG-001` for it. The tracker remark written for it in Sprint v4 (Item ID 16) is kept.
- The corrections in §§2–9 (`MSG-002`, `ART-003`, `ART-004`, `ART-005`, `ADV-028`, `ART-009`) and the presentation changes in §§5, 7 and 10 are not affected and stay in force.
