// GET /api/admin/visitors?q=&page= — searchable, paginated registrations (Sprint v3 Task 29).
import { MAX_QUERY_LENGTH, searchVisitors } from "../../lib/admin-queries.js";
import { getPool } from "../../lib/db.js";
import { json } from "../../lib/http.js";
import { requireAdmin } from "../../lib/require-admin.js";

const PATH = "/api/admin/visitors";

async function handler(request: Request): Promise<Response> {
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

// Vercel Node runtime: a Web-standard `fetch` export receives a Request and returns a Response
// (a default export would be treated as the Node (req, res) signature and its Response ignored).
export { handler as fetch };
