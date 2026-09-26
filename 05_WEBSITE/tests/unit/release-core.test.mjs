// Unit test for scripts/release-core.mjs — Sprint v3 Task 36. Hermetic.
import assert from "node:assert/strict";
import { stepsForVersion, auditGate, reproductionMarkdown, buildReleaseManifest } from "../../scripts/release-core.mjs";

// --- step order for V3 ---
const steps = stepsForVersion("V3_REVIEW_01");
const idx = (name) => { const i = steps.indexOf(name); assert.ok(i >= 0, `step ${name} present`); return i; };
assert.equal(steps[0], "tracker:validate");
assert.equal(steps[1], "validate");
for (const s of ["typecheck", "test:unit", "build", "test", "test:integration", "qa", "qa:v2-items", "pdf", "qa:pdf", "test:e2e:cover", "qa:pdf:v2-items", "qa:ad-backgrounds", "qa:art006", "qa:contact", "test:e2e:print-ads", "test:e2e:web-ads", "test:e2e:welcome", "test:e2e:admin", "e2e:app", "check:secrets", "check:sql"]) idx(s);
assert.ok(idx("build") < idx("test:integration"), "integration tests (dev-app, threats) need _site/, so build comes first");
assert.ok(idx("build") < idx("test") && idx("build") < idx("qa") && idx("build") < idx("e2e:app") && idx("build") < idx("test:e2e:welcome"));
assert.ok(idx("pdf") < idx("test:e2e:cover"), "cover-page check needs the PDF");
assert.ok(idx("pdf") < idx("qa:pdf") && idx("qa:pdf") < idx("qa:ad-backgrounds") && idx("qa") < idx("qa:ad-backgrounds"), "review sheet needs qa + qa:pdf outputs");
assert.ok(idx("build") < idx("check:secrets"), "secret scan must also cover the built site");
assert.equal(steps[steps.length - 1], "audit", "dependency audit gate runs last");
assert.equal(new Set(steps).size, steps.length, "no duplicate steps");
// Older versions keep the v2 sequence (no application steps).
const v2 = stepsForVersion("V2_REVIEW_01");
assert.ok(!v2.includes("e2e:app") && !v2.includes("audit") && v2.includes("qa:pdf:v2-items"));
assert.throws(() => stepsForVersion("../evil"), /RELEASE_VERSION/);

// --- Sprint v4 (Task 30, Decision L): V4 step order ---
{
  const v4 = stepsForVersion("V4_REVIEW_01");
  const at = (name) => { const i = v4.indexOf(name); assert.ok(i >= 0, `V4 step ${name} present`); return i; };
  // Every V3 step is kept.
  for (const s of steps) at(s);
  for (const s of ["test:e2e:nav", "test:e2e:poem", "test:v4-advertisements", "test:v4-committee-corrections", "qa:pdf-compare", "qa:v4-pages"]) at(s);
  assert.equal(new Set(v4).size, v4.length, "V4: no duplicate steps");
  assert.equal(v4[0], "tracker:validate");
  assert.equal(v4[v4.length - 1], "audit", "V4: dependency audit gate runs last");
  // build deletes _site/, and the integration chain includes tests that read the PDF.
  assert.ok(at("build") < at("pdf") && at("pdf") < at("test:integration"), "V4: pdf is rebuilt before the integration suite reads it");
  // visual-qa (`qa`) deletes qa-output/; every step that leaves evidence there runs after it.
  for (const s of ["qa:pdf-compare", "qa:v4-pages", "test:e2e:nav", "qa:pdf", "e2e:app"]) assert.ok(at("qa") < at(s), `V4: ${s} after qa (qa-output wipe)`);
  for (const s of ["qa:pdf-compare", "qa:v4-pages", "test:e2e:poem", "test:v4-advertisements", "test:v4-committee-corrections", "test:e2e:cover"]) assert.ok(at("pdf") < at(s), `V4: ${s} needs the PDF`);
  assert.ok(at("build") < at("test:e2e:nav"));
  assert.ok(at("check:secrets") > at("build"));
  // V3 versions keep the V3 list exactly.
  assert.deepEqual(stepsForVersion("V3_REVIEW_02"), steps, "V3 list unchanged");
  assert.ok(!steps.includes("qa:pdf-compare") && !steps.includes("test:e2e:nav"), "V3 list does not gain V4 steps");

  const md4 = reproductionMarkdown("V4_REVIEW_01", v4, { node: "22.23.2", commit: "def5678" });
  assert.ok(md4.includes("npm run release:v4"), "V4 reproduction names release:v4");
  assert.ok(!md4.includes("release:v3"), "V4 reproduction does not name release:v3");
  assert.ok(md4.includes("unzip") && md4.includes("pdftotext") && md4.includes("pdftoppm"), "V4 reproduction lists unzip/pdftotext/pdftoppm (poppler-utils)");
  for (const s of v4.filter((x) => x !== "audit")) assert.ok(md4.includes(`npm run ${s}`), `V4 step ${s} listed`);
  for (const s of ["extract:v4-golap", "normalize:v4-memorial-image", "manifest:apply-v4-updates", "tracker:apply-v4-updates", "corrections:apply-v4", "tracker:apply-v4-corrections"]) assert.ok(md4.includes(`npm run ${s}`), `V4 content migration step ${s} listed`);
  assert.ok(md4.includes("V3_REVIEW_02"), "V4 reproduction mentions the PDF comparison baseline");
}

// --- audit gate ---
const allow = { allow: [{ package: "sharp" }, { package: "playwright" }, { package: "xlsx" }] };
const audit = (vulns) => ({ vulnerabilities: Object.fromEntries(vulns.map(([name, severity, via]) => [name, { name, severity, via: via ?? [{ title: "x" }] }])), metadata: { vulnerabilities: {} } });
assert.deepEqual(auditGate(audit([["sharp", "high"], ["xlsx", "high"], ["playwright", "high"]]), allow), { ok: true, blocking: [], allowed: ["playwright", "sharp", "xlsx"] });
let g = auditGate(audit([["sharp", "high"], ["pg", "critical"]]), allow);
assert.equal(g.ok, false);
assert.deepEqual(g.blocking.map((b) => b.package), ["pg"], "a new high/critical advisory outside the allow-list blocks");
g = auditGate(audit([["some-dev-tool", "moderate"], ["other", "low"]]), allow);
assert.equal(g.ok, true, "moderate/low advisories do not block (audit-level=high)");
g = auditGate(audit([["js-yaml", "high", ["gray-matter"]]]), allow);
assert.equal(g.ok, false, "transitive high advisory not in the allow-list blocks (js-yaml before Task 37)");
assert.deepEqual(auditGate({ vulnerabilities: {}, metadata: { vulnerabilities: {} } }, allow), { ok: true, blocking: [], allowed: [] });

// --- reproduction document from the real step list ---
const md = reproductionMarkdown("V3_REVIEW_01", steps, { node: "22.23.2", commit: "abc1234" });
assert.match(md, /^# Reproduction — V3_REVIEW_01/);
assert.ok(md.includes("npx playwright install chromium"), "Playwright prerequisite documented");
assert.ok(md.includes("npm run db:local:start") && md.includes("PostgreSQL"), "PostgreSQL prerequisite documented");
assert.ok(md.includes(".env.local") && md.includes("SESSION_SECRET"), "environment prerequisite documented");
for (const s of steps.filter((x) => x !== "audit")) assert.ok(md.includes(`npm run ${s}`), `step ${s} listed`);
assert.ok(md.includes("npm audit"), "audit gate listed");
assert.ok(md.includes("release:v3") && md.includes("abc1234") && md.includes("22.23.2"));
assert.ok(!md.includes("release:v0") && !md.includes("npm.cmd run inventory"), "the stale V0 sequence is gone");
assert.ok(md.includes("retitle:advertisements") && md.includes("sample:ad-backgrounds") && md.includes("extract:v3-secretary-desk"), "the v3 content migration steps are listed for a from-scratch rebuild");

// --- release manifest ---
const manifest = { items: [{ id: "MSG-001", source_fingerprint: "a" }, { id: "ADV-018", source_fingerprint: "b" }], cover: { id: "COV-001", source_fingerprint: "c" } };
const rm = buildReleaseManifest(manifest, "V3_REVIEW_01", "abc1234", new Date("2026-09-14T00:00:00Z"));
assert.deepEqual(rm.included_item_ids, ["MSG-001", "ADV-018"]);
assert.deepEqual(rm.source_fingerprints, { "MSG-001": "a", "ADV-018": "b", "COV-001": "c" });
assert.equal(rm.git_commit, "abc1234");
assert.equal(rm.version, "V3_REVIEW_01");
assert.equal(rm.build_time, "2026-09-14T00:00:00.000Z");
console.log("All release-core unit tests passed.");

// --- Task 42: the pipeline runs npm without a shell ---
import fs from "node:fs";
import { npmInvocation } from "../../scripts/release-core.mjs";
const inv = npmInvocation(["run", "build"]);
assert.equal(inv.shell, false, "no shell: arguments cannot be re-interpreted");
assert.throws(() => npmInvocation(["x"], { exists: () => false }), /npm-cli\.js not found/, "fails loudly when npm cannot be located");
const fake = npmInvocation(["run", "x"], { exists: (p) => p.includes("lib/node_modules") });
assert.ok(fake.args[0].includes("lib/node_modules/npm/bin/npm-cli.js"), "picks the first candidate that exists");
assert.equal(inv.command, process.execPath, "npm is run through the current Node binary");
assert.ok(fs.existsSync(inv.args[0]) && /npm-cli\.js$/.test(inv.args[0]), `first argument is npm-cli.js: ${inv.args[0]}`);
assert.deepEqual(inv.args.slice(1), ["run", "build"]);
// --- Sprint v5 (Task 15, Decision L): V5 step list and reproduction ---
{
  const v4 = stepsForVersion("V4_REVIEW_02");
  const v5 = stepsForVersion("V5_REVIEW_01");
  const at = (name) => { const i = v5.indexOf(name); assert.ok(i >= 0, `V5 step ${name} present`); return i; };
  assert.equal(new Set(v5).size, v5.length, "V5: no duplicate steps");
  assert.equal(v5[v5.length - 1], "audit", "V5: dependency audit gate runs last");
  // V5 = V4 with the comparison and page renders moved to their V5 forms, plus the hero and v5 suites.
  const V5_RENAMED = { "qa:pdf-compare": "qa:pdf-compare:v5", "qa:v4-pages": "qa:v5-pages" };
  const V5_ADDED = ["test:e2e:hero", "test:v5-updates", "test:e2e:csp", "test:e2e:blocker", "qa:blocklist"];
  assert.deepEqual(v5.filter((s) => !V5_ADDED.includes(s)), v4.map((s) => V5_RENAMED[s] ?? s), "V5 keeps the V4 order otherwise");
  // Sprint v5 addendum (Task 27, PRD §11): the ad-blocker and CSP guards gate every V5 release.
  assert.deepEqual(v5.slice(at("test:e2e:nav") + 1, at("test:e2e:nav") + 4), ["test:e2e:hero", "test:e2e:csp", "test:e2e:blocker"], "V5: CSP and ad-blocker tests follow the hero test");
  assert.equal(at("qa:blocklist"), at("qa:v5-pages") + 1, "V5: qa:blocklist follows the v5 page renders");
  for (const s of ["test:e2e:csp", "test:e2e:blocker", "qa:blocklist"]) assert.ok(at("build") < at(s) && at("qa") < at(s), `V5: ${s} after build and after the qa-output wipe`);
  assert.ok(!v5.includes("qa:pdf-compare") && !v5.includes("qa:v4-pages"), "V5 does not run the V3-baseline comparison or the V4 renders");
  assert.ok(at("build") < at("pdf") && at("pdf") < at("test:integration"), "V5: pdf before the integration suite");
  for (const s of ["qa:pdf-compare:v5", "qa:v5-pages", "test:e2e:hero", "test:e2e:nav", "e2e:app"]) assert.ok(at("qa") < at(s), `V5: ${s} after qa (qa-output wipe)`);
  for (const s of ["qa:pdf-compare:v5", "qa:v5-pages", "test:v5-updates"]) assert.ok(at("pdf") < at(s), `V5: ${s} needs the PDF`);
  assert.equal(at("test:e2e:hero"), at("test:e2e:nav") + 1, "V5: hero test runs next to the navigation test");
  assert.equal(at("test:v5-updates"), at("test:v4-committee-corrections") + 1, "V5: v5 suite follows the v4 suites");
  // V4 is unchanged (its releases are closed and must stay reproducible).
  assert.ok(v4.includes("qa:pdf-compare") && v4.includes("qa:v4-pages") && !v4.includes("test:e2e:hero") && !v4.includes("test:v5-updates"), "V4 list unchanged");

  const md5 = reproductionMarkdown("V5_REVIEW_01", v5, { node: "22.23.2", commit: "abc5555" });
  assert.ok(md5.includes("# Reproduction — V5_REVIEW_01") && md5.includes("abc5555"));
  assert.ok(md5.includes("npm run release:v5") && !md5.includes("release:v4"), "V5 reproduction names release:v5 only");
  for (const s of v5.filter((x) => x !== "audit")) assert.ok(md5.includes(`npm run ${s}`), `V5 step ${s} listed`);
  assert.ok(md5.includes("V4_REVIEW_02"), "V5 reproduction names the comparison baseline");
  assert.ok(md5.includes("unzip") && md5.includes("pdftotext") && md5.includes("pdftoppm"));
  // Every V5 step is a real npm script (qa:pdf-compare:v5 and qa:v5-pages arrive in Task 16).
  const scripts = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8")).scripts;
  for (const s of v5.filter((x) => x !== "audit")) assert.ok(scripts[s], `V5 step ${s} is defined in package.json`);
  const mig = ["extract:v5-president-desk", "corrections:apply-v5", "tracker:apply-v5"];
  for (const s of mig) assert.ok(md5.includes(`npm run ${s}`), `V5 content migration ${s} listed`);
  assert.ok(md5.indexOf("npm run extract:v5-president-desk") < md5.indexOf("npm run corrections:apply-v5"), "corrections re-applied after re-extraction");
}

console.log("All release-core (incl. Task 42) unit tests passed.");
