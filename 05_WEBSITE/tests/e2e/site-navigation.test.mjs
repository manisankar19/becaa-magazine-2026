// Playwright E2E for Sprint v4 Task 19 — the primary navigation shows one link per
// section (sprints/v4/PRD.md §4.6, Decision I). Requires `npm run build` first.
// Serves _site/ over http (static-server pattern) and checks, at 390, 820 and 1440 px:
// exactly eight links in order, valid in-page targets, first-published-item
// destinations computed from the manifest, click-to-scroll, no horizontal overflow,
// no overlap with the brand link, and keyboard reachability with a visible focus style.
// Screenshots: qa-output/navigation/{mobile,tablet,desktop}.png
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { readManifest, siteRoot } from "../../scripts/lib.mjs";
import { startStaticServer } from "./static-server.mjs";

const manifest = readManifest();
const published = manifest.items.filter((i) => i.web_include).sort((a, b) => Number(a.order) - Number(b.order));
const firstOf = (section) => published.find((i) => i.section === section);
const expectedLabels = ["Contents", "Messages", "Articles", "Gallery", "Advertisements", "Cultural Programmes", "Connect", "With Thanks"];
const expectedHrefs = {
  Contents: "#contents",
  Messages: `#${firstOf("messages").id}`,
  Articles: `#${firstOf("articles").id}`,
  Gallery: `#${firstOf("gallery").id}`,
  Advertisements: `#${firstOf("advertisements").id}`,
  "Cultural Programmes": "#cultural-programmes",
  Connect: "#connect",
  "With Thanks": "#with-thanks",
};
assert.ok(manifest.sponsor_acknowledgement_message, "fixture assumption: the manifest has a sponsor acknowledgement message, so With Thanks is expected");
assert.equal(published.length, 47, "47 published items (44 + 3 Sprint v4 advertisements)");

const screenshotDir = path.join(siteRoot, "qa-output", "navigation");
fs.mkdirSync(screenshotDir, { recursive: true });

const { server, baseUrl } = await startStaticServer(path.join(siteRoot, "_site"));
const browser = await chromium.launch();
try {
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "tablet", width: 820, height: 1180 }, { name: "desktop", width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    // Smooth scrolling (site.css) would make the scroll-into-view check timing-dependent.
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
    const tag = (msg) => `${viewport.name} (${viewport.width}px): ${msg}`;

    const nav = page.getByTestId("primary-nav");
    assert.equal(await nav.count(), 1, tag("exactly one primary nav"));
    assert.equal(await nav.getAttribute("aria-label"), "Primary", tag("aria-label kept"));
    const links = nav.getByRole("link");
    assert.equal(await links.count(), 8, tag("exactly eight links"));

    const found = await links.evaluateAll((els) => els.map((a) => ({ label: a.textContent.trim(), href: a.getAttribute("href") })));
    assert.deepEqual(found.map((l) => l.label), expectedLabels, tag("labels once each, in the approved order"));
    for (const { label, href } of found) {
      assert.ok(href && href.length > 1, tag(`${label}: href non-empty`));
      assert.equal(href, expectedHrefs[label], tag(`${label}: href points at ${expectedHrefs[label]}`));
      assert.ok(await page.evaluate((h) => document.querySelector(h) !== null, href), tag(`${label}: target ${href} exists`));
    }

    // Layout: no horizontal overflow; nav does not overlap the brand link.
    const layout = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        brand: box(document.querySelector(".site-header .brand")),
        nav: box(document.querySelector('[data-testid="primary-nav"]')),
        linkBoxes: [...document.querySelectorAll('[data-testid="primary-nav"] a')].map(box),
      };
    });
    assert.ok(layout.scrollWidth <= layout.clientWidth, tag(`no horizontal overflow (scrollWidth ${layout.scrollWidth} <= clientWidth ${layout.clientWidth})`));
    const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    assert.ok(!overlaps(layout.brand, layout.nav), tag("nav does not overlap the brand link"));
    for (const [i, lb] of layout.linkBoxes.entries()) {
      assert.ok(lb.right <= layout.clientWidth + 0.5 && lb.left >= -0.5, tag(`link ${expectedLabels[i]} fully inside the viewport horizontally`));
    }

    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}.png`) });

    // Keyboard: Tab from the top of the document reaches each nav link in order, and
    // the focused link looks different from its unfocused state.
    const unfocused = await links.evaluateAll((els) => els.map((a) => { const s = getComputedStyle(a); return `${s.backgroundColor}|${s.color}|${s.outlineStyle}`; }));
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    const reached = [];
    for (let presses = 0; presses < 20 && reached.length < 8; presses++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || !a.closest('[data-testid="primary-nav"]')) return null;
        const s = getComputedStyle(a);
        return { label: a.textContent.trim(), style: `${s.backgroundColor}|${s.color}|${s.outlineStyle}` };
      });
      if (focused) reached.push(focused);
    }
    assert.deepEqual(reached.map((r) => r.label), expectedLabels, tag("Tab reaches each nav link in order"));
    for (const [i, r] of reached.entries()) assert.notEqual(r.style, unfocused[i], tag(`${r.label}: visible focus style`));
    if (viewport.name === "desktop") {
      await page.keyboard.press("Shift+Tab"); // leave focus on a mid-nav link for the evidence shot
      await page.screenshot({ path: path.join(screenshotDir, "desktop-focus.png"), clip: { x: 0, y: 0, width: viewport.width, height: 120 } });
    }
    await page.evaluate(() => document.activeElement?.blur());

    // Clicking each link scrolls its target into view.
    for (const { label, href } of found) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByTestId("primary-nav").getByRole("link", { name: label, exact: true }).click();
      await page.waitForFunction((h) => location.hash === h, href);
      const inView = await page.evaluate((h) => {
        const r = document.querySelector(h).getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, vh: window.innerHeight, atBottom: Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1 };
      }, href);
      assert.ok(inView.top < inView.vh && inView.bottom > 0, tag(`${label}: ${href} is in the viewport after click (top ${Math.round(inView.top)}, bottom ${Math.round(inView.bottom)})`));
      if (!inView.atBottom) assert.ok(inView.top <= 2, tag(`${label}: ${href} scrolled to the top of the viewport (top ${Math.round(inView.top)})`));
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`site-navigation: 8 links verified at 390/820/1440 px; screenshots in ${path.relative(siteRoot, screenshotDir)}/`);
