import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { siteRoot } from "./lib.mjs";

const printHtml = path.join(siteRoot, "_site", "print", "index.html");
if (!fs.existsSync(printHtml)) throw new Error("Print HTML is missing; run npm run build first.");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${printHtml.replaceAll("\\", "/")}`, { waitUntil: "networkidle" });
await page.pdf({ path: path.join(siteRoot, "_site", "print", "BECAA-2026-complete-review.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log("Print PDF written to _site/print/BECAA-2026-complete-review.pdf");
