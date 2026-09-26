// Sprint v5 Task 7 (Decisions A, K) — MSG-001's manifest entry points at the new President's
// message; only source_file, source_fingerprint, language and notes change. Title, alt,
// contributor details and order are kept, and no other item is affected by this entry.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { projectRoot, readManifest, sha256 } from "../../scripts/lib.mjs";

const NEW_SOURCE = "02_INCOMING_CONTENT/Souvenir President message 05-09-2026.docx";
const manifest = readManifest();
const items = manifest.items;
assert.equal(items.length, 47, "item count unchanged");
const msg = items.find((i) => i.id === "MSG-001");

assert.equal(msg.source_file, NEW_SOURCE);
assert.equal(msg.source_fingerprint, sha256(path.join(projectRoot, NEW_SOURCE)));
assert.equal(msg.source_fingerprint, "67d8a418d781e5bdad16985ceca4f64c6a40bd40d10a3cf075c9bd18dc9f3bf7");
assert.equal(msg.language, "en"); // Decision K: English, as the manifest's language code
assert.equal(msg.notes, "Tracker Item ID 16. Exact approved source: Souvenir President message 05-09-2026.docx.");

// Kept (Decision A).
assert.equal(msg.title, "President Desk");
assert.equal(msg.alt, "President Desk — Manik Barman");
assert.equal(msg.contributor, "Manik Barman");
assert.equal(msg.designation, "President");
assert.equal(msg.passing_year, "1987");
assert.equal(msg.order, 10);
assert.equal(msg.content_file, "messages/MSG-001-president-desk.md");

// The content file's front matter agrees with the manifest.
const content = fs.readFileSync(path.join(projectRoot, "05_WEBSITE", "src", "content", msg.content_file), "utf8");
assert.ok(content.includes(`source_file: "${NEW_SOURCE}"`));
assert.ok(content.includes(`\nsource_fingerprint: ${msg.source_fingerprint}\n`));

// No manifest entry names the removed source any more.
const raw = fs.readFileSync(path.join(projectRoot, "05_WEBSITE", "src", "_data", "publication.yaml"), "utf8");
assert.ok(!raw.includes("President Desk.docx"), "publication.yaml must not reference President Desk.docx");

console.log("v5-manifest-msg001: OK");
