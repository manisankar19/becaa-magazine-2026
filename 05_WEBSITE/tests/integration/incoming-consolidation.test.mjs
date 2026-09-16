// Integration test for the applied consolidation — Sprint v4 Task 4
// (sprints/v4/PRD.md §4.5, Decision H). Verifies the *result* of having run
// `node scripts/consolidate-incoming.mjs --apply` for real against
// 02_INCOMING_CONTENT/: every inventoried file survives at its final path
// with its recorded hash, v2-incoming/ is gone, and no live code/data/test
// under scripts, src, tests or 04_MAGAZINE_WORKING/*.md still points at it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { projectRoot, siteRoot, sha256 } from "../../scripts/lib.mjs";
import { findLiveReferences } from "../../scripts/consolidate-incoming.mjs";

const reportPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "INCOMING_CONSOLIDATION_2026-09-15.json");
const parentDir = path.join(projectRoot, "02_INCOMING_CONTENT");
const subDir = path.join(parentDir, "v2-incoming");

// Files that legitimately contain the literal string "v2-incoming" after the
// consolidation, and must stay that way — none of these is a live path that
// the build/scripts resolve against the filesystem:
//   - scripts/consolidate-incoming.mjs / scripts/incoming-consolidation-core.mjs:
//     the consolidation tool and its planning core must keep knowing the
//     folder's old name (default sub-dir name, "moves" prefix, doc comments)
//     to describe/replan a merge; this is the tool's own vocabulary, not a
//     path it reads today.
//   - tests/unit/incoming-consolidation-core.test.mjs: Task 2's hermetic
//     fixture data for the planner (e.g. "v2-incoming/cover page new.png" as
//     an example `from` value) — tests the planning logic, not a live path.
//   - tests/unit/article-markdown-core.test.mjs: a Task 5 code comment
//     recording where the poem source was read from before this
//     consolidation ran.
//   - tests/integration/consolidate-incoming.test.mjs: Task 3's own fixture
//     test, which builds temp folders named "v2-incoming" to exercise the
//     planner in isolation.
//   - tests/integration/incoming-consolidation.test.mjs: this file. It has to
//     name "v2-incoming" throughout (allow-list entries, comments, the moved
//     file list) to describe and check for exactly that string.
const ALLOWED_LIVE_REFERENCE_FILES = new Set([
  "05_WEBSITE/scripts/consolidate-incoming.mjs",
  "05_WEBSITE/scripts/incoming-consolidation-core.mjs",
  "05_WEBSITE/tests/unit/incoming-consolidation-core.test.mjs",
  "05_WEBSITE/tests/unit/article-markdown-core.test.mjs",
  "05_WEBSITE/tests/integration/consolidate-incoming.test.mjs",
  "05_WEBSITE/tests/integration/incoming-consolidation.test.mjs",
]);

// 04_MAGAZINE_WORKING/*.md (non-recursive; excludes SUPERSEDED_SOURCES/**,
// which are dated archive records that are expected to keep documenting the
// old path, same as sprints/ and 06_FINAL_OUTPUT/). The one file this scan
// would otherwise flag is Task 3's own planning report, which necessarily
// lists "v2-incoming" throughout (that is its entire subject).
const ALLOWED_WORKING_MD_FILES = new Set(["INCOMING_CONSOLIDATION_2026-09-15.md"]);

async function run() {
  // --- v2-incoming is gone -------------------------------------------------
  assert.ok(!fs.existsSync(subDir), "02_INCOMING_CONTENT/v2-incoming must no longer exist");

  // --- every inventoried file survives at its final path, same hash --------
  assert.ok(fs.existsSync(reportPath), "the Task 3 plan report must exist (source of truth for the inventory)");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.inventory.parent.length, 21);
  assert.equal(report.inventory.sub.length, 5);
  const inventoried = [...report.inventory.parent, ...report.inventory.sub];
  assert.equal(inventoried.length, 26, "26 inventoried files (21 + 5)");

  for (const file of inventoried) {
    const finalPath = path.join(parentDir, file.name); // every file — parent or ex-sub — now lives directly under 02_INCOMING_CONTENT
    assert.ok(fs.existsSync(finalPath), `inventoried file must exist at its final path: ${finalPath}`);
    const stat = fs.statSync(finalPath);
    assert.equal(stat.size, file.bytes, `byte count must be unchanged for ${file.name}`);
    assert.equal(sha256(finalPath), file.sha256, `SHA-256 must be unchanged (git mv preserves content) for ${file.name}`);
  }

  // The five files that used to live under v2-incoming/, explicitly.
  for (const name of ["Palash Article.docx", "Shubhra Basu.md", "Siddhartha Mukhopadhyay story.docx", "chatgpt kallol.jpeg", "cover page new.png"]) {
    assert.ok(fs.existsSync(path.join(parentDir, name)), `moved file must exist directly under 02_INCOMING_CONTENT: ${name}`);
  }

  // --- manifest and content front matter point at the new paths ------------
  const manifestText = fs.readFileSync(path.join(siteRoot, "src", "_data", "publication.yaml"), "utf8");
  assert.ok(!manifestText.includes("v2-incoming"), "publication.yaml must not reference v2-incoming");
  assert.ok(manifestText.includes("source_file: 02_INCOMING_CONTENT/chatgpt kallol.jpeg"));
  // ART-010 was deliberately left pointing at the superseded .docx by Task 4
  // (its own source_file/source_fingerprint update is Task 6's job, Decisions
  // A/B); Task 6 has since re-pointed it at the authoritative .md.
  assert.ok(manifestText.includes("source_file: 02_INCOMING_CONTENT/Shubhra Basu.md"));
  assert.ok(manifestText.includes("source_file: 02_INCOMING_CONTENT/Palash Article.docx"));
  assert.ok(manifestText.includes("source_file: 02_INCOMING_CONTENT/Siddhartha Mukhopadhyay story.docx"));
  assert.ok(manifestText.includes("source_file: 02_INCOMING_CONTENT/cover page new.png"));

  for (const contentFile of ["ART-010-item.md", "ART-011-item.md", "ART-012-item.md"]) {
    const text = fs.readFileSync(path.join(siteRoot, "src", "content", "articles", contentFile), "utf8");
    assert.ok(!text.includes("v2-incoming"), `${contentFile} front matter must not reference v2-incoming`);
  }

  // --- no live v2-incoming reference under scripts/src/tests ---------------
  const liveReferences = findLiveReferences(
    [path.join(siteRoot, "scripts"), path.join(siteRoot, "src"), path.join(siteRoot, "tests")],
    { projectRoot },
  );
  const unexpected = liveReferences.filter((m) => !ALLOWED_LIVE_REFERENCE_FILES.has(m.file));
  assert.deepEqual(
    unexpected,
    [],
    `no live "v2-incoming" reference expected outside the known-inert files; found: ${JSON.stringify(unexpected)}`,
  );

  // Explicitly confirm the ten scripts and four tests named in the Task 4
  // acceptance criteria are clean (a more direct check than the generic scan
  // above, so a future refactor of findLiveReferences can't silently widen
  // the allow-list and hide a regression here).
  //
  // "scripts/extract-v2-golap.mjs" was in this list originally (Task 4 made
  // it clean of "v2-incoming"); Sprint v4 Task 6 retired the file entirely
  // (replaced by scripts/extract-v4-golap.mjs), so it is removed from this
  // check rather than left pointing at a deleted file.
  const mustBeClean = [
    "scripts/merge-v2-addendum-tracker.mjs",
    "scripts/update-v2-cover-manifest.mjs",
    "scripts/extract-v2-palash-article.mjs",
    "scripts/normalize-v2-gallery-image.mjs",
    "scripts/add-v2-manifest-items.mjs",
    "scripts/apply-v2-exclusions.mjs",
    "scripts/normalize-v2-cover.mjs",
    "scripts/extract-v3-siddhartha-story.mjs",
    "scripts/add-v3-manifest-items.mjs",
    "tests/integration/cover-manifest-entry.test.mjs",
    "tests/integration/normalize-cover-core.test.mjs",
    "tests/integration/superseded-sources.test.mjs",
    "tests/integration/extract-v3-siddhartha-story.test.mjs",
  ];
  for (const rel of mustBeClean) {
    const text = fs.readFileSync(path.join(siteRoot, rel), "utf8");
    assert.ok(!text.includes("v2-incoming"), `${rel} must no longer reference v2-incoming`);
  }

  // --- no live v2-incoming reference under 04_MAGAZINE_WORKING/*.md --------
  const workingDir = path.join(projectRoot, "04_MAGAZINE_WORKING");
  const workingMdFiles = fs.readdirSync(workingDir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".md"));
  for (const entry of workingMdFiles) {
    if (ALLOWED_WORKING_MD_FILES.has(entry.name)) continue;
    const text = fs.readFileSync(path.join(workingDir, entry.name), "utf8");
    assert.ok(!text.includes("v2-incoming"), `04_MAGAZINE_WORKING/${entry.name} must not reference v2-incoming`);
  }

  // --- the dated addendum was appended to the 2026-09-14 archive README ----
  const readme14 = fs.readFileSync(path.join(workingDir, "SUPERSEDED_SOURCES", "2026-09-14", "README.md"), "utf8");
  assert.ok(/addendum/i.test(readme14) && readme14.includes("v2-incoming"), "2026-09-14/README.md must carry a dated addendum describing the consolidation");
  assert.ok(readme14.includes("02_INCOMING_CONTENT/Siddhartha Mukhopadhyay story.docx"), "addendum must point at the file's new location");

  console.log("All incoming-consolidation (applied) integration tests passed.");
}

await run();
