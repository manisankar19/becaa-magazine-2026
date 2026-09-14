// Pure builders for the advertisement-background review sheet (Sprint v3 Task 16). No I/O.

export function swatchSvg(background, inkColour, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="48" viewBox="0 0 120 48"><rect width="120" height="48" rx="6" fill="${background}"/><text x="60" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${inkColour}">${label}</text></svg>`;
}

// entries: [{ id, title, page_background, page_background_mode, ink, inkColour, ratio, pdfPage, pdfImage, webImage }]
// Image paths are relative to qa-output/; the sheet lives in qa-output/ad-backgrounds/, hence "../".
export function buildReviewMarkdown(entries, { generated, contactSheet }) {
  const rows = entries.map((e) => {
    const mode = e.page_background_mode === "manual" ? "**manual**" : e.page_background_mode;
    return `| ${e.id} | ${e.title} | ![swatch](swatches/${e.id}.svg) \`${e.page_background}\` | ${mode} | ${e.ink} (\`${e.inkColour}\`) | ${e.ratio.toFixed(2)} | p.${e.pdfPage} [![pdf](../${e.pdfImage})](../${e.pdfImage}) | [![web](../${e.webImage})](../${e.webImage}) |`;
  });
  return [
    "# Advertisement page backgrounds — review sheet",
    "",
    `Generated: ${generated}`,
    "",
    "One row per published advertisement (Sprint v3, sprints/v3/PRD.md §4.4). The swatch is the page tint from `publication.yaml`; ink is the resolved heading colour and its WCAG contrast ratio against the tint (≥ 4.50 required). Thumbnails link to the rendered A4 PDF page and the desktop web card. Manual overrides are marked in bold.",
    "",
    `Contact sheet of all rendered PDF pages: [${contactSheet.split("/").pop()}](${contactSheet.split("/").pop()})`,
    "",
    "| ID | Title | Tint | Mode | Ink | Contrast | PDF page | Web card |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "Checklist per row: heading and kicker readable; page number visible on white; artwork complete, centred, undistorted; tint restrained and matched to the artwork.",
    "",
  ].join("\n");
}

// Grid positions for n thumbnails of thumbW×thumbH in `cols` columns with `gap` padding.
export function contactSheetLayout(n, thumbW, thumbH, cols, gap) {
  const positions = [];
  for (let i = 0; i < n; i++) {
    positions.push({ left: gap + (i % cols) * (thumbW + gap), top: gap + Math.floor(i / cols) * (thumbH + gap) });
  }
  const rowsUsed = Math.ceil(n / cols);
  return { positions, width: gap + cols * (thumbW + gap), height: gap + rowsUsed * (thumbH + gap) };
}
