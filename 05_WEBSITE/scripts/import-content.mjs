// HISTORICAL — Sprint 1 importer. It imported the original sources for the first three items
// (MSG-001, ART-001, ADV-001) and wrote a fresh manifest; later sprints extend the manifest
// and content with their own scripts, so re-running this would overwrite their work. It is
// kept as a record of how Sprint 1 content was produced (`npm run import`, `npm run normalize`).
//
// Sprint v5 (Decision G): the MSG-001 source used here (the President's earlier message) was
// removed from 02_INCOMING_CONTENT/ on 2026-09-26 and replaced by his new message; the byte-exact
// original lives at 04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/President Desk.docx, and
// the path below points there so the historical importer still resolves.
import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import sharp from "sharp";
import xlsx from "xlsx";
import { projectRoot, siteRoot, ensureDir, sha256, slugify, writeManifest } from "./lib.mjs";

const now = new Date().toISOString();
const trackerPath = path.join(projectRoot, "04_MAGAZINE_WORKING", "BECAA_2026_Content_Tracker.xlsx");

function trackerRowById(id) {
  const wb = xlsx.readFile(trackerPath, { cellDates: false });
  const rows = xlsx.utils.sheet_to_json(wb.Sheets["Content Tracker"], { defval: "", raw: false });
  return rows.find((row) => String(row["Item ID"] || "").trim() === id);
}

const trackerAdv001 = trackerRowById("ADV-001");
if (!trackerAdv001) {
  throw new Error("ADV-001 was not found in the latest tracker.");
}

const selections = [
  {
    id: "MSG-001",
    type: "message",
    title: "President Desk",
    language: "en",
    contributor: "Manik Barman",
    designation: "President",
    passing_year: "1987",
    branch: "Civil",
    section: "messages",
    order: 10,
    source: "04_MAGAZINE_WORKING/SUPERSEDED_SOURCES/2026-09-26/President Desk.docx",
    contentRel: "messages/MSG-001-president-desk.md",
    permission: "Print and web",
    editorial_status: "Approved",
    verification: "verified",
    notes: "Tracker Item ID 16; selected as the approved office-bearer message source because the filename is unambiguous and extractable."
  },
  {
    id: "ART-001",
    type: "article",
    title: "SWAR SETU - Music for a Cause",
    language: "en",
    contributor: "Manisankar",
    designation: "",
    passing_year: "2009",
    branch: "Electrical",
    section: "articles",
    order: 20,
    source: "02_INCOMING_CONTENT/Swar setu program.docx",
    contentRel: "articles/ART-001-swar-setu-program.md",
    permission: "Print and web",
    editorial_status: "Approved",
    verification: "verified",
    notes: "Tracker Item ID 15; selected as the approved event report source because the filename is unambiguous and extractable."
  },
  {
    id: "ADV-001",
    type: "advertisement",
    title: "Skylark Advertisement",
    language: "en",
    contributor: "Skylark",
    designation: "Sponsor",
    section: "advertisements",
    order: 30,
    source: `03_ADVERTISEMENTS/${String(trackerAdv001["Source File Name"] || "").trim()}`,
    permission: String(trackerAdv001.Permission || "").trim(),
    editorial_status: String(trackerAdv001.Status || "").trim(),
    verification: "verified",
    usePlaceholder: false,
    notes: "Tracker ADV-001 now authorizes website publication. Historical note: the first V0 build found Web Include: No and used a labelled placeholder."
  }
];

function cleanDocxText(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function writeMarkdown(item) {
  const abs = path.join(projectRoot, item.source);
  const result = await mammoth.extractRawText({ path: abs });
  const text = cleanDocxText(result.value);
  const out = path.join(siteRoot, "src", "content", item.contentRel);
  ensureDir(path.dirname(out));
  const frontMatter = [
    "---",
    `id: ${item.id}`,
    `title: "${item.title.replaceAll('"', '\\"')}"`,
    `source_file: "${item.source}"`,
    `source_fingerprint: "${sha256(abs)}"`,
    `verification: "${item.verification}"`,
    "---",
    ""
  ].join("\n");
  const body = text || "<!-- NEEDS VERIFICATION: DOCX extraction returned no text. -->";
  fs.writeFileSync(out, `${frontMatter}${body}\n`, "utf8");
}

async function normalizeAd(item) {
  const abs = path.join(projectRoot, item.source);
  const slug = slugify(item.title);
  const webRel = `assets/normalized/advertisements/web/${item.id}-${slug}-web.jpg`;
  const printRel = `assets/normalized/advertisements/print/${item.id}-${slug}-print.png`;
  ensureDir(path.join(siteRoot, "src", path.dirname(webRel)));
  ensureDir(path.join(siteRoot, "src", path.dirname(printRel)));
  for (const ext of ["webp", "jpg", "jpeg", "png"]) {
    const stale = path.join(siteRoot, "src", "assets", "normalized", "advertisements", "web", `${item.id}-${slug}-web.${ext}`);
    if (stale !== path.join(siteRoot, "src", webRel)) fs.rmSync(stale, { force: true });
  }
  await sharp(abs)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 90, progressive: false, chromaSubsampling: "4:4:4" })
    .toFile(path.join(siteRoot, "src", webRel));
  await sharp(abs).resize({ width: 2480, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(siteRoot, "src", printRel));
  return { webRel, printRel };
}

for (const item of selections) {
  if (item.type === "advertisement") {
    if (!item.usePlaceholder) {
      const assets = await normalizeAd(item);
      item.web_asset = assets.webRel;
      item.print_asset = assets.printRel;
    }
  } else {
    await writeMarkdown(item);
    item.content_file = item.contentRel;
  }
}

const manifest = {
  meta: {
    title: "BECAA Maharashtra Magazine 2026",
    version: "0.1.0",
    status: "Version 0 local prototype",
    generated: now
  },
  items: selections.map((item) => {
    const abs = path.join(projectRoot, item.source);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      language: item.language,
      contributor: item.contributor,
      designation: item.designation,
      passing_year: item.passing_year || "",
      branch: item.branch || "",
      section: item.section,
      order: item.order,
      source_file: item.source,
      source_fingerprint: sha256(abs),
      content_file: item.content_file || "",
      web_asset: item.web_asset || "",
      print_asset: item.print_asset || "",
      permission: item.permission,
      editorial_status: item.editorial_status,
      verification: item.verification,
      web_include: item.type === "advertisement" ? String(trackerAdv001["Web Include"] || "").trim().toLowerCase() === "yes" : true,
      print_include: true,
      caption: item.type === "advertisement" ? "Skylark advertisement artwork, approved for Version 0 web prototype." : "",
      credit: item.type === "advertisement" ? String(trackerAdv001["Credit / Caption"] || "").replace(/^—$/, "").trim() : "",
      alt: item.type === "advertisement" ? "Skylark advertisement artwork" : `${item.title} text`,
      notes: item.notes
    };
  })
};

writeManifest(manifest);
console.log("Imported three prototype items into manifest and normalized content.");
