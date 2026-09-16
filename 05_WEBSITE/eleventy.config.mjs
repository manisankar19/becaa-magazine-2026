import markdownIt from "markdown-it";
import yaml from "js-yaml";
import { resolveInk } from "./scripts/ad-presentation-core.mjs";
import { sectionLabel, sectionNavigation } from "./scripts/navigation-core.mjs";

export default function eleventyConfig(config) {
  config.addDataExtension("yaml", (contents) => yaml.load(contents));
  config.addDataExtension("yml", (contents) => yaml.load(contents));
  config.addPassthroughCopy({ "src/assets": "assets" });
  // The print PDF is built locally (Playwright) and shipped from release-assets/ so the deployed site has it too.
  config.addPassthroughCopy({ "release-assets/print": "print" });

  const md = markdownIt({ html: true, linkify: false, typographer: true });
  config.setLibrary("md", md);

  config.addFilter("markdown", (value = "") => md.render(value));
  config.addFilter("whereWeb", (items = []) => items.filter((item) => item.web_include));
  config.addFilter("byOrder", (items = []) => [...items].sort((a, b) => Number(a.order) - Number(b.order)));
  config.addFilter("byline", (item = {}) => {
    // Sprint v4 Decision R: display_name is the reader-facing name (e.g. "Late …");
    // contributor stays the provenance/audit identity.
    const displayName = typeof item.display_name === "string" && item.display_name.trim() ? item.display_name : item.contributor;
    const details = [displayName];
    if (item.branch) details.push(item.branch);
    if (item.passing_year) details.push(`${item.passing_year} Batch`);
    let line = details.filter(Boolean).join(", ");
    if (item.designation) line += `${line ? " — " : ""}${item.designation}`;
    return line;
  });
  // Sprint v3 §4.4: per-advertisement page tint. Returns "" for items without a
  // background so the template can drop the style attribute entirely.
  config.addFilter("adPageStyle", (item = {}) => {
    const ink = resolveInk(item);
    if (!ink || (item.page_background_mode ?? "auto") === "none") return "";
    return `--ad-bg: ${item.page_background}; --ad-ink: ${ink.colour};`;
  });
  config.addFilter("adInkClass", (item = {}) => {
    const ink = resolveInk(item);
    if (!ink || (item.page_background_mode ?? "auto") === "none") return "";
    return `ad-ink--${ink.ink}`;
  });
  config.addFilter("sectionLabel", (value = "") => sectionLabel(value));
  // Sprint v4 §4.6: one primary-nav link per section (first published item), not one per item.
  config.addFilter("sectionNav", (items = [], hasThanks = false) => sectionNavigation(items, { hasThanks: Boolean(hasThanks) }));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
