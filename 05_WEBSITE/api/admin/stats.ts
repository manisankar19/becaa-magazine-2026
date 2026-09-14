// GET /api/admin/stats — dashboard aggregates (Sprint v3 Task 29). Administrator only.
import { stats } from "../../lib/admin-queries.ts";
import { getPool } from "../../lib/db.ts";
import { json } from "../../lib/http.ts";
import { requireAdmin } from "../../lib/require-admin.ts";

const PATH = "/api/admin/stats";

export default async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "GET" } });
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  return json({ ok: true, ...(await stats(getPool())) }, { path: PATH });
}
