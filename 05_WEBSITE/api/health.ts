// GET /api/health — liveness + database reachability (Sprint v3 Task 23). No secrets, no data.
import { getPool } from "../lib/db.js";
import { json, guarded } from "../lib/http.js";

const PATH = "/api/health";

async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") return json({ ok: false }, { status: 405, path: PATH, headers: { allow: "GET" } });
  try {
    await getPool().query("select 1");
    return json({ ok: true, db: true }, { path: PATH });
  } catch {
    return json({ ok: false, db: false }, { status: 503, path: PATH });
  }
}

// Vercel Node runtime: a Web-standard `fetch` export receives a Request and returns a Response
// (a default export would be treated as the Node (req, res) signature and its Response ignored).
export const fetch = guarded(handler, PATH);
