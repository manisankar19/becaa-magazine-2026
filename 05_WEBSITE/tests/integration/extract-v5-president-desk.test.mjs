// Integration test for scripts/extract-v5-president-desk.mjs — Sprint v5 Task 4
// (Decisions A, B, C, E, F). Runs the extractor against the real source DOCX
// and asserts the shipped MSG-001 Markdown is the President's new message,
// verbatim, with the four charity items as one bullet list and the signature
// on three lines.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectRoot, sha256 } from "../../scripts/lib.mjs";
import {
  EXPECTED_SOURCE_SHA256,
  buildPresidentDeskMarkdown,
  extractPresidentDesk,
  sourcePath,
  verifySourceFingerprint,
} from "../../scripts/extract-v5-president-desk.mjs";

const FINGERPRINT = "67d8a418d781e5bdad16985ceca4f64c6a40bd40d10a3cf075c9bd18dc9f3bf7";

async function run() {
  // Source guard: the extractor refuses any file but the one received 2026-09-26.
  assert.equal(EXPECTED_SOURCE_SHA256, FINGERPRINT);
  assert.equal(sha256(sourcePath), FINGERPRINT, "the source DOCX must be the new President's message");
  assert.doesNotThrow(() => verifySourceFingerprint(sourcePath));
  const otherDocx = path.join(projectRoot, "02_INCOMING_CONTENT", "secretary desk.docx");
  assert.throws(() => verifySourceFingerprint(otherDocx), /SHA-256/, "a different file must be refused");

  // Sprint v5 Task 6: extraction writes to a temporary file here, never to the real
  // MSG-001 file, which carries the recorded signature correction on top of the extraction.
  const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "v5-msg001-")), "MSG-001-president-desk.md");
  await extractPresidentDesk({ outputPath });
  assert.ok(fs.existsSync(outputPath), "output Markdown file must exist");
  const first = fs.readFileSync(outputPath, "utf8");
  assert.equal(first, await buildPresidentDeskMarkdown(), "the writer writes exactly the built Markdown");

  // Idempotent: a second run writes byte-identical output.
  await extractPresidentDesk({ outputPath });
  const written = fs.readFileSync(outputPath, "utf8");
  assert.equal(written, first, "second run must be byte-identical");

  // Front matter.
  assert.match(written, /^---\nid: MSG-001\n/);
  assert.match(written, /\ntitle: "President Desk"\n/, "display title kept (Decision A)");
  assert.match(written, /\nsource_file: "02_INCOMING_CONTENT\/Souvenir President message 05-09-2026\.docx"\n/);
  assert.match(written, new RegExp(`\\nsource_fingerprint: ${FINGERPRINT}\\n`));
  assert.match(written, /\nverification: verified\n---\n/);

  const body = written.split("---\n").slice(2).join("---\n");
  const blocks = body.trimEnd().split("\n\n");

  // Heading kept as the first body line, plain text (Decision B).
  assert.equal(blocks[0], "From the President's Desk", "source heading is the first body line, no emphasis markup");

  // Block structure: heading, 7 paragraphs, the list, 1 paragraph, the thanks line, the signature.
  assert.equal(blocks.length, 12, "heading + 8 prose paragraphs + list block + thanks line + signature block");
  const listIndex = blocks.findIndex((block) => block.startsWith("- "));
  assert.equal(listIndex, 8, "the list follows the 7th prose paragraph");
  const prose = [...blocks.slice(1, listIndex), blocks[listIndex + 1]];
  assert.equal(prose.length, 8, "8 prose paragraphs (verified against the source DOCX: 22 w:p = heading, 8 prose, 4 list items, thanks, signature, 7 empty)");
  prose.forEach((paragraph) => assert.ok(!paragraph.startsWith("- ") && !paragraph.includes("\n"), `prose paragraph is a single plain line: ${paragraph.slice(0, 40)}`));
  assert.ok(prose[0].startsWith("BECAA (Bengal Engineering College Alumni Association)  an unique word"), "author's wording verbatim, double space kept (Decision C)");
  assert.ok(prose[2].includes("24th November 1856"), "superscript ordinal flattened to plain text");
  assert.ok(prose[6].endsWith("Few to mention about those charity programs that our organization undertakes are:"));
  assert.ok(prose[7].startsWith("In our journey so far, I felt all our members"));

  // One bullet block of exactly 4 items.
  const bulletLines = body.split("\n").filter((line) => line.startsWith("- "));
  assert.equal(bulletLines.length, 4, "exactly 4 bullet lines in the whole body");
  assert.deepEqual(blocks[listIndex].split("\n"), [
    "- Extending Donation to spiritual Charitable organizations like Sharada Math Bharat Sevasram Sangha",
    "- Extending Charity Contribution in the Chief Minister Relief Fund Maharashtra and in the major events of National Disasters",
    "- Extending Educational assistance to the needy Engineering students in Maharashtra and in our Alma Matter.",
    "- Extending Medical aids to the members and their immediate families in emergency situation.",
  ], "the four charity items form one list block, in order");

  // Closing thanks and the three-line signature (hard breaks; "CE  87" left as supplied — Task 6 corrects it).
  assert.equal(blocks[10], "On behalf of my entire Managing Committee and its members I sincerely thank you all.");
  assert.equal(blocks[11], "Manik Barman  \nCE  87  \nPresident, BECAA Maharashtra", "signature on three lines via Markdown hard breaks");
  assert.ok(body.endsWith("President, BECAA Maharashtra\n"));

  // No images (Decision F), no HTML, no markup, nothing of the old Bengali message.
  assert.ok(!/data:|<img|word\/media/.test(written), "embedded images are never imported");
  assert.ok(!/<\/?[a-z][^>]*>/i.test(body), "no HTML tags leak into the Markdown");
  assert.ok(!/\*|_{2}/.test(body), "no emphasis markup");
  assert.ok(!body.includes("সভাপতির কলম থেকে"), "old Bengali heading is gone");
  assert.ok(!/[ঀ-৿]/.test(body), "no Bengali text from the old message remains");
  assert.ok(!/NEEDS VERIFICATION|TODO|TBD/.test(written), "no unresolved extraction markers");

  console.log("PASS: MSG-001 (new President's Desk) extracted verbatim: heading, 8 prose paragraphs, 4-item list, thanks line, 3-line signature; text-only; idempotent.");
}

await run();
