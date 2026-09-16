import fs from "node:fs";
import path from "node:path";
import { projectRoot as defaultProjectRoot, siteRoot, sha256, walkFiles } from "./lib.mjs";
import { planConsolidation } from "./incoming-consolidation-core.mjs";

// Sprint v4 Task 3/4 (sprints/v4/PRD.md §4.5, Decision H): merges
// 02_INCOMING_CONTENT/v2-incoming/ into 02_INCOMING_CONTENT/.
//   --plan  reads both folders, writes an inventory + move-plan report, moves
//           nothing, exits non-zero on any collision.
//   --apply performs the five git mv operations the plan proposes, removes
//           the emptied v2-incoming directory, and writes an updated report.
// Every folder path is overridable (function options or env vars) so tests
// can point the whole run at a temp fixture instead of the real project.

const REPORT_BASENAME = "INCOMING_CONSOLIDATION_2026-09-15";
const LIVE_REFERENCE_NEEDLE = "v2-incoming";
const TEXT_EXTENSIONS = new Set([".mjs", ".js", ".ts", ".tsx", ".njk", ".css", ".scss", ".yaml", ".yml", ".md", ".json", ".html", ".txt"]);

function envList(name) {
  const raw = process.env[name];
  if (!raw) return undefined;
  return raw.split(path.delimiter).filter(Boolean);
}

// Resolves every folder this script touches. Precedence: explicit option >
// environment variable > the real project layout.
export function resolveDirs(options = {}) {
  const root = options.projectRoot ?? process.env.CONSOLIDATE_INCOMING_PROJECT_ROOT ?? defaultProjectRoot;
  const parentDir = options.parentDir ?? process.env.CONSOLIDATE_INCOMING_PARENT_DIR ?? path.join(root, "02_INCOMING_CONTENT");
  const subDir = options.subDir ?? process.env.CONSOLIDATE_INCOMING_SUB_DIR ?? path.join(parentDir, "v2-incoming");
  const reportDir = options.reportDir ?? process.env.CONSOLIDATE_INCOMING_REPORT_DIR ?? path.join(root, "04_MAGAZINE_WORKING");
  const liveRefRoots =
    options.liveRefRoots ??
    envList("CONSOLIDATE_INCOMING_LIVE_REF_ROOTS") ??
    [path.join(siteRoot, "scripts"), path.join(siteRoot, "src"), path.join(siteRoot, "tests")];
  return { projectRoot: root, parentDir, subDir, reportDir, liveRefRoots };
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function relTo(root, absPath) {
  return toPosix(path.relative(root, absPath));
}

// Every file directly inside `dir` (recursively), excluding anything under
// `excludeDirs` (so a listing of 02_INCOMING_CONTENT does not double-count
// the files inside its v2-incoming subfolder). Names are reported relative
// to `dir` itself.
export function readFolderInventory(dir, { excludeDirs = [] } = {}) {
  const excluded = excludeDirs.map((d) => path.resolve(d));
  const files = walkFiles(dir).filter((f) => !excluded.some((ex) => f === ex || f.startsWith(ex + path.sep)));
  return files
    .map((f) => ({ name: relTo(dir, f), bytes: fs.statSync(f).size, sha256: sha256(f) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Scans `roots` (a list of directories) for the literal substring `needle`
// in every text file, returning `{ file, lines }` entries with `file` given
// relative to `projectRoot`, sorted for a stable report.
export function findLiveReferences(roots, { projectRoot = defaultProjectRoot, needle = LIVE_REFERENCE_NEEDLE } = {}) {
  const matches = [];
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
      let text;
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (!text.includes(needle)) continue;
      const lines = [];
      text.split("\n").forEach((line, i) => {
        if (line.includes(needle)) lines.push(i + 1);
      });
      matches.push({ file: relTo(projectRoot, file), lines });
    }
  }
  return matches.sort((a, b) => a.file.localeCompare(b.file));
}

// Builds the full plan report: inventory of both folders, the Task 2 planning
// result (collisions/nearNames/moves), and the live-reference scan. No I/O
// beyond reading; nothing is written or moved.
export function buildPlanReport(options = {}) {
  const dirs = resolveDirs(options);
  const parentFiles = readFolderInventory(dirs.parentDir, { excludeDirs: [dirs.subDir] });
  const subFiles = readFolderInventory(dirs.subDir);
  const plan = planConsolidation({ parentFiles, subFiles });
  const liveReferences = findLiveReferences(dirs.liveRefRoots, { projectRoot: dirs.projectRoot });

  return {
    generated_at: new Date().toISOString(),
    parent_dir: relTo(dirs.projectRoot, dirs.parentDir),
    sub_dir: relTo(dirs.projectRoot, dirs.subDir),
    counts: { parent: parentFiles.length, sub: subFiles.length, total: parentFiles.length + subFiles.length },
    inventory: { parent: parentFiles, sub: subFiles },
    collisions: plan.collisions,
    near_names: plan.nearNames,
    moves: plan.moves,
    ok: plan.ok,
    live_references: liveReferences,
  };
}

function inventoryTable(files) {
  if (files.length === 0) return "_None._";
  return ["| File | Bytes | SHA-256 |", "|---|---:|---|", ...files.map((f) => `| ${f.name} | ${f.bytes} | \`${f.sha256}\` |`)].join("\n");
}

function nearNameTable(nearNames) {
  if (nearNames.length === 0) return "_None._";
  return [
    "| Sub file | Parent file | Similarity | Sub SHA-256 | Parent SHA-256 |",
    "|---|---|---:|---|---|",
    ...nearNames.map((n) => `| ${n.sub.name} | ${n.parent.name} | ${n.similarity.toFixed(3)} | \`${n.sub.sha256}\` | \`${n.parent.sha256}\` |`),
  ].join("\n");
}

function movesTable(moves) {
  if (moves.length === 0) return "_None._";
  return ["| From | To |", "|---|---|", ...moves.map((m) => `| \`${m.from}\` | \`${m.to}\` |`)].join("\n");
}

function collisionsTable(collisions) {
  if (collisions.length === 0) return "_None._";
  return [
    "| Name (case-insensitive) | Conflicting entries |",
    "|---|---|",
    ...collisions.map((c) => `| ${c.name} | ${c.entries.map((e) => `${e.source}:${e.name} (\`${e.sha256}\`)`).join("; ")} |`),
  ].join("\n");
}

function liveReferencesTable(liveReferences) {
  if (liveReferences.length === 0) return "_None._";
  return [
    "| File | Line(s) |",
    "|---|---|",
    ...liveReferences.map((m) => `| ${m.file} | ${m.lines.join(", ")} |`),
  ].join("\n");
}

export function renderMarkdown(report) {
  return `# Incoming content consolidation — plan report

Generated: ${report.generated_at}

Merges \`${report.sub_dir}/\` into \`${report.parent_dir}/\` (Sprint v4 Task 3/4, sprints/v4/PRD.md §4.5, Decision H).

## Inventory

- \`${report.parent_dir}\`: ${report.counts.parent} file(s)
- \`${report.sub_dir}\`: ${report.counts.sub} file(s)
- Total: ${report.counts.total} file(s)

### \`${report.parent_dir}\`

${inventoryTable(report.inventory.parent)}

### \`${report.sub_dir}\`

${inventoryTable(report.inventory.sub)}

## Collisions

Case-insensitive name collisions, either within \`${report.sub_dir}\` or between it and \`${report.parent_dir}\`: **${report.collisions.length === 0 ? "none" : report.collisions.length}**.

${collisionsTable(report.collisions)}

## Near-name pairs (for human review; not collisions)

${nearNameTable(report.near_names)}

## Planned \`git mv\` operations

${report.moves.length} planned move(s):

${movesTable(report.moves)}

## Live references to \`v2-incoming\`

Files under \`scripts/\`, \`src/\`, \`tests/\` that still contain the literal string \`v2-incoming\`:

${liveReferencesTable(report.live_references)}

## Result

\`ok\`: **${report.ok}** — ${report.ok ? "no collisions; safe to \`--apply\`." : "collisions present; \`--apply\` must not run until resolved."}
`;
}

export function writeReports(report, { reportDir, basename = REPORT_BASENAME } = {}) {
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, `${basename}.json`);
  const mdPath = path.join(reportDir, `${basename}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, renderMarkdown(report), "utf8");
  return { jsonPath, mdPath };
}

// Runs --plan: builds the report, writes both files, prints a summary, and
// returns { ok, report, jsonPath, mdPath }. Moves nothing.
export function runPlan(options = {}) {
  const dirs = resolveDirs(options);
  const report = buildPlanReport(options);
  const { jsonPath, mdPath } = writeReports(report, { reportDir: dirs.reportDir, basename: options.basename });

  console.log(`Inventory: ${report.counts.parent} + ${report.counts.sub} = ${report.counts.total} file(s).`);
  console.log(`Collisions: ${report.collisions.length}.`);
  console.log(`Near-name pairs: ${report.near_names.length}.`);
  console.log(`Planned moves: ${report.moves.length}.`);
  console.log(`Live references to "v2-incoming": ${report.live_references.length} file(s).`);
  console.log(`Report written: ${jsonPath}`);
  console.log(`Report written: ${mdPath}`);
  if (!report.ok) {
    console.error("Consolidation plan is NOT safe to apply: collision(s) detected (see report).");
  }

  return { ok: report.ok, report, jsonPath, mdPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.includes("--plan")) {
    const { ok } = runPlan();
    process.exit(ok ? 0 : 1);
  } else {
    console.error('Usage: node scripts/consolidate-incoming.mjs --plan');
    process.exit(1);
  }
}
