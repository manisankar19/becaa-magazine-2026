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
  }
};
