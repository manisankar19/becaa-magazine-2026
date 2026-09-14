// POST /api/admin/logout — revoke the server-side session and clear the cookie (Sprint v3 Task 28).
import { clearAdminCookie, revokeAdminSession } from "../../lib/admin-session.ts";
import { getPool } from "../../lib/db.ts";
import { json, readJsonBody } from "../../lib/http.ts";
import { requireAdminMutation } from "../../lib/require-admin.ts";

const PATH = "/api/admin/logout";

export default async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "POST") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "POST" } });
  const body = await readJsonBody(request);
  const auth = await requireAdminMutation(request, body.ok ? body.value : null);
  if (!auth.ok) return auth.response;
  await revokeAdminSession(getPool(), auth.token);
  return json({ ok: true }, { path: PATH, headers: { "set-cookie": clearAdminCookie() } });
}
