# BECAA Owner Corrections — 2026-09-26

Controlled correction record for the BECAA Maharashtra Magazine 2026, Sprint v5.

- **Source instruction:** the owner's change request of 2026-09-26, recorded verbatim in `sprints/v5/Changev5.md`; plan approved 2026-09-26 (`sprints/v5/PRD.md` §1.1, §4.2, §4.4, Decisions C, D and J, approved as recommended).
- **Why this file exists:** no corrected replacement document was supplied for either change. This record is the authoritative editorial source for the targeted corrections below. The original contributor documents in `02_INCOMING_CONTENT/` are **not** modified.
- **Scope:** two corrections. No publication item is added, removed or reordered; the manifest stays at 47 items.
- **Matching rule:** each replacement is applied to the exact text shown, with the stated occurrence count, through the count-guarded `05_WEBSITE/scripts/text-correction-core.mjs`. If the text is found a different number of times, the correction must stop rather than guess. The machine-readable forms are in `05_WEBSITE/scripts/v5-corrections.mjs`.

---

## 1. `MSG-001` — President Desk, signature (Decision D)

- **Working content file:** `05_WEBSITE/src/content/messages/MSG-001-president-desk.md` (second line of the three-line signature, as written by the Sprint v5 extractor)
- **Original source (unchanged):** `02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx` (SHA-256 `67d8a418d781e5bdad16985ceca4f64c6a40bd40d10a3cf075c9bd18dc9f3bf7`)
- **Occurrences to change:** exactly 1.

| | Exact text | Code points |
|---|---|---|
| Old | `CE  87` | C, E, U+0020, U+0020, 8, 7 (two spaces) |
| New | `CE ’87` | C, E, U+0020, U+2019 RIGHT SINGLE QUOTATION MARK, 8, 7 |

Signature after the correction:

```
Manik Barman
CE ’87
President, BECAA Maharashtra
```

**Out of scope:** every other line of the signature and of the message (see §3).

**Reason:** the new source lost the apostrophe — the double space marks the missing character. The previously approved message (`President Desk.docx`, archived in `04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/`) read `CE ’87`, which is restored.

## 2. `ART-011` — Palash Biswas, বেঁচে থাকার লড়াই ও স্বপ্নের পথ, byline branch (Decision J)

- **Manifest:** `05_WEBSITE/src/_data/publication.yaml` (item `ART-011`, field `branch`)
- **Original source (unchanged):** `02_INCOMING_CONTENT/Palash Article.docx`
- **Article body (unchanged):** `05_WEBSITE/src/content/articles/ART-011-item.md` — its own author line already reads `Mech 2006` and is not edited.
- **Occurrences to change:** exactly 1.

| Where shown | Old (exact) | New (exact) |
|---|---|---|
| Web and PDF byline | `Palash Biswas, Civil, 2006 Batch` | `Palash Biswas, Mechanical, 2006 Batch` |
| Manifest field | `branch: Civil` | `branch: Mechanical` |

`branch: Civil` occurs on ten manifest items, so the edit is anchored on `ART-011`'s own lines, which occur exactly once in the manifest.

Old manifest lines (exact, 4-space indent, each line ending in a newline):

```
    contributor: Palash Biswas
    designation: ''
    passing_year: '2006'
    branch: Civil
```

New manifest lines (exact):

```
    contributor: Palash Biswas
    designation: ''
    passing_year: '2006'
    branch: Mechanical
```

No other field of `ART-011` changes. The `byline` filter renders `branch`, so the website card and the print page change together.

**Reason (owner, 2026-09-26):** the byline `Palash Biswas, Civil, 2006 Batch` must read `Palash Biswas, Mechanical, 2006 Batch`.

## 3. Published as supplied (Decision C)

The following spellings and usages in the new President's message look like slips (PRD §1.1). They are quoted exactly as they appear in the source text. They are **NOT changed**: the message is published as supplied and these await the owner's review. Any correction the owner approves will be added here as an exact old → new entry with its occurrence count, and to `05_WEBSITE/scripts/v5-corrections.mjs`, before it is applied.

| # | As supplied (exact) | Possible intent | Occurrences | Context (as supplied) |
|---|---|---|---|---|
| 1 | `energies` | energises | 1 | `…an unique word that energies all the former students…` |
| 2 | `alma matter` | alma mater | 1 | `The intention being revisiting the alma matter and staying connected…` |
| 3 | `Alma Matter` | Alma Mater | 1 | `…needy Engineering students in Maharashtra and in our Alma Matter.` |
| 4 | `llTs` | IITs (the source has two lower-case L) | 1 | `…run by Central Government at per with llTs & IISc.` |
| 5 | `GABESSU` | GAABESU | 1 | `…partially aligned its activities with GABESSU by participating…` |
| 6 | `GAABESU Maharashtra` | possibly BECAA Maharashtra | 1 | `GAABESU Maharashtra also partially aligned its activities with GABESSU…` |
| 7 | `at per` | at par | 1 | `…run by Central Government at per with llTs & IISc.` |
| 8 | `Sanmilani` | (spelling to confirm) | 1 | `Through different activities like Bijaya Sanmilani, Annual Outdoor Excursion…` |
| 9 | `Association)  an` (two spaces) | one space | 1 | `BECAA (Bengal Engineering College Alumni Association)  an unique word…` |

Also noticed while quoting the source (not listed in PRD §1.1; likewise not changed): a double space in `social media  connectivity`, and the lower-case form `Gaabesu` in `…several welfare activities of Gaabesu.`
