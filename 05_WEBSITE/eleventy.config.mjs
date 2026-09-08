import markdownIt from "markdown-it";
import yaml from "js-yaml";

export default function eleventyConfig(config) {
  config.addDataExtension("yaml", (contents) => yaml.load(contents));
  config.addDataExtension("yml", (contents) => yaml.load(contents));
  config.addPassthroughCopy({ "src/assets": "assets" });

  const md = markdownIt({ html: true, linkify: false, typographer: true });
  config.setLibrary("md", md);

  config.addFilter("markdown", (value = "") => md.render(value));
  config.addFilter("whereWeb", (items = []) => items.filter((item) => item.web_include));
  config.addFilter("byOrder", (items = []) => [...items].sort((a, b) => Number(a.order) - Number(b.order)));
  config.addFilter("byline", (item = {}) => {
    const details = [item.contributor];
    if (item.branch) details.push(item.branch);
    if (item.passing_year) details.push(`${item.passing_year} Batch`);
    let line = details.filter(Boolean).join(", ");
    if (item.designation) line += `${line ? " — " : ""}${item.designation}`;
    return line;
  });
  config.addFilter("sectionLabel", (value = "") => {
    const labels = { messages: "Messages", articles: "Articles", events: "Events", gallery: "Gallery", advertisements: "Advertisements" };
    return labels[value] || value;
  });

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
