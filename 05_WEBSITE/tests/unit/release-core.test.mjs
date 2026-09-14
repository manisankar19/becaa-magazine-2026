// Unit test for scripts/release-core.mjs — Sprint v3 Task 36. Hermetic.
import assert from "node:assert/strict";
import { stepsForVersion, auditGate, reproductionMarkdown, buildReleaseManifest } from "../../scripts/release-core.mjs";

// --- step order for V3 ---
const steps = stepsForVersion("V3_REVIEW_01");
const idx = (name) => { const i = steps.indexOf(name); assert.ok(i >= 0, `step ${name} present`); return i; };
assert.equal(steps[0], "tracker:validate");
assert.equal(steps[1], "validate");
for (const s of ["typecheck", "test:unit", "build", "test", "test:integration", "qa", "qa:v2-items", "pdf", "qa:pdf", "qa:pdf:v2-items", "qa:ad-backgrounds", "qa:art006", "qa:contact", "test:e2e:print-ads", "test:e2e:web-ads", "test:e2e:welcome", "test:e2e:admin", "e2e:app", "check:secrets", "check:sql"]) idx(s);
assert.ok(idx("build") < idx("test:integration"), "integration tests (dev-app, threats) need _site/, so build comes first");
assert.ok(idx("build") < idx("test") && idx("build") < idx("qa") && idx("build") < idx("e2e:app") && idx("build") < idx("test:e2e:welcome"));
assert.ok(idx("pdf") < idx("qa:pdf") && idx("qa:pdf") < idx("qa:ad-backgrounds") && idx("qa") < idx("qa:ad-backgrounds"), "review sheet needs qa + qa:pdf outputs");
assert.ok(idx("build") < idx("check:secrets"), "secret scan must also cover the built site");
assert.equal(steps[steps.length - 1], "audit", "dependency audit gate runs last");
assert.equal(new Set(steps).size, steps.length, "no duplicate steps");
// Older versions keep the v2 sequence (no application steps).
const v2 = stepsForVersion("V2_REVIEW_01");
assert.ok(!v2.includes("e2e:app") && !v2.includes("audit") && v2.includes("qa:pdf:v2-items"));
assert.throws(() => stepsForVersion("../evil"), /RELEASE_VERSION/);

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
