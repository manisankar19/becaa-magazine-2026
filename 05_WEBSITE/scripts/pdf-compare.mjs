// Sprint v4 Task 31 (Decision L): compare the current complete-review PDF with the V3_REVIEW_02
// baseline page by page and fail when any difference is unexplained. Release step after `pdf`.
//
// Usage: node scripts/pdf-compare.mjs [--baseline <pdf>] [--current <pdf>] [--no-corrections]
// Env equivalents: PDF_COMPARE_BASELINE, PDF_COMPARE_CURRENT, PDF_COMPARE_NO_CORRECTIONS=1.
// `--no-corrections` compares without the committee corrections (a tree where Stream E is not applied).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readManifest, siteRoot, projectRoot, ensureDir, sha256, relFromProject } from "./lib.mjs";
import { comparePdfPages, splitPdfText } from "./pdf-compare-core.mjs";
import { V4_CORRECTIONS } from "./v4-corrections.mjs";

const POEM_IDS = ["ART-010"];
const NEW_ITEM_IDS = ["ADV-027", "ADV-028", "ADV-029"];
const REPORT_NAME = "V3_REVIEW_02-vs-current";

function parseArgs(argv) {
  const opts = {
    baseline: process.env.PDF_COMPARE_BASELINE || path.join(projectRoot, "06_FINAL_OUTPUT", "V3_REVIEW_02", "website", "print", "BECAA-2026-complete-review.pdf"),
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

function markdownReport({ opts, baselinePages, currentPages, corrections, result, titles }) {
  const ids = (list) => list.map((id) => (titles.has(id) ? `${id} (${titles.get(id)})` : id)).join(", ");
  const { summary } = result;
  const lines = [
    "# PDF comparison — V3_REVIEW_02 vs current",
    "",
    `- Baseline: \`${relFromProject(opts.baseline)}\` (${baselinePages.length} pages)`,
    `- Current: \`${relFromProject(opts.current)}\` (${currentPages.length} pages)`,
    `- Poem items: ${POEM_IDS.join(", ")}; new items: ${NEW_ITEM_IDS.join(", ")}`,
    `- Committee corrections: ${corrections.length ? corrections.map((c) => `${c.id} "${c.find}" → "${c.replace}"`).join("; ") : "none (--no-corrections)"}`,
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
const corrections = opts.noCorrections ? [] : V4_CORRECTIONS;
const manifestIds = new Map(readManifest().items.map((item) => [item.id, item.title]));
const unknown = [...POEM_IDS, ...NEW_ITEM_IDS, ...V4_CORRECTIONS.map((c) => c.id)].filter((id) => !manifestIds.has(id));
if (unknown.length) throw new Error(`Item ids not in the manifest: ${[...new Set(unknown)].join(", ")}`);

const baselinePages = pdfPages(opts.baseline);
const currentPages = pdfPages(opts.current);
const result = comparePdfPages(baselinePages, currentPages, { poemIds: POEM_IDS, newItemIds: NEW_ITEM_IDS, corrections });

const outDir = path.join(siteRoot, "qa-output", "pdf-compare");
ensureDir(outDir);
const json = {
  generated: new Date().toISOString(),
  baseline: { path: relFromProject(opts.baseline), sha256: sha256(opts.baseline), pages: baselinePages.length },
  current: { path: relFromProject(opts.current), sha256: sha256(opts.current), pages: currentPages.length },
  options: { poemIds: POEM_IDS, newItemIds: NEW_ITEM_IDS, corrections, correctionsApplied: !opts.noCorrections },
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
