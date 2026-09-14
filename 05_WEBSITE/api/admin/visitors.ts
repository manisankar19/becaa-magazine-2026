// GET /api/admin/visitors?q=&page= — searchable, paginated registrations (Sprint v3 Task 29).
import { MAX_QUERY_LENGTH, searchVisitors } from "../../lib/admin-queries";
import { getPool } from "../../lib/db";
import { json } from "../../lib/http";
import { requireAdmin } from "../../lib/require-admin";

const PATH = "/api/admin/visitors";

export default async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "GET" } });
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.length > MAX_QUERY_LENGTH) return json({ ok: false, error: "Search text too long." }, { status: 400, path: PATH });
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  return json({ ok: true, ...(await searchVisitors(getPool(), { q, page })) }, { path: PATH });
}
