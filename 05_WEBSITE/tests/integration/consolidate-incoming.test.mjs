// Integration test for scripts/consolidate-incoming.mjs --plan — Sprint v4 Task 3.
// Runs the real CLI as a child process against a temp copy of a small fixture
// pair of folders (never the real 02_INCOMING_CONTENT/) and checks the shape
// of the written JSON/MD report, the exit code, and that nothing is moved.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "..", "..", "scripts", "consolidate-incoming.mjs");

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function makeFixtureRoot(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const parentDir = path.join(root, "02_INCOMING_CONTENT");
  const subDir = path.join(parentDir, "v2-incoming");
  fs.mkdirSync(subDir, { recursive: true });
  return { root, parentDir, subDir };
}

function writeFixtureFile(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content);
}

function runPlan({ projectRoot, parentDir, subDir, reportDir, liveRefRoot }) {
  return spawnSync(
    process.execPath,
    [scriptPath, "--plan"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CONSOLIDATE_INCOMING_PROJECT_ROOT: projectRoot,
        CONSOLIDATE_INCOMING_PARENT_DIR: parentDir,
        CONSOLIDATE_INCOMING_SUB_DIR: subDir,
        CONSOLIDATE_INCOMING_REPORT_DIR: reportDir,
        CONSOLIDATE_INCOMING_LIVE_REF_ROOTS: liveRefRoot,
      },
    },
  );
}

async function run() {
  // --- Scenario 1: no collision -------------------------------------------
  const fixture = makeFixtureRoot("consolidate-incoming-plan-");
  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), "consolidate-incoming-report-"));
  const emptyLiveRefRoot = fs.mkdtempSync(path.join(os.tmpdir(), "consolidate-incoming-liverefs-"));

  const existingNotes = "alpha notes";
  const existingCover = "parent cover bytes";
  const newNotes = "gamma notes";
  const newCover = "sub cover bytes (different image, similar name)";

  writeFixtureFile(fixture.parentDir, "Existing Notes.docx", existingNotes);
  writeFixtureFile(fixture.parentDir, "Cover page.jpg", existingCover);
  writeFixtureFile(fixture.subDir, "New Notes.docx", newNotes);
  writeFixtureFile(fixture.subDir, "cover page new.png", newCover);

  const result = runPlan({ projectRoot: fixture.root, parentDir: fixture.parentDir, subDir: fixture.subDir, reportDir, liveRefRoot: emptyLiveRefRoot });
  assert.equal(result.status, 0, `--plan must exit 0 when there are no collisions (stderr: ${result.stderr})`);

  const jsonPath = path.join(reportDir, "INCOMING_CONSOLIDATION_2026-09-15.json");
  const mdPath = path.join(reportDir, "INCOMING_CONSOLIDATION_2026-09-15.md");
  assert.ok(fs.existsSync(jsonPath), "--plan must write the JSON report");
  assert.ok(fs.existsSync(mdPath), "--plan must write the Markdown report");

  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // Shape.
  for (const key of ["generated_at", "parent_dir", "sub_dir", "counts", "inventory", "collisions", "near_names", "moves", "ok", "live_references"]) {
    assert.ok(key in report, `report must have a "${key}" field`);
  }
  assert.equal(report.ok, true, "no collisions means ok: true");
  assert.deepEqual(report.counts, { parent: 2, sub: 2, total: 4 });
  assert.equal(report.inventory.parent.length, 2);
  assert.equal(report.inventory.sub.length, 2);
  assert.deepEqual(report.collisions, [], "collisions = none");

  // Inventory entries carry name/bytes/sha256 and the bytes/hashes are real.
  const parentCover = report.inventory.parent.find((f) => f.name === "Cover page.jpg");
  assert.ok(parentCover, "parent inventory must include Cover page.jpg");
  assert.equal(parentCover.bytes, Buffer.byteLength(existingCover));
  assert.equal(parentCover.sha256, sha256(existingCover));

  const subNewCover = report.inventory.sub.find((f) => f.name === "cover page new.png");
  assert.ok(subNewCover, "sub inventory must include cover page new.png");
  assert.equal(subNewCover.bytes, Buffer.byteLength(newCover));
  assert.equal(subNewCover.sha256, sha256(newCover));

  // Near-name table: "cover page new.png" vs "Cover page.jpg" is the known near pair.
  assert.equal(report.near_names.length, 1, "exactly one near-name pair (cover page new.png / Cover page.jpg)");
  assert.equal(report.near_names[0].sub.name, "cover page new.png");
  assert.equal(report.near_names[0].parent.name, "Cover page.jpg");
  assert.ok(report.near_names[0].similarity >= 0.6);

  // Five-file-shaped move plan (here: two, since the fixture is small) — both
  // sub files are safe to move (no collision).
  assert.equal(report.moves.length, 2, "every sub file with no collision is planned to move");
  const moveTargets = report.moves.map((m) => m.to).sort();
  assert.deepEqual(moveTargets, ["New Notes.docx", "cover page new.png"]);
  for (const move of report.moves) {
    assert.ok(move.from.startsWith("v2-incoming/"), `move.from must be under v2-incoming/: ${move.from}`);
  }

  assert.deepEqual(report.live_references, [], "live-reference scan of the empty fixture root finds nothing");

  // Markdown report has the required sections.
  const md = fs.readFileSync(mdPath, "utf8");
  for (const heading of ["## Inventory", "## Collisions", "## Near-name pairs", "## Planned `git mv` operations", "## Live references to `v2-incoming`", "## Result"]) {
    assert.ok(md.includes(heading), `Markdown report must contain "${heading}"`);
  }
  assert.ok(md.includes("cover page new.png"), "Markdown inventory must list the sub file");
  assert.ok(md.includes("**true**"), "Markdown result must record ok: true");

  // No file is moved by --plan.
  assert.ok(fs.existsSync(path.join(fixture.subDir, "New Notes.docx")), "sub file must remain in place after --plan");
  assert.ok(fs.existsSync(path.join(fixture.subDir, "cover page new.png")), "sub file must remain in place after --plan");
  assert.equal(fs.readdirSync(fixture.parentDir).filter((n) => n !== "v2-incoming").length, 2, "parent dir must be unchanged (still 2 files, plus the v2-incoming subfolder)");

  // --- Scenario 2: collision -> non-zero exit, still no file moved --------
  const collisionFixture = makeFixtureRoot("consolidate-incoming-plan-collision-");
  const collisionReportDir = fs.mkdtempSync(path.join(os.tmpdir(), "consolidate-incoming-report-collision-"));

  writeFixtureFile(collisionFixture.parentDir, "Notes.docx", "parent version");
  writeFixtureFile(collisionFixture.subDir, "notes.docx", "sub version (different content, same case-insensitive name)");

  const collisionResult = runPlan({
    projectRoot: collisionFixture.root,
    parentDir: collisionFixture.parentDir,
    subDir: collisionFixture.subDir,
    reportDir: collisionReportDir,
    liveRefRoot: emptyLiveRefRoot,
  });
  assert.notEqual(collisionResult.status, 0, "--plan must exit non-zero when a collision is detected");

  const collisionReport = JSON.parse(fs.readFileSync(path.join(collisionReportDir, "INCOMING_CONSOLIDATION_2026-09-15.json"), "utf8"));
  assert.equal(collisionReport.ok, false, "a collision must set ok: false in the written report");
  assert.equal(collisionReport.collisions.length, 1, "exactly one collision group reported");
  assert.deepEqual(collisionReport.moves, [], "the colliding file must not be planned to move");

  assert.ok(fs.existsSync(path.join(collisionFixture.subDir, "notes.docx")), "colliding sub file must remain in place (nothing moved on collision)");
  assert.ok(fs.existsSync(path.join(collisionFixture.parentDir, "Notes.docx")), "colliding parent file must remain in place");

  console.log("All consolidate-incoming --plan integration tests passed.");
}

await run();
