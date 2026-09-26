import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDir, projectRoot, siteRoot, readManifest } from "./lib.mjs";
import { auditGate, buildReleaseManifest, npmInvocation, reproductionMarkdown, stepsForVersion } from "./release-core.mjs";

// Release pipeline. RELEASE_VERSION selects the step list (see release-core.mjs):
//   V3_*   — Sprint v3 order: validation → typecheck → unit → build → site/integration/QA/PDF/browser
//            suites → secret + SQL gates → dependency-audit gate, then packaging.
//   V4_*   — the V3 order plus the Sprint v4 suites, PDF comparison and page renders, with
//            `pdf` straight after `build` (see release-core.mjs).
//   V5_*   — the V4 order with the PDF comparison against V4_REVIEW_02 and the v5 page renders,
//            plus the front-page hero test and the v5 regression suite.
//   others — the sequence used for V0–V2 releases.
// The output folder must not already exist: releases are never overwritten.
const releaseVersion = process.env.RELEASE_VERSION || "V0_PROTOTYPE_01";
const steps = stepsForVersion(releaseVersion); // throws on unsupported characters
const outDir = path.join(projectRoot, "06_FINAL_OUTPUT", releaseVersion);
if (fs.existsSync(outDir)) throw new Error(`Refusing to overwrite existing release: ${releaseVersion}`);

// Task 42: npm is invoked as `node npm-cli.js …` with shell: false (see release-core.npmInvocation).
const resolveNpm = (args) => npmInvocation(args);

function run(_unused, args) {
  const { command, args: fullArgs } = resolveNpm(args);
  const result = spawnSync(command, fullArgs, { cwd: siteRoot, stdio: "inherit", shell: false });
  if (result.error) {
    console.error(`Failed to run npm ${args.join(" ")}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

const auditReportPath = path.join(siteRoot, "npm-audit.json");

function runAuditGate() {
  const { command, args } = resolveNpm(["audit", "--json"]);
  const result = spawnSync(command, args, { cwd: siteRoot, encoding: "utf8", shell: false, maxBuffer: 20_000_000 });
  let auditJson;
  try {
    auditJson = JSON.parse(result.stdout || "{}");
  } catch {
    console.error("npm audit did not return JSON.");
    process.exit(1);
  }
  fs.writeFileSync(auditReportPath, JSON.stringify(auditJson, null, 2), "utf8");
  const allowlist = JSON.parse(fs.readFileSync(path.join(siteRoot, "scripts", "audit-allowlist.json"), "utf8"));
  const gate = auditGate(auditJson, allowlist);
  const summary = { generated: new Date().toISOString(), ok: gate.ok, allowed: gate.allowed, blocking: gate.blocking, counts: auditJson.metadata?.vulnerabilities ?? {} };
  fs.writeFileSync(path.join(siteRoot, "audit-gate.json"), JSON.stringify(summary, null, 2), "utf8");
  if (!gate.ok) {
    console.error("Dependency audit gate FAILED — high/critical advisories outside scripts/audit-allowlist.json:");
    for (const b of gate.blocking) console.error(`  ${b.package} (${b.severity}): ${b.titles.join("; ")}`);
    process.exit(1);
  }
  console.log(`Dependency audit gate passed (allow-listed: ${gate.allowed.join(", ") || "none"}).`);
}

for (const step of steps) {
  console.log(`\n=== ${step} ===`);
  if (step === "audit") runAuditGate();
  else run(null, ["run", step]);
}

// --- packaging ---
ensureDir(outDir);

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(path.join(siteRoot, "_site"), path.join(outDir, "website"));
copyDir(path.join(siteRoot, "qa-output"), path.join(outDir, "qa-output"));
for (const name of ["validation-report.json", "validation-summary.md", "npm-audit.json", "audit-gate.json"]) {
  const source = path.join(siteRoot, name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(outDir, name));
}
for (const name of ["DEPLOYMENT.md"]) {
  const source = path.join(siteRoot, name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(outDir, name));
}
for (const name of ["THREAT_CHECKS.md"]) {
  const source = path.join(projectRoot, "sprints", "v3", name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(outDir, name));
}
for (const name of ["ADVERTISEMENT_RECONCILIATION_AUDIT.md", "advertisement-reconciliation-audit.json", "CONTENT_UPDATE_REPORT.md", "CONTRIBUTOR_BYLINE_AUDIT.md"]) {
  const source = path.join(projectRoot, "04_MAGAZINE_WORKING", name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(outDir, name));
}

const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: projectRoot, encoding: "utf8" }).stdout.trim();
const manifest = readManifest();
fs.writeFileSync(path.join(outDir, "release-manifest.json"), JSON.stringify(buildReleaseManifest(manifest, releaseVersion, commit), null, 2), "utf8");

fs.writeFileSync(path.join(outDir, "BUILD_SUMMARY.md"), `# ${releaseVersion} Build Summary

Built: ${new Date().toISOString()}
Git commit: ${commit || "n/a"}
Node: ${process.versions.node}

Included items (${manifest.items.length}): ${manifest.items.map((item) => item.id).join(", ")}

Pipeline steps run, in order: ${steps.join(" → ")}

Open \`website/index.html\` locally to review the built magazine (the registration gate only applies when served through Vercel or \`npm run dev:app\`). This is a local review build; it has not been deployed.
`, "utf8");

fs.writeFileSync(path.join(outDir, "REPRODUCTION.md"), reproductionMarkdown(releaseVersion, steps, { node: process.versions.node, commit: commit || "n/a" }), "utf8");

console.log(`\nRelease output written to ${path.relative(projectRoot, outDir)}`);
