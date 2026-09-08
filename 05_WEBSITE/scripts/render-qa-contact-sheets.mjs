import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { siteRoot } from "./lib.mjs";

async function sheet(files, out) {
  if (!files.length) throw new Error(`No QA images found for ${path.basename(out)}.`);
  const w=260,h=340,cols=4, composite=[];
  for(let i=0;i<files.length;i++){
    const thumb=await sharp(files[i]).resize({width:230,height:280,fit:"contain",background:"white"}).png().toBuffer();
    const label=path.basename(files[i]).replaceAll("&","&amp;");
    const svg=Buffer.from(`<svg width="240" height="40"><rect width="100%" height="100%" fill="white"/><text x="4" y="20" font-family="sans-serif" font-size="12">${label}</text></svg>`);
    const x=(i%cols)*w+15,y=Math.floor(i/cols)*h+10;composite.push({input:thumb,left:x,top:y},{input:svg,left:x,top:y+285});
  }
  await sharp({create:{width:cols*w,height:Math.ceil(files.length/cols)*h,channels:3,background:"#ddd"}}).composite(composite).jpeg({quality:90}).toFile(out);
}
const qa=path.join(siteRoot,"qa-output");
const web=fs.readdirSync(path.join(qa,"advertisements")).filter(x=>x.startsWith("desktop-")).sort().map(x=>path.join(qa,"advertisements",x));
const pdf=fs.readdirSync(path.join(qa,"pdf-advertisements")).filter(x=>x.endsWith(".png")).sort().map(x=>path.join(qa,"pdf-advertisements",x));
await sheet(web,path.join(qa,"advertisement-web-contact-sheet.jpg"));
await sheet(pdf,path.join(qa,"advertisement-pdf-contact-sheet.jpg"));
console.log(`Contact sheets written for ${web.length} web and ${pdf.length} PDF advertisements.`);
