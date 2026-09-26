// Regression test for Sprint v5 (sprints/v5/PRD.md §4.6; Task 12). Requires
// `npm run build && npm run pdf` first.
//
// MSG-001: the President's new message on the website, the print HTML and the PDF — heading,
// prose, the four charity items as a list, the three-line signature with the recorded
// `CE ’87` — and no paragraph of the superseded Bengali message anywhere in the built output.
// ART-011: byline "Palash Biswas, Mechanical, 2006 Batch" everywhere; every other item's byline
// equal to the V4_REVIEW_02 release. Website checks are code-point exact after entity decoding;
// PDF checks compare after NFC normalisation with whitespace removed (pdftotext spacing).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { projectRoot, readManifest, siteRoot } from "../../scripts/lib.mjs";
import { V5_CORRECTIONS } from "../../scripts/v5-corrections.mjs";

const read = (rel) => fs.readFileSync(path.join(siteRoot, rel), "utf8");
const squash = (s) => s.normalize("NFC").replace(/\s+/g, "");
const decode = (s) =>
  s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ");
// markdown-it's typographer turns ASCII quotes into curly ones; compare text in that form.
const curly = (s) => s.replace(/'/g, "’");

const manifest = readManifest();
assert.equal(manifest.items.length, 47, "manifest item count unchanged at 47");

const indexHtml = read("_site/index.html");
const printHtml = read("_site/print/index.html");
const pdfPath = path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf");
assert.ok(fs.existsSync(pdfPath), "run npm run build && npm run pdf first");
const pages = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 30_000_000 }).split("\f");

function webArticle(html, id) {
  const start = html.indexOf(`id="${id}"`);
  assert.ok(start !== -1, `${id}: web article present`);
  return html.slice(html.lastIndexOf("<article", start), html.indexOf("</article>", start) + "</article>".length);
}
function printSection(id) {
  const marker = printHtml.indexOf(`id="print-${id}"`);
  assert.ok(marker !== -1, `${id}: print section present`);
  return printHtml.slice(printHtml.lastIndexOf("<section", marker), printHtml.indexOf("</section>", marker) + "</section>".length);
}
const KICKER = /·\s*((?:MSG|ART|GAL|ADV)-\d{3})\b/;
function pdfItemText(id) {
  const first = pages.findIndex((p) => (p.match(KICKER) || [])[1] === id);
  assert.ok(first !== -1, `${id}: PDF page present`);
  let out = pages[first];
  for (let i = first + 1; i < pages.length && !KICKER.test(pages[i]); i++) out += pages[i];
  return out;
}
const bylineOf = (html) => {
  const m = html.match(/<p class="byline">([\s\S]*?)<\/p>/);
  return m ? decode(m[1]).trim() : null;
};

// --- MSG-001: the new message -------------------------------------------------------------
const HEADING = "From the President's Desk";
const BULLETS = [
  "Extending Donation to spiritual Charitable organizations like Sharada Math Bharat Sevasram Sangha",
  "Extending Charity Contribution in the Chief Minister Relief Fund Maharashtra and in the major events of National Disasters",
  "Extending Educational assistance to the needy Engineering students in Maharashtra and in our Alma Matter.",
  "Extending Medical aids to the members and their immediate families in emergency situation.",
];
const SIGNATURE = ["Manik Barman", "CE ’87", "President, BECAA Maharashtra"];
const PROSE_SAMPLES = [
  "BECAA (Bengal Engineering College Alumni Association)",
  "Indian Institute of Engineering Science & Technology (IIEST), Shibpur is a premier institute",
  "Through different activities like Bijaya Sanmilani, Annual Outdoor Excursion (Picnic)",
  "In our journey so far, I felt all our members and their families were deeply involved",
  "On behalf of my entire Managing Committee and its members I sincerely thank you all.",
];

{
  const web = webArticle(indexHtml, "MSG-001");
  const webText = text(web);
  assert.match(web, /<h2>President Desk<\/h2>/, "MSG-001: display title kept (Decision A)");
  assert.ok(webText.includes(curly(HEADING)), "MSG-001 web: heading line present");
  for (const s of PROSE_SAMPLES) assert.ok(squash(webText).includes(squash(curly(s))), `MSG-001 web: "${s}"`);
  const lists = web.match(/<ul>[\s\S]*?<\/ul>/g) ?? [];
  assert.equal(lists.length, 1, "MSG-001 web: exactly one list");
  const items = [...lists[0].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1]).trim());
  assert.deepEqual(items, BULLETS, "MSG-001 web: the four charity items, in order, as list items");
  assert.ok(web.includes(SIGNATURE.join("<br>\n")), "MSG-001 web: signature on three lines with CE ’87");
  assert.ok(!/<img\b|data:image/.test(web), "MSG-001 web: no embedded image");
  assert.equal(bylineOf(web), "Manik Barman, Civil, 1987 Batch — President", "MSG-001 byline unchanged");

  const print = printSection("MSG-001");
  assert.equal((print.match(/<li>/g) ?? []).length, 4, "MSG-001 print: four list items");
  assert.ok(print.includes(SIGNATURE.join("<br>\n")), "MSG-001 print: three-line signature");
  assert.ok(!/<img\b|data:image/.test(print), "MSG-001 print: no embedded image");

  const pdf = pdfItemText("MSG-001");
  const pdfSquashed = squash(pdf);
  for (const s of [HEADING, ...PROSE_SAMPLES]) assert.ok(pdfSquashed.includes(squash(curly(s))), `MSG-001 PDF: "${s}"`);
  // pdftotext drops the CSS list marker; list items show as indented lines.
  const bodyIndent = Math.min(...pdf.split("\n").filter((l) => /^\s*BECAA \(Bengal/.test(l)).map((l) => l.search(/\S/)));
  const bulletLines = pdf.split("\n").filter((l) => /^\s*Extending\b/.test(l) && l.search(/\S/) > bodyIndent);
  assert.equal(bulletLines.length, 4, "MSG-001 PDF: four indented list-item lines");
  const lines = pdf.split("\n").map((l) => l.trim()).filter(Boolean);
  const sig = lines.indexOf("Manik Barman");
  assert.ok(sig !== -1, "MSG-001 PDF: signature name on its own line");
  assert.deepEqual(lines.slice(sig, sig + 3).map((l) => l.normalize("NFC")), SIGNATURE, "MSG-001 PDF: signature on three lines with CE ’87");
  assert.ok(!/\bCE\s+87\b/.test(pdf), "MSG-001 PDF: no apostrophe-less signature");
  assert.ok(!/\bCE\s+87\b/.test(webText), "MSG-001 web: no apostrophe-less signature");
}

// --- MSG-001: nothing of the superseded Bengali message remains ------------------------------
{
  const archived = path.join(projectRoot, "04_MAGAZINE_WORKING", "SUPERSEDED_SOURCES", "2026-09-26", "President Desk.docx");
  const { value } = await mammoth.extractRawText({ path: archived });
  // Every paragraph long enough to be distinctive (the old signature line is shared in part).
  const oldParagraphs = value.split(/\n+/).map((p) => p.trim()).filter((p) => p.length >= 20 && !p.startsWith("Manik Barman"));
  assert.ok(oldParagraphs.length >= 8, `old message paragraphs read from the archive (${oldParagraphs.length})`);
  const surfaces = {
    website: squash(text(indexHtml)),
    print: squash(text(printHtml)),
    pdf: squash(pages.join("")),
  };
  for (const p of oldParagraphs) {
    for (const [name, surface] of Object.entries(surfaces)) {
      assert.ok(!surface.includes(squash(p)), `old MSG-001 paragraph absent from the ${name}: "${p.slice(0, 40)}…"`);
    }
  }
  // Short distinctive phrases of the old message, including the v4-corrected sentence.
  for (const phrase of ["সভাপতির কলম থেকে", "প্রিয় বেকান ও বেকানী বন্ধুরা", "BECAA-র পরিচয়", "Deonar Bongiya Parishad"]) {
    for (const [name, surface] of Object.entries(surfaces)) assert.ok(!surface.includes(squash(phrase)), `"${phrase}" absent from the ${name}`);
  }
}

// --- ART-011: byline corrected; every other byline as in V4_REVIEW_02 ------------------------
{
  const expected = V5_CORRECTIONS.find((c) => c.id === "ART-011");
  assert.equal(bylineOf(webArticle(indexHtml, "ART-011")), expected.replace, "ART-011 web byline");
  assert.equal(bylineOf(printSection("ART-011")), expected.replace, "ART-011 print byline");
  const pdf = pdfItemText("ART-011");
  assert.ok(squash(pdf).includes(squash(expected.replace)), "ART-011 PDF byline");
  for (const surface of [indexHtml, printHtml, pages.join("")]) assert.ok(!squash(decode(surface)).includes(squash(expected.find)), "old ART-011 byline absent");

  const releaseHtml = fs.readFileSync(path.join(projectRoot, "06_FINAL_OUTPUT", "V4_REVIEW_02", "website", "index.html"), "utf8");
  let compared = 0;
  for (const item of manifest.items) {
    if (!item.web_include || item.id === "ART-011") continue;
    if (!releaseHtml.includes(`id="${item.id}"`)) continue;
    assert.equal(bylineOf(webArticle(indexHtml, item.id)), bylineOf(webArticle(releaseHtml, item.id)), `${item.id}: byline unchanged since V4_REVIEW_02`);
    compared++;
  }
  assert.ok(compared >= 45, `bylines compared with V4_REVIEW_02 (${compared})`);
}

console.log("v5-updates: MSG-001 new message on web/print/PDF, old message absent; ART-011 byline corrected; other bylines unchanged");
