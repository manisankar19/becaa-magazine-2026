// HISTORICAL (Sprint v2 Task 8): one-shot script that appended GAL-007, ART-010 and ART-011 to
// publication.yaml. Already applied; kept for reproducibility and exercised by
// tests/integration/add-v2-manifest-items.test.mjs. Paths reflect the Sprint v4 layout: the
// files of the former Sprint v2 intake subfolder now live directly in 02_INCOMING_CONTENT/, and
// ART-010's Sprint v2 source is read from its archive (it was superseded in Sprint v4).
import fs from "node:fs";
import path from "node:path";
import { projectRoot, siteRoot, sha256, readManifest, stripFrontMatter } from "./lib.mjs";
import { buildManifestItemBlock } from "./manifest-item-yaml-core.mjs";

const manifestPath = path.join(siteRoot, "src", "_data", "publication.yaml");
const ANCHOR = "sponsor_acknowledgements:";

// Same heuristic as import-approved.mjs's language() helper.
function detectLanguage(markdown) {
  const text = markdown.replace(/<[^>]*>/g, ""); // markup such as the poem's <br> is not language
  const bengali = (text.match(/[ঀ-৿]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return bengali && latin ? "mixed" : bengali ? "bn" : "en";
}

function readExtractedBody(relContentFile) {
  const abs = path.join(siteRoot, "src", "content", relContentFile);
  return stripFrontMatter(fs.readFileSync(abs, "utf8"));
}

// Sprint v2 source for ART-010. Superseded in Sprint v4 (Task 6 re-extracted the poem from
// Shubhra Basu.md); the original bytes are archived, so this historical entry still hashes.
const golapSource = path.join(projectRoot, "04_MAGAZINE_WORKING", "SUPERSEDED_SOURCES", "2026-09-15", "Shubhra Basu.docx");
const palashSource = path.join(projectRoot, "02_INCOMING_CONTENT", "Palash Article.docx");
const chatgptSource = path.join(projectRoot, "02_INCOMING_CONTENT", "chatgpt kallol.jpeg");

export const NEW_ITEMS = [
  {
    id: "GAL-007",
    type: "gallery",
    title: "Chatgpt",
    language: "en",
    contributor: "Kallol Roy",
    designation: "",
    passing_year: "1991",
    branch: "Civil",
    section: "gallery",
    order: 370,
    source_file: "02_INCOMING_CONTENT/chatgpt kallol.jpeg",
    source_fingerprint: sha256(chatgptSource),
    content_file: "",
    web_asset: "assets/normalized/images/web/GAL-007-chatgpt-web.jpg",
    print_asset: "assets/normalized/images/print/GAL-007-chatgpt-print.jpg",
    permission: "Print and web",
    editorial_status: "Approved",
    verification: "verified",
    web_include: true,
    print_include: true,
    caption: "Chatgpt",
    credit: "Kallol Roy",
    alt: "Chatgpt — Kallol Roy",
    notes: "Tracker Item ID 21. Exact approved source: chatgpt kallol.jpeg.",
  },
  {
    id: "ART-010",
    type: "article",
    title: "গোলাপ",
    language: detectLanguage(readExtractedBody("articles/ART-010-item.md")),
    contributor: "Shubhra Basu (wife of Pranab Basu)",
    designation: "",
    passing_year: "1978",
    branch: "Civil",
    section: "articles",
    order: 200,
    source_file: "02_INCOMING_CONTENT/Shubhra Basu.docx",
    source_fingerprint: sha256(golapSource),
    content_file: "articles/ART-010-item.md",
    web_asset: "",
    print_asset: "",
    permission: "Print and web",
    editorial_status: "Approved",
    verification: "verified",
    web_include: true,
    print_include: true,
    caption: "",
    credit: "",
    alt: "গোলাপ — Shubhra Basu (wife of Pranab Basu)",
    notes: "Tracker Item ID 22. Exact approved source: Shubhra Basu.docx.",
  },
  {
    id: "ART-011",
    type: "article",
    title: "বেঁচে থাকার লড়াই ও স্বপ্নের পথ",
    language: detectLanguage(readExtractedBody("articles/ART-011-item.md")),
    contributor: "Palash Biswas",
    designation: "",
    passing_year: "2006",
    branch: "Civil",
    section: "articles",
    order: 210,
    source_file: "02_INCOMING_CONTENT/Palash Article.docx",
    source_fingerprint: sha256(palashSource),
    content_file: "articles/ART-011-item.md",
    web_asset: "",
    print_asset: "",
    permission: "Print and web",
    editorial_status: "Approved",
    verification: "verified",
    web_include: true,
    print_include: true,
    caption: "",
    credit: "",
    alt: "বেঁচে থাকার লড়াই ও স্বপ্নের পথ — Palash Biswas",
    notes: "Tracker Item ID 23. Exact approved source: Palash Article.docx.",
  },
];

export function addManifestItems() {
  const before = readManifest();
  const existingIds = new Set(before.items.map((item) => item.id));
  const colliding = NEW_ITEMS.filter((item) => existingIds.has(item.id));
  if (colliding.length) {
    console.error(`Refusing to proceed: ID(s) already present in the manifest: ${colliding.map((i) => i.id).join(", ")}`);
    process.exit(1);
  }

  let text = fs.readFileSync(manifestPath, "utf8");
  const anchorIndex = text.indexOf(`\n${ANCHOR}`);
  if (anchorIndex === -1) {
    console.error(`Anchor line not found in publication.yaml: ${ANCHOR}`);
    process.exit(1);
  }

  const insertion = NEW_ITEMS.map(buildManifestItemBlock).join("");
  text = text.slice(0, anchorIndex + 1) + insertion + text.slice(anchorIndex + 1);
  fs.writeFileSync(manifestPath, text, "utf8");

  const after = readManifest(); // re-parse to confirm the file is still valid YAML
  console.log(`Manifest items: ${before.items.length} -> ${after.items.length}.`);
  for (const item of NEW_ITEMS) console.log(`  + ${item.id} (${item.section}, order ${item.order}, language ${item.language})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addManifestItems();
}
