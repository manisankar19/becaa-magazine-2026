// Sprint v5 Task 24 (PRD §11, Decision Q): the built pages must run under the production
// Content-Security-Policy (vercel.json) without a single violation. On 2026-09-26 the magazine
// page's inline `style="--ad-bg: …"` attributes were silently refused in production, so no
// advertisement card showed its tint. Serves _site/ with the vercel.json headers
// (tests/e2e/static-server.mjs). Requires `npm run build`.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { siteRoot } from "../../scripts/lib.mjs";
import { startStaticServer } from "./static-server.mjs";

const outDir = path.join(siteRoot, "qa-output", "csp");
fs.mkdirSync(outDir, { recursive: true });
const { server, baseUrl } = await startStaticServer(path.join(siteRoot, "_site"));
const browser = await chromium.launch();
const report = [];
try {
  for (const route of ["/", "/welcome/", "/admin/"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const violations = [];
    page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text().slice(0, 200)); });
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) => window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI || "inline"} ${e.sample || ""}`.trim()));
    });
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const csp = response.headers()["content-security-policy"];
    assert.ok(csp && csp.includes("default-src 'self'"), `${route}: served with the production CSP (${csp})`);
    violations.push(...(await page.evaluate(() => window.__cspViolations)));
    await page.screenshot({ path: path.join(outDir, `${route === "/" ? "magazine" : route.replaceAll("/", "")}.png`) });
    report.push(`${route}: ${violations.length} violation(s)`);
    assert.deepEqual(violations, [], `${route}: no CSP violations`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`PASS: no CSP violations under the production policy (${report.join("; ")})`);
