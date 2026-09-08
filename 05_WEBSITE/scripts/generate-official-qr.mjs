import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import yaml from "js-yaml";
import { ensureDir, siteRoot } from "./lib.mjs";

const dataPath = path.join(siteRoot, "src", "_data", "officialLinks.yaml");
const data = yaml.load(fs.readFileSync(dataPath, "utf8"));
const output = path.join(siteRoot, "src", "assets", "normalized", "qr");
ensureDir(output);
for (const link of [...data.connect, ...data.cultural_programmes]) {
  const svg = await QRCode.toString(link.url, { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 512 });
  fs.writeFileSync(path.join(output, `${link.id}.svg`), svg, "utf8");
}
console.log(`Generated ${data.connect.length + data.cultural_programmes.length} exact-URL QR codes.`);
