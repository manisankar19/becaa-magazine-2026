// Sprint v3 Task 24 — the Markdown under src/content/ is publication *data*, read by
// src/_data/publicationContent.js and rendered inside index.njk / print.njk. Eleventy must
// not also emit each file as its own page under /content/…, because those pages would sit
// outside the registration gate (PRD §5.2).
export default {
  permalink: false,
  eleventyExcludeFromCollections: true,
};
