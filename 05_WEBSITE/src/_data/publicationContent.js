import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentRoot = path.join(process.cwd(), "src", "content");

function walk(dir, prefix = "") {
  if (!fs.existsSync(dir)) return {};
  const out = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.join(prefix, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) Object.assign(out, walk(abs, rel));
    if (entry.isFile() && entry.name.endsWith(".md")) out[rel] = matter(fs.readFileSync(abs, "utf8")).content;
  }
  return out;
}

export default walk(contentRoot);
