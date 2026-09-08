import fs from "node:fs";
import path from "node:path";
import { projectRoot, sha256, walkFiles, relFromProject } from "./lib.mjs";

const baselinePath = path.join(projectRoot, "04_MAGAZINE_WORKING", "source-inventory.json");
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, "utf8")).files || [] : [];
const roots = ["02_INCOMING_CONTENT", "03_ADVERTISEMENTS"];
const current = roots.flatMap((root) => walkFiles(path.join(projectRoot, root))).map((file) => {
  const stat = fs.statSync(file);
  return { relative_path: relFromProject(file), size: stat.size, modified_time: stat.mtime.toISOString(), sha256: sha256(file) };
});
const oldByPath = new Map(baseline.map((item) => [item.relative_path, item]));
const oldByHash = new Map(baseline.map((item) => [item.sha256, item]));
const currentPaths = new Set(current.map((item) => item.relative_path));
const files = current.map((item) => {
  const old = oldByPath.get(item.relative_path);
  if (old) return { ...item, classification: old.sha256 === item.sha256 ? "unchanged" : "changed" };
  const sameHash = oldByHash.get(item.sha256);
  return { ...item, classification: sameHash ? "possible rename" : "new", possible_previous_path: sameHash?.relative_path || "" };
});
for (const old of baseline.filter((item) => roots.some((root) => item.relative_path.startsWith(`${root}/`)) && !currentPaths.has(item.relative_path))) {
  files.push({ ...old, classification: "missing from current scan" });
}
const report = { generated: new Date().toISOString(), baseline: path.relative(projectRoot, baselinePath).replaceAll("\\", "/"), files };
fs.writeFileSync(path.join(projectRoot, "04_MAGAZINE_WORKING", "update-scan.json"), JSON.stringify(report, null, 2));
console.log(`Scanned ${current.length} current source files.`);
