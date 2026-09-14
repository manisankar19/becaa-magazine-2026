// DELETE /api/admin/visitors/:id — delete one visitor and their visits (Sprint v3 Task 29, PRD §5.6).
// Administrator session + same-origin + CSRF token (x-csrf-token header) required.
import { deleteVisitor, isUuid } from "../../../lib/admin-queries.js";
import { getPool } from "../../../lib/db.js";
import { json } from "../../../lib/http.js";
import { requireAdminMutation } from "../../../lib/require-admin.js";

const PATH = "/api/admin/visitors";

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  if (request.method.toUpperCase() !== "DELETE") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "DELETE" } });
  const auth = await requireAdminMutation(request, null);
  if (!auth.ok) return auth.response;
  if (!isUuid(id)) return json({ ok: false, error: "Invalid visitor id." }, { status: 400, path: PATH });
  const deleted = await deleteVisitor(getPool(), id);
  if (!deleted) return json({ ok: false, error: "Visitor not found." }, { status: 404, path: PATH });
  return json({ ok: true, deleted }, { path: PATH });
}
