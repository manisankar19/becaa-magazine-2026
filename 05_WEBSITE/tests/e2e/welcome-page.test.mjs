// Playwright E2E for Sprint v3 Task 25 — the public /welcome/ landing page.
// Requires `npm run build`. Serves _site/ over http and intercepts /api/register so the
// client-side flow (field errors, success redirect) can be exercised without a database.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { siteRoot } from "../../scripts/lib.mjs";
import { startStaticServer } from "./static-server.mjs";

const registration = JSON.parse(fs.readFileSync(path.join(siteRoot, "src", "_data", "registration.json"), "utf8"));
const html = fs.readFileSync(path.join(siteRoot, "_site", "welcome", "index.html"), "utf8");

// --- static checks on the built page ---
assert.ok(!/With best compliments from/.test(html), "no advertisement titles on the public page");
assert.ok(!/assets\/normalized\/(advertisements|images)\//.test(html), "no protected artwork referenced");
assert.ok(!/print\//.test(html), "no link to the print edition");
assert.ok(/assets\/normalized\/cover\//.test(html), "cover artwork is shown");
assert.ok(html.includes("31 December 2027"), "retention date in the privacy notice");
assert.ok(html.includes("becaa.maharashtra@gmail.com"), "contact address for data requests");
assert.ok(!/<script>[^<]*[^\s][^<]*<\/script>/.test(html), "no inline scripts (strict CSP)");
for (const d of registration.departments) assert.ok(html.includes(`<option value="${d.replace(/&/g, "&amp;")}">`), `department option: ${d}`);

const { server, baseUrl } = await startStaticServer(path.join(siteRoot, "_site"));
const browser = await chromium.launch();
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1100 }, { name: "mobile", width: 390, height: 1200 }]) {
    const page = await browser.newPage({ viewport });
    let lastPost = null;
    await page.route("**/api/register", async (route) => {
      const req = route.request();
      lastPost = { headers: req.headers(), body: JSON.parse(req.postData() ?? "{}") };
      if (lastPost.body.email === "bad@example.org") {
        return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, errors: { email: "Please enter a valid email address.", consent: "Please confirm you agree to the privacy notice." } }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.route(`${baseUrl}/`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>magazine</title><h1 data-testid=\"magazine\">magazine</h1>" }));

    await page.goto(`${baseUrl}/welcome/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task25-01-${viewport.name}-welcome.png`), fullPage: true });

    // Content
    assert.equal(await page.locator('[data-testid="welcome-title"]').textContent(), "একই শিকড়");
    assert.ok((await page.locator('[data-testid="welcome-subtitle"]').textContent()).includes("BECAA Maharashtra Magazine"));
    assert.ok((await page.locator('[data-testid="privacy-notice"]').textContent()).includes("31 December 2027"));
    assert.equal(await page.locator('[data-testid="cover-art"]').count(), 1);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    assert.ok(noOverflow, `${viewport.name}: no horizontal overflow`);

    // Conditional fieldsets follow the category
    const alumniSet = page.locator('[data-testid="fieldset-alumni"]');
    const sponsorSet = page.locator('[data-testid="fieldset-sponsor"]');
    assert.equal(await alumniSet.isVisible(), false, "alumni fields hidden until a category is chosen");
    await page.getByTestId("category-alumni").check();
    assert.equal(await alumniSet.isVisible(), true);
    assert.equal(await sponsorSet.isVisible(), false);
    assert.equal(await page.getByTestId("batch-year").getAttribute("required"), "", "batch year required for alumni");
    await page.getByTestId("category-sponsor").check();
    assert.equal(await alumniSet.isVisible(), false);
    assert.equal(await sponsorSet.isVisible(), true);
    assert.equal(await page.getByTestId("organisation").getAttribute("required"), "", "organisation required for sponsors");
    assert.equal(await page.getByTestId("mobile").getAttribute("required"), "", "mobile required for sponsors");
    await page.getByTestId("category-guest").check();
    assert.equal(await sponsorSet.isVisible(), true, "guests share the organisation/mobile fieldset");
    assert.equal(await page.getByTestId("organisation").getAttribute("required"), null, "optional for guests");
    assert.equal(await page.getByTestId("mobile").getAttribute("required"), null, "optional for guests");

    // Department "Other" reveals the free-text field
    await page.getByTestId("category-alumni").check();
    assert.equal(await page.getByTestId("department-other").isVisible(), false);
    await page.getByTestId("department").selectOption("Other");
    assert.equal(await page.getByTestId("department-other").isVisible(), true);
    await page.getByTestId("department").selectOption("Civil Engineering");
    assert.equal(await page.getByTestId("department-other").isVisible(), false);

    // Honeypot is not visible; form_started_at populated by JS
    const hp = await page.locator('input[name="website"]').boundingBox(); // off-screen on purpose (bots still fill it)
    assert.ok(hp === null || hp.x + hp.width < 0, "honeypot is positioned outside the viewport");
    assert.equal(await page.locator(".hp").getAttribute("aria-hidden"), "true", "honeypot hidden from assistive technology");
    const started = Number(await page.locator('input[name="form_started_at"]').inputValue());
    assert.ok(started > Date.now() - 60_000 && started <= Date.now(), "form_started_at set on load");

    // Server-side field errors are shown next to the fields, nothing else changes
    await page.getByTestId("name").fill("Test Person");
    await page.getByTestId("email").fill("bad@example.org");
    await page.getByTestId("batch-year").fill("1992");
    await page.getByTestId("consent").check();
    await page.getByTestId("submit").click();
    await page.getByTestId("error-email").waitFor({ state: "visible" });
    assert.ok((await page.getByTestId("error-email").textContent()).includes("valid email"));
    assert.ok((await page.getByTestId("error-consent").textContent()).includes("privacy notice"));
    assert.equal(lastPost.headers["content-type"], "application/json", "JS path posts JSON");
    assert.equal(lastPost.body.category, "alumni");
    assert.equal(lastPost.body.batch_year, "1992");
    assert.equal(lastPost.body.consent, true);
    assert.ok(!("organisation" in lastPost.body) || lastPost.body.organisation === "", "hidden fieldset values are not posted as sponsor data");
    await page.screenshot({ path: path.join(siteRoot, "tests", "screenshots", `task25-02-${viewport.name}-errors.png`), fullPage: true });
    assert.equal(page.url(), `${baseUrl}/welcome/`, "stays on the page after an error");

    // Success redirects to the magazine
    await page.getByTestId("email").fill("good@example.org");
    await page.getByTestId("submit").click();
    await page.waitForURL(`${baseUrl}/`);
    assert.equal(await page.getByTestId("magazine").count(), 1);
    await page.close();
  }
  console.log("PASS: /welcome/ landing page — content, privacy notice, conditional fields, honeypot, field errors, success redirect (desktop + mobile).");
} finally {
  await browser.close();
  server.close();
}
