import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ensureDir, siteRoot } from "./lib.mjs";

const outDir = path.join(siteRoot, "qa-output");
fs.rmSync(outDir, { recursive: true, force: true });
ensureDir(outDir);

const browser = await chromium.launch();
const adOutDir = path.join(outDir, "advertisements");
ensureDir(adOutDir);
for (const viewport of [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 1200 }
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(`file://${path.join(siteRoot, "_site", "index.html").replaceAll("\\", "/")}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return img.decode ? img.decode().catch(() => undefined) : new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  });
  await page.screenshot({ path: path.join(outDir, `${viewport.name}-home.png`), fullPage: false, timeout: 30000 });
  const adFrame = page.locator("#ADV-001 .ad-frame");
  if (await adFrame.count()) {
    await adFrame.scrollIntoViewIfNeeded();
    await adFrame.screenshot({ path: path.join(outDir, `${viewport.name}-ad-frame.png`) });
  }
  const issues = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    images: [...document.images].map((img) => ({
      src: new URL(img.src).pathname.split("/_site/").pop(),
      complete: img.complete,
      width: img.naturalWidth,
      height: img.naturalHeight
    }))
  }));
  const ads = await page.locator(".publication-item--advertisement").evaluateAll((items) => items.map((item) => {
    const img = item.querySelector("img");
    const rect = img?.getBoundingClientRect();
    return { id: item.id, naturalWidth: img?.naturalWidth || 0, naturalHeight: img?.naturalHeight || 0, displayWidth: rect?.width || 0, displayHeight: rect?.height || 0 };
  }));
  for (const ad of ads) {
    const naturalRatio = ad.naturalWidth / ad.naturalHeight;
    const displayRatio = ad.displayWidth / ad.displayHeight;
    if (!ad.naturalWidth || !ad.displayWidth || Math.abs(naturalRatio - displayRatio) > 0.02) {
      await browser.close();
      console.error(`${viewport.name} ${ad.id} advertisement is broken or distorted.`);
      process.exit(1);
    }
    const frame = page.locator(`#${ad.id} .ad-frame`);
    await frame.scrollIntoViewIfNeeded();
    await frame.screenshot({ path: path.join(adOutDir, `${viewport.name}-${ad.id}.png`) });
  }
  fs.writeFileSync(path.join(outDir, `${viewport.name}-qa.json`), JSON.stringify(issues, null, 2), "utf8");
  if (issues.overflow) {
    await browser.close();
    console.error(`${viewport.name} horizontal overflow detected.`);
    process.exit(1);
  }
  if (issues.images.some((img) => !img.complete || !img.width || !img.height)) {
    await browser.close();
    console.error(`${viewport.name} broken image detected.`);
    process.exit(1);
  }
  await page.close();
}
await browser.close();
console.log(`QA screenshots written to ${path.relative(siteRoot, outDir)}`);
