// Unit test for scripts/contrast-core.mjs — Sprint v3 Task 10. Hermetic.
import assert from "node:assert/strict";
import { relativeLuminance, contrastRatio, chooseInk, resolveInkColour, INK_DARK, INK_LIGHT, isHexColour, rgbToHex } from "../../scripts/contrast-core.mjs";

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

close(relativeLuminance("#000000"), 0, 1e-9, "black luminance");
close(relativeLuminance("#ffffff"), 1, 1e-9, "white luminance");
close(relativeLuminance("#808080"), 0.2159, 0.001, "mid grey luminance (WCAG reference)");
close(contrastRatio("#000000", "#ffffff"), 21, 1e-9, "black/white contrast");
close(contrastRatio("#ffffff", "#000000"), 21, 1e-9, "order-independent");
close(contrastRatio("#777777", "#ffffff"), 4.48, 0.01, "#777777 on white is just under AA (WCAG reference value 4.48)");
close(contrastRatio("#767676", "#ffffff"), 4.54, 0.01, "#767676 on white passes AA (4.54)");

assert.equal(INK_DARK, "#20201d", "dark ink is the site's --ink token");
assert.equal(INK_LIGHT, "#fbfaf7", "light ink is the site's --paper token");
assert.equal(chooseInk("#d1cd1c").ink, "dark", "Eframe yellow takes dark ink");
assert.equal(chooseInk("#121516").ink, "light", "near-black takes light ink");
assert.equal(chooseInk("#28d4c79".slice(0, 7)).ink, "dark");
assert.equal(chooseInk("#873f3e").ink, "light", "dark maroon takes light ink");
assert.ok(chooseInk("#873f3e").ratio >= 4.5, "chosen ink always reaches 4.5:1");
for (const hex of ["#000000", "#ffffff", "#7b7b7b", "#585858", "#2f6652", "#c8862f", "#58d6db", "#8b8c8a"]) {
  const r = chooseInk(hex);
  assert.ok(r.ratio >= 4.5, `some ink must always reach AA on ${hex} (got ${r.ratio.toFixed(2)})`);
  assert.equal(r.ratio, contrastRatio(hex, r.colour), "reported ratio is for the reported colour");
}
assert.equal(chooseInk("#d1cd1c").colour, INK_DARK, "palette ink is used when it reaches AA");
assert.equal(chooseInk("#7b7b7b").colour, "#000000", "mid grey: palette tokens both fall short, pure black is used (4.88:1)");
assert.equal(chooseInk("#585858").colour, INK_LIGHT, "dark grey: palette paper reaches AA");
assert.equal(resolveInkColour("#7b7b7b", "light").colour, "#ffffff", "manual light family on mid grey falls back to pure white");
assert.ok(resolveInkColour("#7b7b7b", "light").ratio < 4.5, "…but still fails AA there, so the validator must reject that override");
assert.ok(isHexColour("#a1B2c3") && !isHexColour("a1b2c3") && !isHexColour("#abc") && !isHexColour("#gggggg") && !isHexColour(""), "hex validation");
assert.equal(rgbToHex(209, 205, 28), "#d1cd1c");
assert.equal(rgbToHex(0, 0, 0), "#000000");
assert.throws(() => relativeLuminance("nope"), /hex/i);
console.log("All contrast-core unit tests passed.");
