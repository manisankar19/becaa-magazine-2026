// Unit test for scripts/blocklist-guard-core.mjs — Sprint v5 Task 22 (PRD §11, Decision Q).
// Hermetic: filter text and HTML are fabricated.
import assert from "node:assert/strict";
import { extractGenericHideSelectors, findBlockedTokens, pageTokens } from "../../scripts/blocklist-guard-core.mjs";

// --- extractGenericHideSelectors: only site-wide `##.name` / `###name` rules --------------------
{
  const text = [
    "! Title: EasyList",
    "##.ad-frame",
    "##.ad-link",
    "###advertisement-top",
    "example.com##.site-only",          // domain-specific: ignored
    "example.com#@#.ad-frame",          // exception for one domain: ignored (the generic rule still applies elsewhere)
    "#@#.whitelisted",                  // generic exception: ignored
    "##div.ad-box",                     // element-qualified: not a bare class rule, ignored
    "##.ad-banner > img",               // compound selector: ignored
    "##a[href^=\"https://ads.\"]",      // attribute rule: ignored
    "||ads.example.com^",               // network rule: ignored
    "##.Ad-Label",                      // case kept (class names are case-sensitive)
    "  ##.padded  ",                    // surrounding whitespace tolerated
  ].join("\n");
  const { classes, ids } = extractGenericHideSelectors(text);
  assert.deepEqual([...classes].sort(), ["Ad-Label", "ad-frame", "ad-link", "padded"]);
  assert.deepEqual([...ids], ["advertisement-top"]);
}

// --- pageTokens: every class and id in the HTML --------------------------------------------------
{
  const html = `<article class="publication-item  publication-item--advertisement ad-ink--dark" id="ADV-001">
    <figure class='artwork-frame'><a class="artwork-link" href="x"><img src="x.jpg" alt=""></a></figure>
    <p class="section-kicker">K</p><div id="with-thanks" data-x="class=&quot;fake&quot;"></div></article>`;
  const { classes, ids } = pageTokens(html);
  assert.deepEqual([...classes].sort(), ["ad-ink--dark", "artwork-frame", "artwork-link", "publication-item", "publication-item--advertisement", "section-kicker"]);
  assert.deepEqual([...ids].sort(), ["ADV-001", "with-thanks"]);
}

// --- findBlockedTokens: the page's classes/ids that a generic rule would hide -------------------
{
  const selectors = extractGenericHideSelectors("##.ad-frame\n##.ad-link\n###banner-ad");
  const bad = findBlockedTokens(`<figure class="ad-frame x"><a class="ad-link"></a></figure><div id="banner-ad"></div>`, selectors);
  assert.deepEqual(bad, [{ kind: "class", name: "ad-frame" }, { kind: "class", name: "ad-link" }, { kind: "id", name: "banner-ad" }]);
  assert.deepEqual(findBlockedTokens(`<figure class="artwork-frame"><a class="artwork-link"></a></figure>`, selectors), []);
  // Substrings are not matches: a rule for "ad-frame" does not hide "ad-frame-container" or "artwork-frame".
  assert.deepEqual(findBlockedTokens(`<div class="ad-frame-container artwork-frame"></div>`, selectors), []);
}

console.log("blocklist-guard-core: all assertions passed");
