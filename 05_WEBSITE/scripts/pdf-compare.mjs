// Sprint v4 Task 31 (Decision L): compare the current complete-review PDF with a baseline release
// page by page and fail when any difference is unexplained. Release step after `pdf`.
//
// Profiles (Sprint v5 Task 16):
//   v4 (default; `npm run qa:pdf-compare`)    — baseline V3_REVIEW_02, the Sprint v4 poem, new items
//                                               and committee corrections. Kept for the closed V4 releases.
//   v5 (`npm run qa:pdf-compare:v5`)          — baseline V4_REVIEW_02; MSG-001 is a replaced item whose
//                                               PDF text must equal its section of the built print HTML
//                                               (itself checked against the approved content file), and
//                                               the v5 owner corrections (ART-011 byline) must be applied.
//
// Usage: node scripts/pdf-compare.mjs [--profile v4|v5] [--baseline <pdf>] [--current <pdf>] [--no-corrections]
// Env equivalents: PDF_COMPARE_PROFILE, PDF_COMPARE_BASELINE, PDF_COMPARE_CURRENT, PDF_COMPARE_NO_CORRECTIONS=1.
// `--no-corrections` compares without the profile's corrections (a tree where they are not applied).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readManifest, siteRoot, projectRoot, ensureDir, sha256, relFromProject } from "./lib.mjs";
import { comparePdfPages, splitPdfText } from "./pdf-compare-core.mjs";
import { V4_CORRECTIONS } from "./v4-corrections.mjs";
import { V5_CORRECTIONS } from "./v5-corrections.mjs";

const releasePdf = (version) => path.join(projectRoot, "06_FINAL_OUTPUT", version, "website", "print", "BECAA-2026-complete-review.pdf");
const PROFILES = {
  // All V4 corrections, including the superseded MSG-001 one (Sprint v5 Decision H): this
  // comparison is against the historical V3_REVIEW_02 baseline, and the V4 PDFs contain it.
  v4: { baselineVersion: "V3_REVIEW_02", poemIds: ["ART-010"], newItemIds: ["ADV-027", "ADV-028", "ADV-029"], corrections: V4_CORRECTIONS, replacedIds: [] },
  // MSG-001 is replaced as a whole, so its v5 signature correction (relative to the extraction,
  // not to the baseline) is covered by the replacement check instead of a find/replace pair.
  v5: { baselineVersion: "V4_REVIEW_02", poemIds: [], newItemIds: [], corrections: V5_CORRECTIONS.filter((c) => c.id !== "MSG-001"), replacedIds: ["MSG-001"] },
};

function parseArgs(argv) {
  const profileIndex = argv.indexOf("--profile");
  const profileName = profileIndex > -1 ? argv[profileIndex + 1] : process.env.PDF_COMPARE_PROFILE || "v4";
  if (!PROFILES[profileName]) throw new Error(`Unknown profile: ${profileName} (use v4 or v5)`);
  const opts = {
    profileName,
    profile: PROFILES[profileName],
    baseline: process.env.PDF_COMPARE_BASELINE || releasePdf(PROFILES[profileName].baselineVersion),
    current: process.env.PDF_COMPARE_CURRENT || path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf"),
    noCorrections: process.env.PDF_COMPARE_NO_CORRECTIONS === "1",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--baseline" || arg === "--current") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a PDF path.`);
      opts[arg.slice(2)] = value;
      i += 1;
    } else if (arg === "--no-corrections") opts.noCorrections = true;
    else if (arg === "--profile") i += 1;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  opts.baseline = path.resolve(opts.baseline);
  opts.current = path.resolve(opts.current);
  return opts;
}

function pdfPages(file) {
  if (!fs.existsSync(file)) throw new Error(`PDF not found: ${file}`);
  const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 50_000_000 });
  return splitPdfText(text);
}

const cell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");

// Replaced items: the expected text is the item's <section> in the built print HTML, which the
// PDF is printed from. It is anchored to the approved content file: every block of the content
// Markdown must appear in it, in order, so a stale or wrong build cannot define its own "truth".
const decodeEntities = (s) => s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const flat = (s) => s.normalize("NFC").replace(/\s+/g, "").toLowerCase();
function expectedTextFor(id, manifestItem) {
  const printHtml = fs.readFileSync(path.join(siteRoot, "_site", "print", "index.html"), "utf8");
  const marker = printHtml.indexOf(`id="print-${id}"`);
  if (marker === -1) throw new Error(`${id}: print section not found in _site/print/index.html (run npm run build)`);
  const section = printHtml.slice(printHtml.lastIndexOf("<section", marker), printHtml.indexOf("</section>", marker));
  const text = decodeEntities(section.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "\n"));
  const markdown = fs.readFileSync(path.join(siteRoot, "src", "content", manifestItem.content_file), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
  const blocks = markdown.split(/\n{2,}/).flatMap((b) => b.split("\n")).map((l) => l.replace(/^- /, "").replace(/'/g, "’").trim()).filter(Boolean);
  let at = 0;
  const haystack = flat(text);
  for (const block of blocks) {
    const found = haystack.indexOf(flat(block), at);
    if (found === -1) throw new Error(`${id}: content line not found (in order) in the built print HTML: "${block.slice(0, 60)}" — rebuild the site`);
    at = found + flat(block).length;
  }
  return text;
}

function markdownReport({ opts, baselinePages, currentPages, corrections, result, titles }) {
  const ids = (list) => list.map((id) => (titles.has(id) ? `${id} (${titles.get(id)})` : id)).join(", ");
  const { summary } = result;
  const lines = [
    `# PDF comparison — ${opts.profile.baselineVersion} vs current (profile ${opts.profileName})`,
    "",
    `- Baseline: \`${relFromProject(opts.baseline)}\` (${baselinePages.length} pages)`,
    `- Current: \`${relFromProject(opts.current)}\` (${currentPages.length} pages)`,
    `- Poem items: ${opts.profile.poemIds.join(", ") || "none"}; new items: ${opts.profile.newItemIds.join(", ") || "none"}; replaced items: ${opts.profile.replacedIds.join(", ") || "none"} (text must equal the built print HTML)`,
    `- Corrections: ${corrections.length ? corrections.map((c) => `${c.id} "${c.find}" → "${c.replace}"`).join("; ") : "none"}${opts.noCorrections ? " (--no-corrections)" : ""}`,
    "- Whitespace (including justification spacing and line breaks) and page-number footers are ignored; text is NFC-normalised.",
    "",
    `**Result: ${summary.ok ? "OK — every difference is explained" : "FAIL — unexplained differences"}**`,
    "",
    "| Class | Current pages |",
    "| --- | ---: |",
    ...Object.entries(summary.counts).map(([cls, n]) => `| ${cls} | ${n} |`),
    `| removed baseline pages (unexplained) | ${summary.removedUnexplained} |`,
    "",
    "## Current pages",
    "",
    "| Current page | Class | Item id(s) | Baseline page | Note |",
    "| ---: | --- | --- | ---: | --- |",
    ...result.pages.map((p) => `| ${p.page} | ${p.class} | ${cell(ids(p.itemIds))} | ${p.baselinePage ?? "—"} | ${cell(p.note)} |`),
    "",
    "## Baseline pages without a current counterpart",
    "",
  ];
  if (!result.removedBaselinePages.length) lines.push("None.");
  else {
    lines.push("| Baseline page | Class | Item id(s) | Note |", "| ---: | --- | --- | --- |");
    for (const r of result.removedBaselinePages) lines.push(`| ${r.baselinePage} | ${r.class} | ${cell(ids(r.itemIds))} | ${cell(r.note)} |`);
  }
  return `${lines.join("\n")}\n`;
}

const opts = parseArgs(process.argv.slice(2));
const { poemIds, newItemIds, replacedIds } = opts.profile;
const REPORT_NAME = `${opts.profile.baselineVersion}-vs-current`;
const corrections = opts.noCorrections ? [] : opts.profile.corrections;
const manifestItems = new Map(readManifest().items.map((item) => [item.id, item]));
const manifestIds = new Map([...manifestItems].map(([id, item]) => [id, item.title]));
const unknown = [...poemIds, ...newItemIds, ...replacedIds, ...opts.profile.corrections.map((c) => c.id)].filter((id) => !manifestIds.has(id));
if (unknown.length) throw new Error(`Item ids not in the manifest: ${[...new Set(unknown)].join(", ")}`);
const replacedItems = replacedIds.map((id) => ({ id, expectedText: expectedTextFor(id, manifestItems.get(id)) }));

const baselinePages = pdfPages(opts.baseline);
const currentPages = pdfPages(opts.current);
const result = comparePdfPages(baselinePages, currentPages, { poemIds, newItemIds, corrections, replacedItems });

const outDir = path.join(siteRoot, "qa-output", "pdf-compare");
ensureDir(outDir);
const json = {
  generated: new Date().toISOString(),
  baseline: { path: relFromProject(opts.baseline), sha256: sha256(opts.baseline), pages: baselinePages.length },
  current: { path: relFromProject(opts.current), sha256: sha256(opts.current), pages: currentPages.length },
  options: { profile: opts.profileName, poemIds, newItemIds, replacedIds, corrections, correctionsApplied: !opts.noCorrections },
  ...result,
};
fs.writeFileSync(path.join(outDir, `${REPORT_NAME}.json`), `${JSON.stringify(json, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, `${REPORT_NAME}.md`), markdownReport({ opts, baselinePages, currentPages, corrections, result, titles: manifestIds }));

const { summary } = result;
const counts = Object.entries(summary.counts).filter(([, n]) => n).map(([cls, n]) => `${cls} ${n}`).join(", ");
console.log(`PDF compare: baseline ${summary.baselinePageCount} pages, current ${summary.currentPageCount} pages${opts.noCorrections ? " (corrections not expected)" : ""}.`);
console.log(`  ${counts}; removed baseline pages unexplained ${summary.removedUnexplained}.`);
console.log(`  Report: ${relFromProject(path.join(outDir, `${REPORT_NAME}.md`))}`);
if (!summary.ok) {
  for (const p of result.pages.filter((row) => row.class === "unexplained")) console.error(`  UNEXPLAINED current page ${p.page} [${p.itemIds.join(", ")}]: ${p.note}`);
  for (const r of result.removedBaselinePages.filter((row) => row.class === "unexplained")) console.error(`  UNEXPLAINED baseline page ${r.baselinePage} [${r.itemIds.join(", ")}]: ${r.note}`);
  process.exitCode = 1;
}
