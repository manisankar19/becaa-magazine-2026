// Integration test for text-only advertisement rendering — Sprint v4 Task 10
// (sprints/v4/PRD.md §4.3, Decisions F, G).
//
// Rendering approach: this repo depends on @11ty/eleventy (not bare
// `nunjucks`) and has no existing "render one template in isolation" helper.
// A full Eleventy programmatic build against a temp site copy was considered,
// but the fallback documented in the task brief is more robust here: import
// `nunjucks` directly (it is hoisted into node_modules transitively via
// Eleventy) and render the real `src/index.njk` / `src/print.njk` source
// text (with its Eleventy front matter stripped) through a Nunjucks
// Environment registered with the *actual* filter implementations from
// `eleventy.config.mjs` (via a tiny addFilter-collecting shim). This tests
// the real template logic and the real filter code with a constructed
// fixture context, without needing a full Eleventy build (which would also
// require standing up layouts, passthrough copies and a temp output dir).
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

// Fixture item shaped to satisfy Task 9's validateAdvertisementPresentation
// rules for presentation: "text" (sprints/v4/PRD.md §5).
function textAdFixture(overrides = {}) {
  return {
    id: "ADV-028",
    type: "advertisement",
    section: "advertisements",
    title: "We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate",
    contributor: "M/s Balajee Infrate",
    presentation: "text",
    text_lines: ["We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate"],
    web_asset: "",
    print_asset: "",
    alt: "",
    page_background: "#f3efe6",
    page_background_mode: "manual",
    page_ink: "auto",
    web_include: true,
    print_include: true,
    order: 780,
    editorial_status: "Approved",
    permission: "Print and web",
    verification: "verified",
    ...overrides,
  };
}

// Plain substring search (no dynamic RegExp construction) so the id — even
// though it only ever comes from our own fixtures — can never be interpreted
// as regex syntax.
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

async function main() {
  const env = buildEnv();

  // --- Web (index.njk) ---
  const item = textAdFixture();
  const webHtml = renderIndex(env, [item]);
  const article = extractArticle(webHtml, "ADV-028");

  assert.ok(
    !/<img\b/i.test(article),
    "text-only advertisement card must not render an <img> element"
  );
  assert.ok(
    article.includes(
      '<p class="ad-text" data-testid="ad-text-ADV-028">We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate</p>'
    ),
    "expected the exact approved sentence in a .ad-text paragraph with the id-scoped data-testid"
  );
  // The content region (between the shared item-header and item-footer) is
  // the presentation-specific branch under test: it must contain the ad-text
  // paragraph and nothing else — no address, slogan, contact or other
  // invented company text. (The item-header's <h2> legitimately repeats the
  // same sentence too, since Task 9's validator requires title === text_lines[0]
  // for presentation: "text" — that is a data invariant, not a duplication bug.)
  const webContentRegion = article.split("</header>")[1].split("<footer")[0].trim();
  assert.equal(
    webContentRegion,
    '<p class="ad-text" data-testid="ad-text-ADV-028">We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate</p>',
    "the card content region must contain only the ad-text paragraph, no other company text"
  );
  assert.ok(!article.includes("With best compliments"), "text pages must not carry the artwork-ad compliments wording");

  // --- Print (print.njk) ---
  const printHtml = renderPrint(env, [item]);
  const printSection = extractPrintSection(printHtml, "ADV-028");
  assert.ok(!/<img\b/i.test(printSection), "text-only advertisement print page must not render an <img> element");
  assert.ok(
    printSection.includes(
      '<p class="ad-text" data-testid="ad-text-ADV-028">We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate</p>'
    ),
    "expected the exact approved sentence in the print page's .ad-text paragraph"
  );
  const printContentRegion = printSection.split("</h1>")[1].split("</section>")[0].trim();
  assert.equal(
    printContentRegion,
    '<p class="ad-text" data-testid="ad-text-ADV-028">We support BECAA Maharashtra for their noble causes. With warm wishes M/s Balajee Infrate</p>',
    "the print page content region must contain only the ad-text paragraph, no other company text"
  );

  // --- Escaping: {{ text_lines[0] }} must never be rendered with | safe. ---
  const escapingItem = textAdFixture({
    id: "ADV-999",
    title: "Best Compliment from A & B <Co>",
    contributor: "A & B <Co>",
    text_lines: ["Best Compliment from A & B <Co>"],
    order: 999,
  });
  const escapedWebHtml = renderIndex(env, [escapingItem]);
  const escapedArticle = extractArticle(escapedWebHtml, "ADV-999");
  assert.ok(
    escapedArticle.includes("Best Compliment from A &amp; B &lt;Co&gt;"),
    "ad-text content must be HTML-escaped, not rendered with | safe"
  );
  assert.ok(!escapedArticle.includes("<Co>"), "raw unescaped markup must never reach the output");

  console.log("All ad-text-render.test.mjs integration tests passed.");
}

await main();
