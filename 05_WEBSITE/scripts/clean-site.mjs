import fs from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib.mjs";

fs.rmSync(path.join(siteRoot, "_site"), { recursive: true, force: true });
