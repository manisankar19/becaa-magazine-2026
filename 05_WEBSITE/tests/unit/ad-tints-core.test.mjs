// Unit test for scripts/ad-tints-core.mjs — Sprint v5 Task 25 (PRD §11, Decision P). Hermetic.
import assert from "node:assert/strict";
import { adTint, adTintsStylesheet } from "../../scripts/ad-tints-core.mjs";
import { resolveInk } from "../../scripts/ad-presentation-core.mjs";

const ad = (over = {}) => ({ id: "ADV-001", type: "advertisement", web_include: true, page_background: "#b6e2f2", page_background_mode: "auto", page_ink: "auto", ...over });

// --- adTint: the same resolution as the old adPageStyle/adInkClass filters -------------------
{
  const t = adTint(ad());
  assert.deepEqual(t, { bg: "#b6e2f2", ink: resolveInk(ad()).colour, inkClass: `ad-ink--${resolveInk(ad()).ink}` });
  assert.equal(adTint(ad({ page_background_mode: "none" })), null, "mode none → no tint");
  assert.equal(adTint(ad({ page_background: "" })), null, "no background → no tint");
  assert.equal(adTint(ad({ page_background: "red; background:url(x)" })), null, "a non-hex value never becomes a tint");
  assert.equal(adTint(ad({ page_background_mode: "manual", page_background: "#F3EFE6" })).bg, "#F3EFE6", "manual tints kept as given");
}

// --- adTintsStylesheet: one rule per web-published advertisement with a tint ---------------
{
  const css = adTintsStylesheet([
    ad(),
    ad({ id: "ADV-002", page_background: "#873f3e" }),
    ad({ id: "ADV-003", web_include: false }),                 // not on the web: no rule
    ad({ id: "ADV-004", page_background_mode: "none" }),       // no tint: no rule
    { id: "GAL-001", type: "gallery", web_include: true, page_background: "#ffffff" }, // not an advertisement
  ]);
  const rules = css.split("\n").filter((l) => l.startsWith("#"));
  assert.equal(rules.length, 2);
  assert.equal(rules[0], `#ADV-001 { --ad-bg: #b6e2f2; --ad-ink: ${resolveInk(ad()).colour}; }`);
  assert.ok(rules[1].startsWith("#ADV-002 { --ad-bg: #873f3e; --ad-ink: "));
  assert.match(css, /^\/\* Generated/, "starts with a generated-file comment");
  // Hostile manifest values cannot inject CSS: an invalid id is refused loudly.
  assert.throws(() => adTintsStylesheet([ad({ id: "ADV-001} body{display:none" })]), /invalid advertisement id/);
}

console.log("ad-tints-core: all assertions passed");
