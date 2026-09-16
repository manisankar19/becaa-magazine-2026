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
