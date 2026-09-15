// GET /api/admin/stats — dashboard aggregates (Sprint v3 Task 29). Administrator only.
import { stats } from "../../lib/admin-queries.js";
import { getPool } from "../../lib/db.js";
import { json, guarded } from "../../lib/http.js";
import { requireAdmin } from "../../lib/require-admin.js";

const PATH = "/api/admin/stats";

async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "GET" } });
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  return json({ ok: true, ...(await stats(getPool())) }, { path: PATH });
}

// Vercel Node runtime: a Web-standard `fetch` export receives a Request and returns a Response
// (a default export would be treated as the Node (req, res) signature and its Response ignored).
export const fetch = guarded(handler, PATH);
