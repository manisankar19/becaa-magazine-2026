// GET /api/health — liveness + database reachability (Sprint v3 Task 23). No secrets, no data.
import { getPool } from "../lib/db.ts";
import { json } from "../lib/http.ts";

const PATH = "/api/health";

export default async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") return json({ ok: false }, { status: 405, path: PATH, headers: { allow: "GET" } });
  try {
    await getPool().query("select 1");
    return json({ ok: true, db: true }, { path: PATH });
  } catch {
    return json({ ok: false, db: false }, { status: 503, path: PATH });
  }
}
