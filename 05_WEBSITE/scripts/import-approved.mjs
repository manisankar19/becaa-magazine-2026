import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import mammoth from "mammoth";
import sharp from "sharp";
import xlsx from "xlsx";
import { projectRoot, siteRoot, readManifest, writeManifest, sha256, ensureDir, slugify } from "./lib.mjs";

const stableIds = {
  "1":"ART-009", "3":"GAL-001", "4":"ART-002", "5":"ART-003", "6":"ART-004", "7":"ART-005", "8":"ART-006",
  "9":"GAL-002", "10":"ART-007", "11":"GAL-006", "12":"GAL-003", "13":"ART-008", "14":"GAL-004", "15":"ART-001",
  "16":"MSG-001", "17":"MSG-002", "18":"MSG-003", "19":"GAL-005"
};
const preferredArtwork = {
  "ADV-001":"1 Skylark.png", "ADV-002":"2 d PNB FD Magazine AD_A4-01.pdf", "ADV-003":"3 Vistaar Finance.jpg",
  "ADV-004":"4 Gainwell Technologies.jpg", "ADV-005":"5a Tata Capital ltd. (Retail Finance).jpg", "ADV-006":"6 d tata capital.pdf",
  "ADV-007":"7 OnShore Construction Pvt Ltd .png", "ADV-008":"8 Roofs & Ceilings.png", "ADV-010":"10 Indus Grand.jpeg",
  "ADV-011":"11 Axelon.jpg", "ADV-012":"12 arvi enercon.jpeg", "ADV-013":"13a Anand Rathi.jpeg",
  "ADV-014":"14 a future netwings.pdf", "ADV-015":"15 Swaraj Shoes.jpeg", "ADV-017":"17 UREDCONNECT.jpeg",
  "ADV-018":"18 Eframe.jpeg", "ADV-019":"19 Network Techlabs.png", "ADV-020":"20 b Schnelltech Global.pdf",
  "ADV-021":"21 Bhavik.jpeg", "ADV-022":"22 pratap caterer.png", "ADV-023":"23 Clover Blakefield Reality LLP.png",
  "ADV-026":"CETEST Advertisement_May 2025_Portrait.pptx"
};
const sourceAliases = { "ART-009":"1. Artical Sudip Mazumdar .pdf" };
const establishedContentPaths = { "ART-001":"articles/ART-001-swar-setu-program.md" };
const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");
const wb = xlsx.readFile(trackerPath, { cellDates: false });
const rows = xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false });
const manifest = readManifest();
const oldById = new Map(manifest.items.map((item) => [item.id, item]));
const imported = new Map();

function sourcePath(name) {
  for (const root of ["02_INCOMING_CONTENT", "03_ADVERTISEMENTS"]) {
    const abs = path.join(projectRoot, root, name);
    if (fs.existsSync(abs)) return { abs, rel: `${root}/${name}` };
  }
}
function language(text) {
  const bengali = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return bengali && latin ? "mixed" : bengali ? "bn" : "en";
}
function cleanText(text) {
  return text.replace(/\r/g, "").split("\n").map((line) => line.trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function extractText(source, ext) {
  if (ext === ".docx") return cleanText((await mammoth.extractRawText({ path: source.abs })).value);
  if (ext === ".pdf") return cleanText(execFileSync("pdftotext", ["-layout", source.abs, "-"], { encoding: "utf8", maxBuffer: 20_000_000 }));
  return "";
}
async function rasterInput(source, ext, id) {
  let pdf = source.abs;
  if (ext === ".pptx") {
    const reviewedRender = path.join(siteRoot, "src", "assets", "normalized", "advertisements", "source-render", `${id}-slide-1.pdf`);
    if (fs.existsSync(reviewedRender)) return rasterInput({ abs: reviewedRender }, ".pdf", id);
    const office = process.env.LIBREOFFICE_BIN || "/opt/libreoffice26.2/program/soffice";
    if (!fs.existsSync(office)) throw new Error(`${id} requires LIBREOFFICE_BIN to render its approved PPTX source.`);
    const outDir = path.join("/tmp", `becaa-${id.toLowerCase()}-pptx-${process.pid}`);
    ensureDir(outDir);
    execFileSync(office, ["--headless", "--convert-to", "pdf:impress_pdf_Export", "--outdir", outDir, source.abs], {
      env: { ...process.env, SAL_USE_VCLPLUGIN: "svp", HOME: "/tmp" }, stdio: "inherit"
    });
    pdf = path.join(outDir, `${path.basename(source.abs, ext)}.pdf`);
    if (!fs.existsSync(pdf)) throw new Error(`${id} PowerPoint renderer did not create the expected PDF.`);
  } else if (ext !== ".pdf") return source.abs;
  const prefix = path.join("/tmp", `becaa-${id.toLowerCase()}-${process.pid}`);
  execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-jpeg", "-r", "300", pdf, prefix]);
  return `${prefix}.jpg`;
}

for (const row of rows) {
  const trackerId = String(row["Item ID"] || "").trim();
  const id = stableIds[trackerId] || (/^ADV-/.test(trackerId) ? trackerId : "");
  if (!id || !/print and web/i.test(row.Permission) || !/^approved$/i.test(row.Status) || !/^yes$/i.test(row["Web Include"])) continue;
  const names = String(row["Source File Name"] || "").split(";").map((v) => v.trim()).filter((v) => v && v !== "—");
  const selectedName = sourceAliases[id] || preferredArtwork[id] || (names.length === 1 ? names[0] : "");
  const source = selectedName && sourcePath(selectedName);
  if (!source || !/\.(docx|pptx|pdf|jpe?g|png)$/i.test(selectedName)) continue;
  const fingerprint = sha256(source.abs);
  const ext = path.extname(selectedName).toLowerCase();
  const isText = ext === ".docx" || (ext === ".pdf" && !id.startsWith("GAL-") && !id.startsWith("ADV-"));
  const type = id.startsWith("MSG-") ? "message" : id.startsWith("GAL-") ? "gallery" : id.startsWith("ADV-") ? "advertisement" : "article";
  const title = String(row["Title / Item"]).trim();
  const contributor = String(row["Contributor / Company"]).trim();
  const item = {
    id, type, title, language: "en", contributor,
    designation: oldById.get(id)?.designation || "", passing_year: String(row["Passing Year"] || "").replace(/^—$/, ""), branch: String(row.Branch || "").replace(/^—$/, ""),
    section: type === "message" ? "messages" : type === "gallery" ? "gallery" : type === "advertisement" ? "advertisements" : "articles",
    order: id.startsWith("MSG-") ? Number(id.slice(4)) * 10 : id.startsWith("ART-") ? 100 + Number(id.slice(4)) * 10 : id.startsWith("GAL-") ? 300 + Number(id.slice(4)) * 10 : 500 + Number(id.slice(4)) * 10,
    source_file: source.rel, source_fingerprint: fingerprint, content_file: "", web_asset: "", print_asset: "",
    permission: String(row.Permission).trim(), editorial_status: String(row.Status).trim(), verification: "verified", web_include: true,
    print_include: /^yes$/i.test(row["Print Include"]), caption: type === "gallery" ? title : "", credit: type === "gallery" ? contributor : "",
    alt: type === "advertisement" ? `${contributor} advertisement artwork` : `${title}${contributor ? ` — ${contributor}` : ""}`,
    notes: `Tracker Item ID ${trackerId}. Exact approved source: ${selectedName}.`
  };
  if (isText) {
    const extracted = await extractText(source, ext);
    if (!extracted) throw new Error(`${id} text extraction returned empty content.`);
    item.language = language(extracted);
    const rel = establishedContentPaths[id] || `${type === "message" ? "messages" : "articles"}/${id}-${slugify(title)}.md`;
    const out = path.join(siteRoot, "src", "content", rel);
    const old = oldById.get(id);
    if (!old || old.source_fingerprint !== fingerprint || !fs.existsSync(out)) {
      ensureDir(path.dirname(out));
      fs.writeFileSync(out, `---\nid: ${id}\ntitle: ${JSON.stringify(title)}\nsource_file: ${JSON.stringify(source.rel)}\nsource_fingerprint: ${fingerprint}\nverification: verified\n---\n${extracted}\n`);
    }
    item.content_file = rel;
  } else {
    const raster = await rasterInput(source, ext, id);
    const base = `${id}-${slugify(title)}`;
    const folder = type === "advertisement" ? "advertisements" : "images";
    const webRel = `assets/normalized/${folder}/web/${base}-web.jpg`;
    const printRel = `assets/normalized/${folder}/print/${base}-print.jpg`;
    for (const [rel, width, quality] of [[webRel, 1600, 88], [printRel, 2480, 94]]) {
      const out = path.join(siteRoot, "src", rel); ensureDir(path.dirname(out));
      await sharp(raster).resize({ width, withoutEnlargement: true }).jpeg({ quality, chromaSubsampling: "4:4:4" }).toFile(out);
    }
    if (raster.startsWith("/tmp/becaa-")) fs.rmSync(raster, { force: true });
    item.web_asset = webRel; item.print_asset = printRel;
  }
  imported.set(id, item);
}

manifest.meta.version = "1.0.0-review.3";
manifest.meta.status = "Complete local review 03";
manifest.meta.title = "একই শিকড়";
manifest.meta.subtitle = "BECAA Maharashtra Magazine / Souvenir 2026";
manifest.cover = {
  id: "COV-001",
  title: "একই শিকড়",
  source_file: "02_INCOMING_CONTENT/Cover page.jpg",
  asset: "assets/normalized/cover/Cover page.jpg",
  source_fingerprint: "d8dfb14bf8aeb93bedd74fabdd884ab51e1a433cda37c2210125a0b5f315d8e7"
};
manifest.meta.generated = new Date().toISOString();
manifest.sponsor_acknowledgements = [];
manifest.sponsor_acknowledgement_message = "BECAA Maharashtra warmly thanks our sponsors for their support.";
manifest.items = [...imported.values()].sort((a,b) => Number(a.order)-Number(b.order));
writeManifest(manifest);
console.log(`Manifest now contains ${manifest.items.length} eligible items and ${manifest.sponsor_acknowledgements.length} acknowledgements.`);
