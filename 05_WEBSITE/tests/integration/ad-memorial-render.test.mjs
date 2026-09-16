// Integration test for the memorial advertisement page rendering — Sprint v4
// Task 11 (sprints/v4/PRD.md §4.4, Decisions F, G, J).
//
// Same rendering approach as tests/integration/ad-text-render.test.mjs (Task
// 10): render the real src/index.njk / src/print.njk source (front matter
// stripped) through a Nunjucks Environment registered with the actual
// eleventy.config.mjs filters, against a fixture memorial item. This is
// preferred over a full Eleventy programmatic build here because it exercises
// the real template and filter logic directly, with no temp-site scaffolding,
// no passthrough-copy/layout wiring, and no risk of touching the real
// src/_site output.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import eleventyConfig from "../../eleventy.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");

function buildEnv() {
  const filters = {};
  const shim = {
    addDataExtension() {},
    addPassthroughCopy() {},
    setLibrary() {},
    addFilter(name, fn) { filters[name] = fn; },
  };
  eleventyConfig(shim);
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(path.join(siteRoot, "src", "_includes")),
    { autoescape: true }
  );
  for (const [name, fn] of Object.entries(filters)) env.addFilter(name, fn);
  return env;
}

function stripFrontMatter(raw) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function renderIndex(env, items) {
  const raw = fs.readFileSync(path.join(siteRoot, "src", "index.njk"), "utf8");
  const body = stripFrontMatter(raw);
  const ctx = {
    publication: {
      items,
      cover: { asset: "assets/normalized/cover/fixture.jpg" },
      sponsor_acknowledgement_message: "",
    },
    publicationContent: {},
    officialLinks: { cultural_programmes: [], connect: [] },
  };
  return env.renderString(body, ctx);
}

function renderPrint(env, items) {
  const raw = fs.readFileSync(path.join(siteRoot, "src", "print.njk"), "utf8");
  const body = stripFrontMatter(raw);
  const ctx = {
    publication: {
      items,
      cover: { asset: "assets/normalized/cover/fixture.jpg" },
      sponsor_acknowledgement_message: "",
    },
    publicationContent: {},
    officialLinks: {
      organisation: { full_name: "BECAA Maharashtra" },
      cultural_programmes: [],
      connect: [],
    },
  };
  return env.renderString(body, ctx);
}

// The seven memorial lines exactly as specified, sprints/v4/PRD.md §4.4.
const MEMORIAL_LINES = [
  "In fond memory of",
  "Late Shri Bhakta Mohon Mitra",
  "B E (Mechanical) April 1951",
  "Bengal Engineering College, Shibpur, Howrah.",
  "With Love from",
  "Subrata Mitra (son)",
  "Soma Mitra (daughter)",
];

// Fixture item shaped to satisfy Task 9's validateAdvertisementPresentation
// rules for presentation: "memorial" (sprints/v4/PRD.md §5): title equals
// text_lines[0] + " " + text_lines[1], >= 3 lines, both assets non-empty.
function memorialFixture(overrides = {}) {
  return {
    id: "ADV-029",
    type: "advertisement",
    section: "advertisements",
    title: `${MEMORIAL_LINES[0]} ${MEMORIAL_LINES[1]}`,
    contributor: "Subrata Mitra (son), Soma Mitra (daughter)",
    designation: "Memorial contribution",
    presentation: "memorial",
    text_lines: MEMORIAL_LINES,
    web_asset: "assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg",
    print_asset: "assets/normalized/advertisements/print/ADV-029-late-shri-bhakta-mohon-mitra-print.jpg",
    alt: "Portrait of Late Shri Bhakta Mohon Mitra",
    page_background: "#f3efe6",
    page_background_mode: "manual",
    page_ink: "auto",
    web_include: true,
    print_include: true,
    order: 790,
    editorial_status: "Approved",
    permission: "Print and web",
    verification: "verified",
    ...overrides,
  };
}

// Plain substring search (no dynamic RegExp construction — avoids the ReDoS
// pattern semgrep flags for ids interpolated into RegExp()).
function extractBetween(html, startMarker, endTag, label) {
  const startIdx = html.indexOf(startMarker);
  assert.ok(startIdx !== -1, `expected to find ${label}`);
  const tagOpenStart = html.lastIndexOf("<", startIdx);
  const endIdx = html.indexOf(endTag, startIdx);
  assert.ok(endIdx !== -1, `expected a closing ${endTag} after ${label}`);
  return html.slice(tagOpenStart, endIdx + endTag.length);
}

function extractArticle(html, id) {
  return extractBetween(html, `id="${id}"`, "</article>", `the <article> for ${id}`);
}

function extractPrintSection(html, id) {
  return extractBetween(html, `id="print-${id}"`, "</section>", `the <section> for print-${id}`);
}

function assertMemorialLinesInOrder(html, testidMarker) {
  const divIdx = html.indexOf(testidMarker);
  assert.ok(divIdx !== -1, `expected the ${testidMarker} block`);
  const divClose = html.indexOf("</div>", divIdx);
  const memorialHtml = html.slice(html.lastIndexOf("<div", divIdx), divClose + "</div>".length);

  const paragraphs = [...memorialHtml.matchAll(/<p([^>]*)>([^<]*)<\/p>/g)];
  assert.equal(paragraphs.length, 7, "expected exactly seven <p> lines in the memorial block");
  paragraphs.forEach(([, attrs, text], index) => {
    assert.equal(text, MEMORIAL_LINES[index], `line ${index} must match exactly and in order`);
    if (index === 1) {
      assert.ok(attrs.includes('class="ad-memorial__name"'), "the name line (text_lines[1]) must be emphasised");
    }
  });
  return memorialHtml;
}

async function main() {
  const env = buildEnv();
  const item = memorialFixture();

  // --- Web (index.njk) ---
  const webHtml = renderIndex(env, [item]);
  const article = extractArticle(webHtml, "ADV-029");

  assert.ok(
    article.includes("Advertisements · In memoriam · ADV-029"),
    "expected the memorial kicker override in the section-kicker"
  );
  assert.ok(!article.includes("Advertisements · ADV-029"), "the plain (non-memorial) kicker form must not also appear");

  // Figure with the uncropped image: present, alt from manifest, no target=_blank link.
  assert.ok(
    article.includes('<img src="assets/normalized/advertisements/web/ADV-029-late-shri-bhakta-mohon-mitra-web.jpg" alt="Portrait of Late Shri Bhakta Mohon Mitra"'),
    "expected the memorial <img> with src/alt from the manifest"
  );
  assert.ok(!article.includes('target="_blank"'), "the memorial image is not required to (and here must not) open in a new tab");

  // The seven text_lines, in order, exact text, name line emphasised.
  assertMemorialLinesInOrder(article, 'data-testid="ad-memorial-ADV-029"');

  assert.ok(!article.includes("With best compliments"), "memorial page must never carry the artwork-ad compliments wording");

  // --- Print (print.njk) ---
  const printHtml = renderPrint(env, [item]);
  const printSection = extractPrintSection(printHtml, "ADV-029");

  assert.ok(
    printSection.includes("Advertisements · In memoriam · ADV-029"),
    "expected the memorial kicker override on the print page"
  );
  assert.ok(
    printSection.includes('<img class="print-ad" src="../assets/normalized/advertisements/print/ADV-029-late-shri-bhakta-mohon-mitra-print.jpg" alt="Portrait of Late Shri Bhakta Mohon Mitra">'),
    "expected the memorial <img> on the print page with src/alt from the manifest"
  );
  assertMemorialLinesInOrder(printSection, 'data-testid="ad-memorial-ADV-029"');
  assert.ok(!printSection.includes("With best compliments"), "print memorial page must never carry the artwork-ad compliments wording");

  // --- Escaping: {{ line }} must never be rendered with | safe. ---
  const escapingItem = memorialFixture({
    id: "ADV-998",
    order: 998,
    text_lines: ["In fond memory of", "Late \"A & B\" <Co>", ...MEMORIAL_LINES.slice(2)],
    title: `${MEMORIAL_LINES[0]} Late "A & B" <Co>`,
  });
  const escapedWebHtml = renderIndex(env, [escapingItem]);
  const escapedArticle = extractArticle(escapedWebHtml, "ADV-998");
  assert.ok(
    escapedArticle.includes("Late &quot;A &amp; B&quot; &lt;Co&gt;"),
    "memorial line content must be HTML-escaped, not rendered with | safe"
  );
  assert.ok(!escapedArticle.includes("<Co>"), "raw unescaped markup must never reach the output");

  console.log("All ad-memorial-render.test.mjs integration tests passed.");
}

await main();
