// Regression test for the Sprint v4 committee corrections (sprints/v4/v4changev2.md;
// PRD §4.7, §6 rows 21–25; Tasks 23–29). Requires `npm run build && npm run pdf` first.
//
// For each correction: corrected form present and superseded form absent in the working
// content / manifest, the built website and the extracted PDF text. Website checks are
// code-point exact. PDF checks compare after NFC normalisation with whitespace removed,
// because pdftotext splits some Bengali conjuncts with spaces (e.g. "বন্ধু রা").
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { countOccurrences } from "../../scripts/text-correction-core.mjs";
import { MSG001_SENTENCE, V4_FILE_CORRECTIONS } from "../../scripts/v4-corrections.mjs";
import { applyV4FileCorrections } from "../../scripts/apply-v4-committee-corrections.mjs";

const read = (rel) => fs.readFileSync(path.join(siteRoot, rel), "utf8");
const squash = (s) => s.normalize("NFC").replace(/\s+/g, "");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");

// Content as it was before the committee corrections (Task 21's commit): every corrected
// file must equal its baseline with exactly the recorded substitutions applied.
const BASELINE_COMMIT = "ae098d5";
const baseline = (rel) => execFileSync("git", ["show", `${BASELINE_COMMIT}:05_WEBSITE/${rel}`], { cwd: siteRoot, encoding: "utf8", maxBuffer: 30_000_000 });
function assertOnlyRecordedSubstitutions(id) {
  const files = [...new Set(V4_FILE_CORRECTIONS.filter((c) => c.id === id).map((c) => c.file))];
  assert.ok(files.length > 0, `${id}: has file corrections`);
  for (const file of files) {
    let expected = baseline(file);
    for (const c of V4_FILE_CORRECTIONS.filter((x) => x.file === file)) expected = expected.split(c.find).join(c.replace);
    assert.equal(read(file), expected, `${file}: identical to ${BASELINE_COMMIT} apart from the recorded corrections`);
  }
  // Re-running the correction script is a no-op once applied.
  assert.ok(applyV4FileCorrections({ only: [id] }).every((r) => r.action === "already applied"), `${id}: corrections already applied, re-run is a no-op`);
}

const manifest = readManifest();
const item = (id) => manifest.items.find((i) => i.id === id);
assert.equal(manifest.items.length, 47, "manifest item count unchanged at 47");

const indexHtml = read("_site/index.html");
const printHtml = read("_site/print/index.html");
const pdfPath = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
assert.ok(fs.existsSync(pdfPath), "run npm run build && npm run pdf first");
const pages = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 30_000_000 }).split("\f");

// Built website: the <article id="ID"> element for an item.
function webArticle(id) {
  const start = indexHtml.indexOf(`id="${id}"`);
  assert.ok(start !== -1, `${id}: web article present`);
  return indexHtml.slice(indexHtml.lastIndexOf("<article", start), indexHtml.indexOf("</article>", start) + "</article>".length);
}
// Built print HTML: the <section> for an item.
function printSection(id) {
  const marker = printHtml.indexOf(`id="print-${id}"`);
  assert.ok(marker !== -1, `${id}: print section present`);
  const start = printHtml.lastIndexOf("<section", marker);
  return printHtml.slice(start, printHtml.indexOf("</section>", marker) + "</section>".length);
}
// PDF: text of the item's page(s) — from the page whose kicker names the ID up to the next kicker.
const KICKER = /·\s*((?:MSG|ART|GAL|ADV)-\d{3})\b/;
function pdfItemText(id) {
  const first = pages.findIndex((p) => (p.match(KICKER) || [])[1] === id);
  assert.ok(first !== -1, `${id}: PDF page present`);
  let text = pages[first];
  for (let i = first + 1; i < pages.length && !KICKER.test(pages[i]); i++) text += pages[i];
  return text;
}
const pdfContents = pages.filter((p) => p.includes("— Contents")).join("\n");

// --- MSG-001: page-5 Bengali wording (Task 23, Decision O) -------------------
{
  const content = read("src/content/messages/MSG-001-president-desk.md");
  assert.ok(content.includes(MSG001_SENTENCE.new), "MSG-001 content: corrected sentence present verbatim");
  assert.ok(!content.includes(MSG001_SENTENCE.old), "MSG-001 content: superseded sentence absent");
  assert.ok(content.includes(MSG001_SENTENCE.untouched), "MSG-001 content: salutation unchanged");
  assert.equal(countOccurrences(content, "বেকান"), 1, "MSG-001 content: one standalone বেকান left (the salutation)");
  assert.equal(countOccurrences(content, "বেকানী"), 1, "MSG-001 content: বেকানী unchanged");
  assert.equal(countOccurrences(content, "BECAA-র"), 1, "MSG-001 content: exactly one BECAA-র");
  assertOnlyRecordedSubstitutions("MSG-001");

  const web = webArticle("MSG-001");
  assert.ok(web.includes(MSG001_SENTENCE.new), "MSG-001 website: corrected sentence present");
  assert.ok(!web.includes(MSG001_SENTENCE.old), "MSG-001 website: superseded sentence absent");
  assert.ok(web.includes(MSG001_SENTENCE.untouched), "MSG-001 website: salutation unchanged");

  const pdf = squash(pdfItemText("MSG-001"));
  assert.ok(pdf.includes(squash(MSG001_SENTENCE.new)), "MSG-001 PDF: corrected sentence present");
  assert.ok(!pdf.includes(squash(MSG001_SENTENCE.old)), "MSG-001 PDF: superseded sentence absent");
  assert.ok(pdf.includes(squash(MSG001_SENTENCE.untouched)), "MSG-001 PDF: salutation unchanged");
}

// --- MSG-002: title spelling (Task 24, Decision P) ------------------------------
{
  const OLD = "Vice Preseident Desk";
  const NEW = "Vice President Desk";
  const msg002 = item("MSG-002");
  assert.equal(msg002.title, NEW, "MSG-002 manifest title corrected");
  assert.equal(msg002.alt, `${NEW} — Debojit Dutta Biswas`, "MSG-002 manifest alt repeats the corrected title");
  const content = read("src/content/messages/MSG-002-vice-preseident-desk.md");
  assert.match(content, /^title: "Vice President Desk"$/m, "MSG-002 front matter title corrected");
  assert.ok(content.includes("Vice President\u2019s Desk"), "MSG-002 body heading left unchanged (Decision P)");
  assert.ok(fs.existsSync(path.join(siteRoot, "src/content/messages/MSG-002-vice-preseident-desk.md")), "content filename unchanged (Decision P)");
  assertOnlyRecordedSubstitutions("MSG-002");

  // Nowhere in the source data or the build output.
  assert.equal(countOccurrences(read("src/_data/publication.yaml"), OLD), 0, "manifest: superseded title absent");
  const builtFiles = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (/\.(html|json|txt|xml)$/.test(e.name)) builtFiles.push(f); } };
  walk(path.join(siteRoot, "_site"));
  for (const f of builtFiles) assert.ok(!fs.readFileSync(f, "utf8").includes(OLD), `${path.relative(siteRoot, f)}: superseded title absent`);

  // Website: card heading once, contents entry once; title not duplicated on the item.
  const web = webArticle("MSG-002");
  assert.match(web, /<h2[^>]*>Vice President Desk<\/h2>/, "MSG-002 website heading corrected");
  assert.equal(countOccurrences(web, NEW), 1, "MSG-002 website: title shown once on the item");
  const contents = indexHtml.slice(indexHtml.indexOf('id="contents"'), indexHtml.indexOf("</section>", indexHtml.indexOf('id="contents"')));
  assert.equal(countOccurrences(contents, NEW), 1, "MSG-002 website contents entry corrected");
  assert.equal(countOccurrences(contents, OLD), 0);

  // Print HTML and PDF: contents entry and heading.
  assert.match(printSection("MSG-002"), /<h1>Vice President Desk<\/h1>/, "MSG-002 print heading corrected");
  assert.equal(countOccurrences(pdfItemText("MSG-002"), NEW), 1, "MSG-002 PDF heading corrected, shown once");
  assert.ok(!pdfItemText("MSG-002").includes(OLD), "MSG-002 PDF page: superseded title absent");
  assert.match(pdfContents, /\d+\.\s+Vice President Desk\s+MSG-002/, "MSG-002 PDF contents entry corrected");
  assert.ok(!pages.join("\f").includes(OLD), "PDF: superseded title absent everywhere");
}

console.log("v4-committee-corrections: all assertions passed");
