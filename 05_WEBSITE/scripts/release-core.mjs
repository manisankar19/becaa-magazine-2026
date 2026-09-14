// Pure pieces of the release pipeline (Sprint v3 Task 36). No I/O, so the ordering, the
// dependency-audit gate and the generated documents can be unit tested.

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

// The sequence used for V0–V2 releases (unchanged behaviour for those versions).
const LEGACY_STEPS = ["tracker:validate", "validate", "build", "test", "qa", "qa:v2-items", "pdf", "qa:pdf", "qa:pdf:v2-items", "qa:art006", "qa:contact"];

export function stepsForVersion(version) {
  if (!VERSION_PATTERN.test(String(version ?? ""))) throw new Error("RELEASE_VERSION contains unsupported characters.");
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

export function reproductionMarkdown(version, steps, { node, commit }) {
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
