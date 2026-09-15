# Superseded source files — 2026-09-15

This folder contains a byte-exact copy of `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.docx`
as it existed before the Sprint v4 intake, exported from git commit `6a253f6` (the state of
`HEAD` when the revised source arrived). It exists so the earlier encoding stays traceable.
Nothing here is used by any build.

| File | Superseded SHA-256 (this folder) | New authoritative source | Published as |
|---|---|---|---|
| `Shubhra Basu.docx` | `83ae8311a1db9205946b5f7f207985eccace7dbf54d771fed3680a9a11d63af9` | `02_INCOMING_CONTENT/v2-incoming/Shubhra Basu.md` (SHA-256 `0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2`, 1,533 bytes) | `ART-010` |

Reason: the authoritative source changed format on 2026-09-15 (Sprint v4, decisions A and B
in `sprints/v4/PRD.md`). The committed `.docx` encoded 17 poem lines as `<w:br/>` soft breaks
inside 9 paragraphs; `mammoth.extractRawText` discarded those breaks, producing merged lines
in the published poem. The replacement is a plain Markdown `.md` file: 17 lines each ending
with `<br>`, no stanza gaps, identical wording. The `.md` is read directly by
`scripts/extract-v4-golap.mjs` without any DOCX parsing.

2026-09-15 addendum (Sprint v4 Task 1): `Shubhra Basu.docx` was deleted from the working tree
by the editor; this archive preserves it. The `v2-incoming` folder was later merged into
`02_INCOMING_CONTENT` as part of Task 4 (consolidation); the `.md` file now lives at
`02_INCOMING_CONTENT/Shubhra Basu.md`.
