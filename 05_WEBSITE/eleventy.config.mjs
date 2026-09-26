import markdownIt from "markdown-it";
import yaml from "js-yaml";
import { adTint } from "./scripts/ad-tints-core.mjs";
import { sectionLabel, sectionNavigation } from "./scripts/navigation-core.mjs";

export default function eleventyConfig(config) {
  config.addDataExtension("yaml", (contents) => yaml.load(contents));
  config.addDataExtension("yml", (contents) => yaml.load(contents));
  config.addPassthroughCopy({ "src/assets": "assets" });
  // The print PDF is built locally (Playwright) and shipped from release-assets/ so the deployed site has it too.
  config.addPassthroughCopy({ "release-assets/print": "print" });

  const md = markdownIt({ html: true, linkify: false, typographer: true });
  // Sprint v5 Task 25 (PRD §11): markdown-it writes table-column alignment as an inline
  // `style="text-align:…"`, which the production CSP refuses. Emit an `align-*` class instead
  // (styled in site.css and print.css).
  for (const rule of ["th_open", "td_open"]) {
    md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const at = token.attrIndex("style");
      const align = at >= 0 ? /^text-align:(left|right|center)$/.exec(token.attrs[at][1]) : null;
      if (align) {
        token.attrs.splice(at, 1);
        token.attrJoin("class", `align-${align[1]}`);
      }
      return self.renderToken(tokens, idx, options);
    };
  }
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
  // Inline tint for print.njk only (the PDF is compiled without the site CSP); the website gets
  // the same values from the generated assets/css/ad-tints.css (Sprint v5 Task 25).
  config.addFilter("adPageStyle", (item = {}) => {
    const tint = adTint(item);
    return tint ? `--ad-bg: ${tint.bg}; --ad-ink: ${tint.ink};` : "";
  });
  config.addFilter("adInkClass", (item = {}) => adTint(item)?.inkClass ?? "");
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
