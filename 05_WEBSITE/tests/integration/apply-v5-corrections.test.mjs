// Sprint v5 Task 6 — scripts/apply-v5-corrections.mjs applies the owner corrections recorded in
// 02_INCOMING_CONTENT/BECAA Owner Corrections 2026-09-26.md (scripts/v5-corrections.mjs):
// exact, count-guarded, re-runnable, confined to 05_WEBSITE/. The real MSG-001 file must equal
// the extraction of the fingerprinted source with only the recorded signature substitution.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyCorrection } from "../../scripts/text-correction-core.mjs";
import { V5_FILE_CORRECTIONS } from "../../scripts/v5-corrections.mjs";
import { applyV5FileCorrections } from "../../scripts/apply-v5-corrections.mjs";
import { buildPresidentDeskMarkdown, outputPath } from "../../scripts/extract-v5-president-desk.mjs";

const msg001 = V5_FILE_CORRECTIONS.find((c) => c.id === "MSG-001");
const extracted = await buildPresidentDeskMarkdown();

// Hermetic run in a temporary site root.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "v5-apply-"));
const msgRel = msg001.file;
fs.mkdirSync(path.join(root, path.dirname(msgRel)), { recursive: true });
fs.writeFileSync(path.join(root, msgRel), extracted, "utf8");

const first = applyV5FileCorrections({ only: ["MSG-001"], root });
assert.deepEqual(first.map((r) => [r.id, r.action]), [["MSG-001", "applied"]]);
const corrected = fs.readFileSync(path.join(root, msgRel), "utf8");
assert.equal(corrected, applyCorrection(extracted, msg001), "only the recorded substitution is made");
assert.ok(corrected.includes("Manik Barman  \nCE ’87  \nPresident, BECAA Maharashtra"), "signature reads CE ’87 on its own line");

const second = applyV5FileCorrections({ only: ["MSG-001"], root });
assert.deepEqual(second.map((r) => r.action), ["already applied"], "re-run is a no-op");
assert.equal(fs.readFileSync(path.join(root, msgRel), "utf8"), corrected);

// Guards: unknown ID, path outside the root, ambiguous state.
assert.throws(() => applyV5FileCorrections({ only: ["NOPE-1"], root }), /No corrections/);
assert.throws(
  () => applyV5FileCorrections({ root, corrections: [{ id: "X", file: "../escape.md", find: "a", replace: "b", expectedCount: 1 }] }),
  /escapes the site root/
);
fs.writeFileSync(path.join(root, msgRel), `${extracted}\n${corrected}`, "utf8");
assert.throws(() => applyV5FileCorrections({ only: ["MSG-001"], root }), "a mixed state must stop the run");

// The real working file: extraction + the recorded MSG-001 substitution, nothing else.
assert.equal(fs.readFileSync(outputPath, "utf8"), applyCorrection(extracted, msg001), "real MSG-001 = extraction + recorded correction");

console.log("apply-v5-corrections: OK");
