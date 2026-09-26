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
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { countOccurrences } from "../../scripts/text-correction-core.mjs";
import { findControlCharacters } from "../../scripts/content-encoding-core.mjs";
import { activeCorrections, ADV_028_SENTENCE, ADV_028_SUPERSEDED, isSuperseded, MSG001_SUPERSEDED, V4_CORRECTIONS, V4_FILE_CORRECTIONS } from "../../scripts/v4-corrections.mjs";
import { applyV4FileCorrections } from "../../scripts/apply-v4-committee-corrections.mjs";

const read = (rel) => fs.readFileSync(path.join(siteRoot, rel), "utf8");
const squash = (s) => s.normalize("NFC").replace(/\s+/g, "");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");

// Content as it was before the committee corrections (Task 21's commit): every corrected
// file must equal its baseline with exactly the recorded substitutions applied.
// Sprint v5 (Decision H): the superseded MSG-001 correction is left out — its file now holds
// the new President's message — and the manifest items Sprint v5 changes on purpose (MSG-001
// replaced, ART-011 branch; both checked by v5-updates.test.mjs) are masked on both sides.
const BASELINE_COMMIT = "ae098d5";
const V5_CHANGED_MANIFEST_ITEMS = ["MSG-001", "ART-011"];
const baseline = (rel) => execFileSync("git", ["show", `${BASELINE_COMMIT}:05_WEBSITE/${rel}`], { cwd: siteRoot, encoding: "utf8", maxBuffer: 30_000_000 });
function maskManifestItems(text, ids) {
  let out = text;
  for (const id of ids) {
    const start = out.indexOf(`\n  - id: ${id}\n`);
    assert.ok(start !== -1, `manifest item ${id} found for masking`);
    const rest = out.slice(start + 1).search(/\n(?: {2}- id: |\S)/);
    assert.ok(rest !== -1, `manifest item ${id}: end of block found`);
    out = `${out.slice(0, start)}\n  - id: ${id} (masked: changed in Sprint v5)${out.slice(start + 1 + rest)}`;
  }
  return out;
}
const V4_ACTIVE_FILE_CORRECTIONS = activeCorrections(V4_FILE_CORRECTIONS);
function assertOnlyRecordedSubstitutions(id) {
  const files = [...new Set(V4_ACTIVE_FILE_CORRECTIONS.filter((c) => c.id === id).map((c) => c.file))];
  assert.ok(files.length > 0, `${id}: has file corrections`);
  for (const file of files) {
    let expected = baseline(file);
    for (const c of V4_ACTIVE_FILE_CORRECTIONS.filter((x) => x.file === file)) expected = expected.split(c.find).join(c.replace);
    const mask = file === "src/_data/publication.yaml" ? (t) => maskManifestItems(t, V5_CHANGED_MANIFEST_ITEMS) : (t) => t;
    assert.equal(mask(read(file)), mask(expected), `${file}: identical to ${BASELINE_COMMIT} apart from the recorded corrections`);
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

// --- MSG-001: Task 23's correction retired (Sprint v5 Task 8, Decision H) -------------
// MSG-001 now holds the President's new message (checked by v5-updates.test.mjs). The v4
// correction stays in the data as history, marked superseded, and the apply script skips it
// without reading the file; the content file is left exactly as it is.
{
  const entries = V4_FILE_CORRECTIONS.filter((c) => c.id === "MSG-001");
  assert.equal(entries.length, 1, "MSG-001: v4 file correction kept as history");
  assert.deepEqual(entries[0].superseded, MSG001_SUPERSEDED, "MSG-001: marked superseded with date and reason");
  assert.deepEqual(V4_FILE_CORRECTIONS.filter(isSuperseded).map((c) => c.id), ["MSG-001"], "only MSG-001 is superseded");
  const file = "src/content/messages/MSG-001-president-desk.md";
  const before = read(file);
  const results = applyV4FileCorrections({ only: ["MSG-001"] });
  assert.deepEqual(results.map((r) => r.action), ["skipped (superseded)"], "apply script skips the superseded MSG-001 correction");
  assert.match(results[0].reason, /^2026-09-26: .*Decision H/, "skip states the date and reason");
  assert.equal(read(file), before, "MSG-001 content untouched by the apply script");
  // A full run skips MSG-001 and verifies every other correction as already applied.
  const all = applyV4FileCorrections();
  assert.ok(all.every((r) => (r.id === "MSG-001" ? r.action === "skipped (superseded)" : r.action === "already applied")), "full re-run: MSG-001 skipped, all others already applied");
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

// --- ART-003: two Bengali spellings (Task 25, Decision Q) --------------------------
{
  const spellings = V4_CORRECTIONS.filter((c) => c.id === "ART-003");
  assert.equal(spellings.length, 2, "ART-003 has two recorded spelling corrections");
  const content = read("src/content/articles/ART-003-item.md");
  const web = webArticle("ART-003");
  const pdf = squash(pdfItemText("ART-003"));
  for (const { find, replace } of spellings) {
    assert.equal(countOccurrences(content, replace), 1, `ART-003 content: "${replace}" present once`);
    assert.equal(countOccurrences(content, find), 0, `ART-003 content: "${find}" absent`);
    assert.equal(countOccurrences(web, replace), 1, `ART-003 website: "${replace}" present once`);
    assert.ok(!web.includes(find), `ART-003 website: "${find}" absent`);
    assert.ok(pdf.includes(squash(replace)), `ART-003 PDF: "${replace}" present`);
    assert.ok(!pdf.includes(squash(find)), `ART-003 PDF: "${find}" absent`);
    assert.ok(!squash(indexHtml).includes(squash(find)) && !pages.some((p) => squash(p).includes(squash(find))), `"${find}" absent from the whole website and PDF`);
  }
  // Every other character, punctuation mark and paragraph break preserved.
  assertOnlyRecordedSubstitutions("ART-003");
}

// --- ART-004 / ART-005: Late Biswajit Sengupta (Task 26, Decision R) ---------------
{
  const LATE = "Late Biswajit Sengupta";
  const expectedBylines = {};
  for (const id of ["ART-004", "ART-005"]) {
    const it = item(id);
    assert.equal(it.display_name, LATE, `${id}: manifest display_name`);
    assert.equal(it.contributor, "Biswajit Sengupta", `${id}: contributor (provenance) unchanged`);
    expectedBylines[id] = [LATE, it.branch, it.passing_year ? `${it.passing_year} Batch` : ""].filter(Boolean).join(", ") + (it.designation ? ` — ${it.designation}` : "");
    assert.ok(webArticle(id).includes(`<p class="byline">${expectedBylines[id]}</p>`), `${id}: website byline "${expectedBylines[id]}"`);
    assert.ok(printSection(id).includes(`<p class="byline">${expectedBylines[id]}</p>`), `${id}: print byline`);
    const pdfLines = pdfItemText(id).split("\n").map((l) => l.trim());
    assert.ok(pdfLines.includes(expectedBylines[id]), `${id}: PDF byline line "${expectedBylines[id]}"`);
  }
  assert.equal(manifest.items.filter((i) => i.display_name).map((i) => i.id).join(","), "ART-004,ART-005", "only ART-004 and ART-005 carry a display_name");
  assertOnlyRecordedSubstitutions("ART-004/ART-005");

  // No other contributor gets a "Late" prefix, on the website or in print/PDF.
  const lateBylines = (html) => [...html.matchAll(/<p class="byline">([^<]*)<\/p>/g)].map((m) => decode(m[1])).filter((b) => /\bLate\b/.test(b));
  assert.equal(lateBylines(indexHtml).length, 2, "website: exactly two bylines carry Late");
  assert.equal(lateBylines(printHtml).length, 2, "print: exactly two bylines carry Late");
  const memorialLines = new Set(item("ADV-029").text_lines); // "Late Shri Bhakta Mohon Mitra" is approved memorial wording, not a byline
  const pdfLateLines = pages.flatMap((p) => p.split("\n")).map((l) => l.trim()).filter((l) => /^Late /.test(l) && !memorialLines.has(l));
  assert.deepEqual(pdfLateLines, [expectedBylines["ART-004"], expectedBylines["ART-005"]], "PDF: the only Late-prefixed lines outside the memorial page are the two bylines");
  // The addendum's reason (date of death) is never published.
  for (const [where, text] of [["website", indexHtml], ["print", printHtml], ["PDF", pages.join("\f")]]) {
    assert.ok(!/9(?:th)?\s+September|September\s+9|passed away/i.test(text), `${where}: no date or circumstances of death`);
  }
}

// --- ART-004 / ART-005: Bengali author line in the body (Task 41, 2026-09-17) --------
{
  const OLD_LINE = "বিশ্বজিৎ সেনগুপ্ত";
  const NEW_LINE = "প্র\u09AF\u09BCাত বিশ্বজিৎ সেনগুপ্ত"; // প্রয়াত in NFC form
  for (const id of ["ART-004", "ART-005"]) {
    const it = item(id);
    const content = read(`src/content/${it.content_file}`);
    const lines = content.split("\n");
    assert.equal(lines.filter((l) => l === NEW_LINE).length, 1, `${id} content: author line is "${NEW_LINE}" exactly once`);
    assert.equal(lines.filter((l) => l === OLD_LINE).length, 0, `${id} content: unprefixed author line absent`);
    assert.equal(content.split(OLD_LINE).length - 1, 1, `${id} content: the name occurs only inside the new author line`);
    assertOnlyRecordedSubstitutions(id);
    const web = webArticle(id);
    assert.ok(web.includes(`<p>${NEW_LINE}</p>`), `${id} website: author line paragraph`);
    assert.ok(!web.includes(`<p>${OLD_LINE}</p>`), `${id} website: unprefixed author line absent`);
    assert.ok(printSection(id).includes(`<p>${NEW_LINE}</p>`), `${id} print: author line paragraph`);
    const pdf = squash(pdfItemText(id));
    assert.ok(pdf.includes(squash(NEW_LINE)), `${id} PDF: author line present`);
    assert.equal(pdf.split(squash(OLD_LINE)).length - 1, 1, `${id} PDF: the Bengali name appears once, prefixed`);
  }
}

// --- ART-009: stray form feed removed, wording unchanged (Task 42, 2026-09-17) ---------
{
  const FF = String.fromCharCode(12);
  const file = `src/content/${item("ART-009").content_file}`;
  const content = read(file);
  assert.ok(!content.includes(FF), "ART-009 content: no U+000C");
  assert.deepEqual(findControlCharacters(content), [], "ART-009 content: no control characters at all");
  assert.ok(content.includes("in a\nmeeting he scheduled specifically to demand it"), "ART-009 content: wording around the removed character unchanged");
  assert.equal(content, baseline(file).split(FF).join(""), "ART-009 content: identical to ae098d5 apart from the removed character");
  assertOnlyRecordedSubstitutions("ART-009");
  const web = webArticle("ART-009");
  assert.ok(!web.includes(FF) && /in a\s+meeting he scheduled/.test(web), "ART-009 website: \"in a meeting he scheduled\", no U+000C");
  assert.ok(squash(pdfItemText("ART-009")).includes("inameetinghescheduledspecificallytodemandit"), "ART-009 PDF: wording intact");
  assert.ok(!indexHtml.includes(FF) && !printHtml.includes(FF), "no U+000C anywhere in the built website or print HTML");
}

// --- ADV-028: approved wording of 2026-09-17 (Task 39) ------------------------------
{
  const adv = item("ADV-028");
  assert.equal(adv.title, ADV_028_SENTENCE, "ADV-028 manifest title is the approved sentence");
  assert.deepEqual(adv.text_lines, [ADV_028_SENTENCE], "ADV-028 text line is the approved sentence");
  assert.equal(adv.contributor, "M/s Balajee Infrate", "ADV-028 company unchanged");
  assertOnlyRecordedSubstitutions("ADV-028");
  assert.ok(!indexHtml.includes(ADV_028_SUPERSEDED) && !printHtml.includes(ADV_028_SUPERSEDED), "superseded ADV-028 wording absent from the website and print HTML");
  assert.ok(!pages.some((p) => squash(p).includes(squash(ADV_028_SUPERSEDED))), "superseded ADV-028 wording absent from the PDF");
  assert.ok(squash(pdfItemText("ADV-028")).includes(squash(ADV_028_SENTENCE)), "approved ADV-028 wording on its PDF page");
}

// --- Print-only justification of article prose (Task 27, Decision S) ---------------
{
  const printedItems = manifest.items.filter((i) => i.print_include);
  assert.ok(printHtml.includes('class="print-page print-page--article'), "print.njk adds the print-page--{type} modifier");
  for (const it of printedItems) {
    const open = printSection(it.id).slice(0, 80);
    assert.ok(open.startsWith(`<section class="print-page print-page--${it.type} `) || open.startsWith(`<section class="print-page print-page--${it.type}"`), `${it.id}: section carries print-page--${it.type}`);
  }
  assert.ok(!/text-align\s*:\s*justify/.test(read("src/assets/css/site.css")), "website stylesheet has no text justification");
  // The only website stylesheet change since the corrections began is Task 43's scroll offset.
  const siteCss = read("src/assets/css/site.css");
  const task43 = siteCss.indexOf("\n/* Sprint v4 Task 43");
  assert.ok(task43 > 0, "site.css carries the Task 43 scroll-padding block");
  // …and the 2026-09-17 front-page hero, which replaced the old cover badges (.cover__meta)
  // with the tagline and link rules (.cover__tagline, .cover__links) in place.
  const heroStart = siteCss.indexOf(".cover__tagline {");
  const heroEnd = siteCss.indexOf("\n\n.contents,", heroStart);
  const baselineCss = baseline("src/assets/css/site.css");
  const metaStart = baselineCss.indexOf(".cover__meta {");
  const metaEnd = baselineCss.indexOf("\n\n.contents,", metaStart);
  assert.ok(heroStart > 0 && heroEnd > heroStart && metaStart > 0 && metaEnd > metaStart, "hero and old badge blocks located");
  assert.ok(!/text-align/.test(siteCss.slice(heroStart, heroEnd)), "the hero block does not touch text alignment");
  assert.equal(siteCss.slice(0, heroStart) + baselineCss.slice(metaStart, metaEnd) + siteCss.slice(heroEnd, task43), baselineCss, "website stylesheet otherwise unchanged since the corrections began");
  assert.ok(!/text-align/.test(siteCss.slice(task43)), "the Task 43 block does not touch text alignment");

  const browser = await chromium.launch();
  try {
    // Print media on the print HTML (the PDF is rendered from this page with print media).
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.goto(`file://${path.join(siteRoot, "_site", "print", "index.html")}`, { waitUntil: "load" });
    const rows = await page.evaluate(() => {
      const align = (el) => getComputedStyle(el).textAlign;
      const out = [];
      for (const section of document.querySelectorAll("section.print-page[data-testid]")) {
        const id = section.dataset.testid.replace("print-page-", "");
        const add = (kind, el) => out.push({ id, kind, align: align(el), text: el.textContent.trim().slice(0, 40) });
        section.querySelectorAll(".prose p").forEach((p) => add(p.querySelector("br") ? "verse" : p.closest("blockquote, li") ? "quote-or-list" : "prose", p));
        section.querySelectorAll("h1, h2, h3, h4, .section-kicker, .byline, li, figcaption, .ad-text, .ad-memorial p").forEach((el) => add("other", el));
      }
      document.querySelectorAll(".print-contents li, .print-contents h1, .print-contact p, .print-thanks p").forEach((el) => out.push({ id: "(non-item)", kind: "other", align: align(el), text: el.textContent.trim().slice(0, 40) }));
      return out;
    });
    const typeOf = Object.fromEntries(printedItems.map((i) => [i.id, i.type]));
    const articleProse = rows.filter((r) => typeOf[r.id] === "article" && r.kind === "prose");
    assert.ok(articleProse.length > 50, `found article prose paragraphs to check (${articleProse.length})`);
    for (const r of articleProse) assert.equal(r.align, "justify", `${r.id}: article prose paragraph justified in print ("${r.text}")`);
    const verse = rows.filter((r) => r.kind === "verse");
    assert.ok(verse.some((r) => r.id === "ART-010"), "ART-010 verse paragraphs found");
    for (const r of verse) assert.equal(r.align, "left", `${r.id}: verse stays left-aligned ("${r.text}")`);
    for (const r of rows.filter((x) => x.kind === "quote-or-list" || x.kind === "other" || (x.kind === "prose" && typeOf[x.id] !== "article"))) {
      assert.notEqual(r.align, "justify", `${r.id} ${r.kind}: not justified ("${r.text}")`);
    }
    const types = new Set(rows.filter((r) => r.kind === "prose" && typeOf[r.id] !== "article").map((r) => typeOf[r.id]));
    assert.ok(types.has("message"), "message prose checked and not justified");

    // Screen media on the website: nothing justified.
    const web = await browser.newPage();
    await web.goto(`file://${path.join(siteRoot, "_site", "index.html")}`, { waitUntil: "load" });
    const justified = await web.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).textAlign === "justify").length);
    assert.equal(justified, 0, "website: no justified element");
  } finally {
    await browser.close();
  }
}

console.log("v4-committee-corrections: all assertions passed");
