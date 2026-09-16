// Integration test for the primary navigation in the base layout — Sprint v4 Task 18
// (sprints/v4/PRD.md §4.6). Renders the real `layouts/base.njk` through a Nunjucks
// Environment registered with the actual filters from `eleventy.config.mjs` (same
// approach as ad-text-render.test.mjs), once with the real manifest and once with a
// hermetic fixture, and checks that `public.njk` (welcome/admin) carries no nav.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import eleventyConfig from "../../eleventy.config.mjs";
import { readManifest } from "../../scripts/lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");
const includes = path.join(siteRoot, "src", "_includes");

const filters = {};
eleventyConfig({ addDataExtension() {}, addPassthroughCopy() {}, setLibrary() {}, addFilter(name, fn) { filters[name] = fn; } });
assert.equal(typeof filters.sectionNav, "function", "eleventy.config.mjs registers a sectionNav filter");
assert.equal(filters.sectionLabel("advertisements"), "Advertisements", "sectionLabel keeps its Sprint v3 behaviour");
assert.equal(filters.sectionLabel("souvenirs"), "souvenirs", "sectionLabel falls back to the raw key");

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(includes), { autoescape: true });
for (const [name, fn] of Object.entries(filters)) env.addFilter(name, fn);

function navLinks(html) {
  const nav = html.match(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/);
  assert.ok(nav, "base layout renders a <nav>");
  assert.match(nav[1], /aria-label="Primary"/, "nav keeps aria-label=\"Primary\"");
  assert.match(nav[1], /data-testid="primary-nav"/, "nav carries data-testid=\"primary-nav\"");
  return [...nav[2].matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], label: m[2].trim() }));
}
const render = (publication) => env.render("layouts/base.njk", { title: "Fixture", content: "<p>body</p>", publication });

// --- Real manifest: eight links, once each, approved order -----------------
{
  const publication = readManifest();
  const links = navLinks(render(publication));
  assert.deepEqual(links.map((l) => l.label), ["Contents", "Messages", "Articles", "Gallery", "Advertisements", "Cultural Programmes", "Connect", "With Thanks"], "eight labels in the approved order");
  const published = publication.items.filter((i) => i.web_include).sort((a, b) => Number(a.order) - Number(b.order));
  for (const [label, section] of [["Messages", "messages"], ["Articles", "articles"], ["Gallery", "gallery"], ["Advertisements", "advertisements"]]) {
    const first = published.find((i) => i.section === section);
    assert.equal(links.find((l) => l.label === label).href, `#${first.id}`, `${label} points at the first published ${section} item (${first.id})`);
  }
  assert.ok(links.every((l) => l.href.length > 1 && l.href.startsWith("#")), "every href is a non-empty in-page anchor");
}

// --- Fixture: extra items add no links; unpublished items are ignored ------
{
  const it = (id, section, order, web_include = true) => ({ id, section, order, web_include });
  const publication = {
    sponsor_acknowledgement_message: "",
    items: [
      it("ADV-900", "advertisements", 5, false), // unpublished — must not become a target
      it("ART-002", "articles", 20), it("MSG-001", "messages", 10), it("ART-003", "articles", 30), it("ART-004", "articles", 40),
      it("GAL-001", "gallery", 50), it("ADV-001", "advertisements", 60), it("ADV-002", "advertisements", 70), it("ADV-003", "advertisements", 80),
    ],
  };
  const links = navLinks(render(publication));
  assert.deepEqual(links, [
    { href: "#contents", label: "Contents" },
    { href: "#MSG-001", label: "Messages" },
    { href: "#ART-002", label: "Articles" },
    { href: "#GAL-001", label: "Gallery" },
    { href: "#ADV-001", label: "Advertisements" },
    { href: "#cultural-programmes", label: "Cultural Programmes" },
    { href: "#connect", label: "Connect" },
  ], "sorted by order, filtered to web_include, one link per section, no With Thanks without the message");
}

// --- welcome/admin layout has no primary navigation ------------------------
{
  const publicLayout = fs.readFileSync(path.join(includes, "layouts", "public.njk"), "utf8");
  assert.ok(!/<nav\b/.test(publicLayout), "public.njk (welcome, admin) has no <nav>");
  for (const page of ["welcome.njk", "admin.njk"]) {
    const src = fs.readFileSync(path.join(siteRoot, "src", page), "utf8");
    assert.match(src, /^layout: layouts\/public\.njk$/m, `${page} still uses the public layout`);
  }
}

console.log("base-nav-render: all assertions passed");
