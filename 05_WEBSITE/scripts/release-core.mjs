// Pure pieces of the release pipeline (Sprint v3 Task 36). No I/O, so the ordering, the
// dependency-audit gate and the generated documents can be unit tested.
import fs from "node:fs";
import path from "node:path";

const VERSION_PATTERN = /^[A-Za-z0-9_-]+$/;

// Steps run in this exact order. `build` precedes every suite that reads _site/ (site
// tests, the dev-app/threats integration tests, browser suites, secret scan); the
// dependency audit gate is last so a stale advisory never masks a functional failure.
const V3_STEPS = [
  "tracker:validate",
  "validate",
  "typecheck",
  "test:unit",
  "build",
  "test",
  "test:integration",
  "qa",
  "qa:v2-items",
  "pdf",
  "qa:pdf",
  "test:e2e:cover",
  "qa:pdf:v2-items",
  "qa:ad-backgrounds",
  "qa:art006",
  "qa:contact",
  "test:e2e:print-ads",
  "test:e2e:web-ads",
  "test:e2e:welcome",
  "test:e2e:admin",
  "e2e:app",
  "check:secrets",
  "check:sql",
  "audit",
];

// Sprint v4 (Decision L): the V3 list plus the v4 suites and evidence. `pdf` moves up to
// just after `build` because build deletes _site/ and test:integration now includes
// suites that read the PDF; every step leaving evidence in qa-output/ runs after `qa`,
// which deletes that folder.
const V4_STEPS = [
  "tracker:validate",
  "validate",
  "typecheck",
  "test:unit",
  "build",
  "pdf",
  "test",
  "test:integration",
  "qa",
  "qa:v2-items",
  "qa:pdf",
  "qa:pdf-compare",
  "test:e2e:cover",
  "test:e2e:poem",
  "qa:pdf:v2-items",
  "qa:ad-backgrounds",
  "qa:art006",
  "qa:contact",
  "qa:v4-pages",
  "test:e2e:print-ads",
  "test:e2e:web-ads",
  "test:e2e:nav",
  "test:v4-advertisements",
  "test:v4-committee-corrections",
  "test:e2e:welcome",
  "test:e2e:admin",
  "e2e:app",
  "check:secrets",
  "check:sql",
  "audit",
];

// Sprint v5 (Task 15, Decision L): the V4 order with the PDF comparison and page renders in
// their V5 forms (baseline V4_REVIEW_02; evidence for the v5 items), plus the front-page hero
// test (carried over from the v4 walkthrough) and the v5 regression suite. V4_STEPS itself is
// left alone so the closed V4 releases stay reproducible.
const V5_RENAMED = { "qa:pdf-compare": "qa:pdf-compare:v5", "qa:v4-pages": "qa:v5-pages" };
const V5_STEPS = V4_STEPS.flatMap((step) => {
  if (step === "test:e2e:nav") return [step, "test:e2e:hero"];
  if (step === "test:v4-committee-corrections") return [step, "test:v5-updates"];
  return [V5_RENAMED[step] ?? step];
});

// The sequence used for V0–V2 releases (unchanged behaviour for those versions).
const LEGACY_STEPS = ["tracker:validate", "validate", "build", "test", "qa", "qa:v2-items", "pdf", "qa:pdf", "qa:pdf:v2-items", "qa:art006", "qa:contact"];

export function stepsForVersion(version) {
  if (!VERSION_PATTERN.test(String(version ?? ""))) throw new Error("RELEASE_VERSION contains unsupported characters.");
  if (String(version).startsWith("V5")) return [...V5_STEPS];
  if (String(version).startsWith("V4")) return [...V4_STEPS];
  return String(version).startsWith("V3") ? [...V3_STEPS] : [...LEGACY_STEPS];
}

// auditJson: output of `npm audit --json`. allowlist: { allow: [{ package }] }.
// Blocks on any high/critical advisory whose package is not allow-listed.
export function auditGate(auditJson, allowlist) {
  const allowed = new Set((allowlist?.allow ?? []).map((a) => a.package));
  const blocking = [];
  const seenAllowed = new Set();
  for (const [name, v] of Object.entries(auditJson?.vulnerabilities ?? {})) {
    if (!["high", "critical"].includes(v.severity)) continue;
    if (allowed.has(name)) { seenAllowed.add(name); continue; }
    const titles = (v.via ?? []).map((x) => (typeof x === "string" ? `via ${x}` : x.title)).filter(Boolean);
    blocking.push({ package: name, severity: v.severity, titles });
  }
  return { ok: blocking.length === 0, blocking, allowed: [...seenAllowed].sort() };
}

// Commands that rebuild the v3 content state from the pre-sprint tracker/manifest, in order.
export const V3_CONTENT_MIGRATION = [
  "extract:v3-secretary-desk",
  "extract:v3-siddhartha-story",
  "manifest:apply-v3-updates",
  "retitle:advertisements",
  "tracker:apply-v3-updates",
  "sample:ad-backgrounds",
  "manifest:apply-v3-ad-overrides",
];

// Commands that rebuild the v4 content state from the V3_REVIEW_02 manifest/tracker, in order
// (the one-time incoming-folder consolidation is `node scripts/consolidate-incoming.mjs --apply`).
export const V4_CONTENT_MIGRATION = [
  "extract:v4-golap",
  "normalize:v4-memorial-image",
  "manifest:apply-v4-updates",
  "tracker:apply-v4-updates",
  "corrections:apply-v4",
  "tracker:apply-v4-corrections",
];

// Commands that rebuild the v5 content state from the V4_REVIEW_02 state, in order. The
// extraction writes the verbatim message; corrections:apply-v5 then re-applies the recorded
// owner corrections (MSG-001 signature, ART-011 branch).
export const V5_CONTENT_MIGRATION = ["extract:v5-president-desk", "corrections:apply-v5", "tracker:apply-v5"];

export function reproductionMarkdown(version, steps, { node, commit }) {
  if (String(version).startsWith("V5")) return reproductionMarkdownV5(version, steps, { node, commit });
  if (String(version).startsWith("V4")) return reproductionMarkdownV4(version, steps, { node, commit });
  const pipeline = steps.map((s) => (s === "audit" ? "npm audit --json   # gate: high/critical only if allow-listed in scripts/audit-allowlist.json" : `npm run ${s}`)).join("\n");
  return `# Reproduction — ${version}

Built with Node ${node} at git commit \`${commit}\`. All commands run from \`05_WEBSITE/\`.

## Prerequisites (once per machine)

\`\`\`sh
npm install
npx playwright install chromium          # browser for tests, visual QA and the PDF (not installed by npm install)
npm run db:local:start                    # PostgreSQL 16 cluster in .pgdata/ (needs pg_ctl/initdb on PATH); creates becaa_dev + becaa_test
cp .env.example .env.local                # then fill in DATABASE_URL(_TEST), SESSION_SECRET, IP_HASH_SALT (never commit it)
\`\`\`

## Rebuild the release from the current repository state

\`\`\`sh
RELEASE_VERSION=${version} node scripts/release.mjs     # = npm run release:v3
\`\`\`

which runs, in this order:

\`\`\`sh
${pipeline}
\`\`\`

and then copies \`_site/\`, \`qa-output/\`, the validation and audit reports and the operational documents into \`06_FINAL_OUTPUT/${version}/\` (refusing to overwrite an existing folder).

## Rebuilding the v3 content changes from the pre-sprint state

Only needed to replay the Sprint v3 content migration on a tracker/manifest as they were before the sprint; the repository already contains the results.

\`\`\`sh
${V3_CONTENT_MIGRATION.map((s) => `npm run ${s}`).join("\n")}
\`\`\`

Deployment is a separate, approved step — see \`DEPLOYMENT.md\`.
`;
}

function reproductionMarkdownV4(version, steps, { node, commit }) {
  const pipeline = steps.map((s) => (s === "audit" ? "npm audit --json   # gate: high/critical only if allow-listed in scripts/audit-allowlist.json" : `npm run ${s}`)).join("\n");
  return `# Reproduction — ${version}

Built with Node ${node} at git commit \`${commit}\`. All commands run from \`05_WEBSITE/\`.

## Prerequisites (once per machine)

\`\`\`sh
npm install
npx playwright install chromium          # browser for tests, visual QA and the PDF (not installed by npm install)
# unzip, and poppler-utils for pdftotext/pdftoppm (PDF text checks, page renders, PDF comparison)
npm run db:local:start                    # PostgreSQL 16 cluster in .pgdata/ (needs pg_ctl/initdb on PATH); creates becaa_dev + becaa_test
cp .env.example .env.local                # then fill in DATABASE_URL(_TEST), SESSION_SECRET, IP_HASH_SALT (never commit it)
\`\`\`

## Rebuild the release from the current repository state

\`\`\`sh
RELEASE_VERSION=${version} node scripts/release.mjs     # = npm run release:v4
\`\`\`

which runs, in this order:

\`\`\`sh
${pipeline}
\`\`\`

and then copies \`_site/\`, \`qa-output/\`, the validation and audit reports and the operational documents into \`06_FINAL_OUTPUT/${version}/\` (refusing to overwrite an existing folder). \`qa:pdf-compare\` compares the PDF with \`06_FINAL_OUTPUT/V3_REVIEW_02\` and fails on any unexplained page difference.

## Rebuilding the v4 content changes from the V3_REVIEW_02 state

Only needed to replay the Sprint v4 content migration; the repository already contains the results. Each command is idempotent.

\`\`\`sh
${V4_CONTENT_MIGRATION.map((s) => `npm run ${s}`).join("\n")}
\`\`\`

Deployment is a separate, approved step — see \`DEPLOYMENT.md\`.
`;
}

function reproductionMarkdownV5(version, steps, { node, commit }) {
  const pipeline = steps.map((s) => (s === "audit" ? "npm audit --json   # gate: high/critical only if allow-listed in scripts/audit-allowlist.json" : `npm run ${s}`)).join("\n");
  return `# Reproduction — ${version}

Built with Node ${node} at git commit \`${commit}\`. All commands run from \`05_WEBSITE/\`.

## Prerequisites (once per machine)

\`\`\`sh
npm install
npx playwright install chromium          # browser for tests, visual QA and the PDF (not installed by npm install)
# unzip, and poppler-utils for pdftotext/pdftoppm (PDF text checks, page renders, PDF comparison)
npm run db:local:start                    # PostgreSQL 16 cluster in .pgdata/ (needs pg_ctl/initdb on PATH); creates becaa_dev + becaa_test
cp .env.example .env.local                # then fill in DATABASE_URL(_TEST), SESSION_SECRET, IP_HASH_SALT (never commit it)
\`\`\`

## Rebuild the release from the current repository state

\`\`\`sh
RELEASE_VERSION=${version} node scripts/release.mjs     # = npm run release:v5
\`\`\`

which runs, in this order:

\`\`\`sh
${pipeline}
\`\`\`

and then copies \`_site/\`, \`qa-output/\`, the validation and audit reports and the operational documents into \`06_FINAL_OUTPUT/${version}/\` (refusing to overwrite an existing folder). \`qa:pdf-compare:v5\` compares the PDF with \`06_FINAL_OUTPUT/V4_REVIEW_02\` and fails on any unexplained page difference. Run the pipeline in the foreground: on a small host, background runs can be stopped for low memory.

## Rebuilding the v5 content changes from the V4_REVIEW_02 state

Only needed to replay the Sprint v5 content migration; the repository already contains the results. Each command is idempotent; run them in this order (the extraction writes the message verbatim and the corrections step re-applies the recorded owner corrections).

\`\`\`sh
${V5_CONTENT_MIGRATION.map((s) => `npm run ${s}`).join("\n")}
\`\`\`

Deployment is a separate, approved step — see \`DEPLOYMENT.md\`.
`;
}

export function buildReleaseManifest(manifest, version, commit, now = new Date()) {
  return {
    version,
    build_time: now.toISOString(),
    git_commit: commit || null,
    included_item_ids: manifest.items.map((item) => item.id),
    source_fingerprints: Object.fromEntries([
      ...manifest.items.map((item) => [item.id, item.source_fingerprint]),
      ...(manifest.cover ? [[manifest.cover.id, manifest.cover.source_fingerprint]] : []),
    ]),
  };
}

// Task 42 (v2 Task 20): run npm through the current Node binary and npm's own entry script,
// with no shell, so arguments are never re-interpreted and the environment is not inherited
// through a shell. The first existing candidate wins: npm's own npm_execpath when we are
// already inside `npm run`, else the two layouts Node ships (Windows / Unix prefix). The
// existence check is injectable so the logic stays unit-testable.
export function npmInvocation(args, { exists = (p) => fs.existsSync(p) } = {}) {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [
    process.env.npm_execpath && /npm-cli\.js$/.test(process.env.npm_execpath) ? process.env.npm_execpath : null,
    path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),            // Windows and some Linux distributions
    path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"), // Unix prefix layout
  ].filter(Boolean);
  const npmCli = candidates.find((p) => exists(p));
  if (!npmCli) throw new Error(`npm-cli.js not found near ${process.execPath} (looked in: ${candidates.join(", ")})`);
  return { command: process.execPath, args: [npmCli, ...args], shell: false };
}
