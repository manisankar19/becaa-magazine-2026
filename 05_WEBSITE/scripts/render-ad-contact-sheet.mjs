import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { projectRoot, walkFiles } from "./lib.mjs";

const adRoot = path.join(projectRoot, "03_ADVERTISEMENTS");
const out = "/tmp/becaa-ad-contact-sheet.jpg";
const files = walkFiles(adRoot).filter((file) => /\.(pdf|png|jpe?g)$/i.test(file));
const width = 300, height = 360, columns = 4;
const composites = [];
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  let raster = file;
  if (/\.pdf$/i.test(file)) {
    const prefix = `/tmp/becaa-ad-audit-${process.pid}-${i}`;
    execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-jpeg", "-r", "120", file, prefix]);
    raster = `${prefix}.jpg`;
  }
  const thumb = await sharp(raster).resize({ width: 270, height: 290, fit: "contain", background: "white" }).jpeg().toBuffer();
  const label = path.basename(file).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const svg = Buffer.from(`<svg width="280" height="55"><rect width="100%" height="100%" fill="white"/><text x="4" y="16" font-family="sans-serif" font-size="12" fill="black">${label.match(/.{1,36}/g)?.slice(0,3).map((line,j)=>`<tspan x="4" dy="${j ? 15 : 0}">${line}</tspan>`).join("")}</text></svg>`);
  const x = (i % columns) * width + 15, y = Math.floor(i / columns) * height + 10;
  composites.push({ input: thumb, left: x, top: y }, { input: svg, left: x, top: y + 295 });
  if (raster.startsWith("/tmp/becaa-ad-audit-")) fs.rmSync(raster, { force: true });
}
await sharp({ create: { width: columns * width, height: Math.ceil(files.length / columns) * height, channels: 3, background: "#dddddd" } }).composite(composites).jpeg({ quality: 90 }).toFile(out);
console.log(out);
