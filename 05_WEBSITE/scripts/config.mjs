export const config = {
  requiredFields: [
    "id",
    "type",
    "title",
    "language",
    "section",
    "order",
    "source_file",
    "source_fingerprint",
    "permission",
    "editorial_status",
    "verification",
    "web_include",
    "print_include",
    "alt"
  ],
  allowedTypes: ["message", "article", "advertisement", "gallery", "event"],
  allowedLanguages: ["en", "bn", "mixed"],
  print: {
    minDpi: 180,
    targetDpi: 300,
    a4WidthPxAt300Dpi: 2480
  },
  // Sprint v3 — advertisement page presentation (sprints/v3/PRD.md §4.4).
  advertisementPage: {
    backgroundModes: ["auto", "manual", "none"],
    inkModes: ["auto", "dark", "light"],
    edgeSampleFraction: 0.02,   // width/height fraction of each edge strip sampled for the auto colour
    minContrastRatio: 4.5,      // WCAG AA for heading/kicker/caption text on the tinted page
    // Sprint v4 — advertisement content presentation kinds (sprints/v4/PRD.md §5, Decision E).
    presentations: ["artwork", "text", "memorial"]
  }
};
