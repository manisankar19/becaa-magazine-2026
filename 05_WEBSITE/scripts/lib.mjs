import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import yaml from "js-yaml";

export const projectRoot = path.resolve(process.cwd(), "..");
export const siteRoot = process.cwd();
export const sourceRoots = ["01_REFERENCE_2025", "02_INCOMING_CONTENT", "03_ADVERTISEMENTS", "04_MAGAZINE_WORKING"];

export function relFromProject(absPath) {
  return path.relative(projectRoot, absPath).replaceAll("\\", "/");
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(abs));
    if (entry.isFile()) out.push(abs);
  }
  return out;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70) || "item";
}

export function readManifest() {
  const file = path.join(siteRoot, "src", "_data", "publication.yaml");
  return yaml.load(fs.readFileSync(file, "utf8"));
}

export function writeManifest(data) {
  const file = path.join(siteRoot, "src", "_data", "publication.yaml");
  fs.writeFileSync(file, yaml.dump(data, { lineWidth: 120, noRefs: true }), "utf8");
}

export function stripFrontMatter(markdown) {
  return matter(markdown).content;
}

export function pathInsideSite(relPath) {
  const abs = path.resolve(siteRoot, relPath);
  return abs.startsWith(siteRoot + path.sep) || abs === siteRoot;
}
