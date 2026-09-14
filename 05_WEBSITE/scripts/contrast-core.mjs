// Pure WCAG 2.x contrast maths (Sprint v3 Task 10). No I/O.
// Ink tokens mirror src/assets/css/site.css: --ink and --paper.
export const INK_DARK = "#20201d";
export const INK_LIGHT = "#fbfaf7";
export const AA_MIN_RATIO = 4.5;

export function isHexColour(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? ""));
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  if (!isHexColour(hex)) throw new Error(`relativeLuminance: not a #rrggbb hex colour: ${hex}`);
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Resolve the exact ink colour for a family ("dark" | "light") on a background:
// the palette token when it reaches AA, otherwise pure black / pure white,
// which always reach ≥ 4.58:1 against any colour (worst case at L ≈ 0.18).
export function resolveInkColour(background, family) {
  const token = family === "dark" ? INK_DARK : INK_LIGHT;
  const tokenRatio = contrastRatio(background, token);
  if (tokenRatio >= AA_MIN_RATIO) return { ink: family, colour: token, ratio: tokenRatio };
  const pure = family === "dark" ? "#000000" : "#ffffff";
  return { ink: family, colour: pure, ratio: contrastRatio(background, pure) };
}

// Prefer the dark family (palette ink) when it reaches AA; otherwise the light
// family. Either way the returned colour reaches AA on the background.
export function chooseInk(background) {
  const dark = resolveInkColour(background, "dark");
  if (dark.ratio >= AA_MIN_RATIO) return dark;
  const light = resolveInkColour(background, "light");
  return light.ratio >= dark.ratio ? light : dark;
}
