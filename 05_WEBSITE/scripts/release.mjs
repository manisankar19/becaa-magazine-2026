import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDir, projectRoot, siteRoot, readManifest } from "./lib.mjs";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: siteRoot, stdio: "inherit", shell: true });
  if (result.error) {
    console.error(`Failed to run ${command} ${args.join(" ")}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

function runOptional(command, args) {
  const result = spawnSync(command, args, { cwd: siteRoot, stdio: "inherit", shell: true });
  if (result.status !== 0) console.warn(`Optional step failed: ${command} ${args.join(" ")}`);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
run(npmCommand, ["run", "tracker:validate"]);
run(npmCommand, ["run", "validate"]);
run(npmCommand, ["run", "build"]);
run(npmCommand, ["run", "test"]);
run(npmCommand, ["run", "qa"]);
run(npmCommand, ["run", "pdf"]);
run(npmCommand, ["run", "qa:pdf"]);
run(npmCommand, ["run", "qa:art006"]);
run(npmCommand, ["run", "qa:contact"]);

const releaseVersion = process.env.RELEASE_VERSION || "V0_PROTOTYPE_01";
if (!/^[A-Za-z0-9_-]+$/.test(releaseVersion)) throw new Error("RELEASE_VERSION contains unsupported characters.");
const outDir = path.join(projectRoot, "06_FINAL_OUTPUT", releaseVersion);
if (fs.existsSync(outDir)) throw new Error(`Refusing to overwrite existing release: ${releaseVersion}`);
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
fs.copyFileSync(path.join(siteRoot, "validation-report.json"), path.join(outDir, "validation-report.json"));
fs.copyFileSync(path.join(siteRoot, "validation-summary.md"), path.join(outDir, "validation-summary.md"));
for (const name of ["ADVERTISEMENT_RECONCILIATION_AUDIT.md", "advertisement-reconciliation-audit.json", "CONTENT_UPDATE_REPORT.md", "CONTRIBUTOR_BYLINE_AUDIT.md"]) {
  const source = path.join(projectRoot, "04_MAGAZINE_WORKING", name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(outDir, name));
}

const manifest = readManifest();
fs.writeFileSync(path.join(outDir, "release-manifest.json"), JSON.stringify({
  version: releaseVersion,
  build_time: new Date().toISOString(),
  git_commit: spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: projectRoot, encoding: "utf8" }).stdout.trim() || null,
  included_item_ids: manifest.items.map((item) => item.id),
  source_fingerprints: Object.fromEntries(manifest.items.map((item) => [item.id, item.source_fingerprint]))
}, null, 2), "utf8");

fs.writeFileSync(path.join(outDir, "BUILD_SUMMARY.md"), `# ${releaseVersion} Build Summary

Built: ${new Date().toISOString()}

Included items: ${manifest.items.map((item) => item.id).join(", ")}

Open \`website/index.html\` locally to review the built prototype. This is not the final 2026 magazine and has not been deployed.
`, "utf8");

fs.writeFileSync(path.join(outDir, "REPRODUCTION.md"), `# Reproduction

From \`05_WEBSITE\`:

\`\`\`powershell
npm.cmd install
npm.cmd run inventory
npm.cmd run import
npm.cmd run validate
npm.cmd run build
npm.cmd run test
npm.cmd run qa
npm.cmd run release:v0
\`\`\`
`, "utf8");

console.log(`Release output written to ${path.relative(projectRoot, outDir)}`);
