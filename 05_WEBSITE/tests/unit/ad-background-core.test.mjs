// Unit test for scripts/ad-background-core.mjs — Sprint v3 Task 11. Hermetic.
import assert from "node:assert/strict";
import { edgeColourFromStats, manifestFieldsFor, edgeRegions, insertAdvertisementFields } from "../../scripts/ad-background-core.mjs";

const strip = (r, g, b) => ({ channels: [{ mean: r }, { mean: g }, { mean: b }] });

// Four identical edge strips → that colour.
assert.equal(edgeColourFromStats([strip(209, 205, 28), strip(209, 205, 28), strip(209, 205, 28), strip(209, 205, 28)]), "#d1cd1c");
// Averaging across strips of different colours, rounded per channel.
assert.equal(edgeColourFromStats([strip(0, 0, 0), strip(255, 255, 255), strip(0, 0, 0), strip(255, 255, 255)]), "#808080");
// Extra alpha channel in stats is ignored.
assert.equal(edgeColourFromStats([{ channels: [{ mean: 18 }, { mean: 21 }, { mean: 22 }, { mean: 255 }] }]), "#121516");
assert.throws(() => edgeColourFromStats([]), /no edge strips/i);

// Edge regions for a 1000×500 image at 2 % → 20 px tall / 20 px wide strips, never below 1 px.
assert.deepEqual(edgeRegions(1000, 500, 0.02), [
  { left: 0, top: 0, width: 1000, height: 10 },
  { left: 0, top: 490, width: 1000, height: 10 },
  { left: 0, top: 0, width: 20, height: 500 },
  { left: 980, top: 0, width: 20, height: 500 },
]);
assert.equal(edgeRegions(10, 10, 0.02)[0].height, 1, "strip is at least 1 px");

// Manifest fields derived from a sampled colour.
assert.deepEqual(manifestFieldsFor("#d1cd1c"), { page_background: "#d1cd1c", page_background_mode: "auto", page_ink: "dark" });
assert.deepEqual(manifestFieldsFor("#121516"), { page_background: "#121516", page_background_mode: "auto", page_ink: "light" });

// Targeted YAML insertion: fields go after the item's `notes:` line; existing values are replaced in place; other items untouched.
const yamlText = `items:
  - id: ADV-001
    type: advertisement
    notes: 'Tracker Item ID ADV-001.'
  - id: ADV-002
    type: advertisement
    notes: 'Tracker Item ID ADV-002.'
    page_background: '#000000'
    page_background_mode: manual
    page_ink: light
  - id: GAL-007
    type: gallery
    notes: 'x'
sponsor_acknowledgements: []
`;
const out = insertAdvertisementFields(yamlText, "ADV-001", manifestFieldsFor("#d1cd1c"));
assert.equal(out, `items:
  - id: ADV-001
    type: advertisement
    notes: 'Tracker Item ID ADV-001.'
    page_background: '#d1cd1c'
    page_background_mode: auto
    page_ink: dark
  - id: ADV-002
    type: advertisement
    notes: 'Tracker Item ID ADV-002.'
    page_background: '#000000'
    page_background_mode: manual
    page_ink: light
  - id: GAL-007
    type: gallery
    notes: 'x'
sponsor_acknowledgements: []
`);
assert.equal(insertAdvertisementFields(out, "ADV-001", manifestFieldsFor("#d1cd1c")), out, "re-inserting the same values is a no-op (idempotent)");
const replaced = insertAdvertisementFields(out, "ADV-001", manifestFieldsFor("#121516"));
assert.ok(replaced.includes("    page_background: '#121516'\n    page_background_mode: auto\n    page_ink: light\n  - id: ADV-002"), "existing auto values are replaced in place");
assert.ok(!replaced.includes("'#d1cd1c'"));
assert.throws(() => insertAdvertisementFields(yamlText, "ADV-999", manifestFieldsFor("#d1cd1c")), /ADV-999/);
console.log("All ad-background-core unit tests passed.");
