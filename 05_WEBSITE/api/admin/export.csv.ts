// GET /api/admin/export.csv — download the approved visitor fields (Sprint v3 Task 30, PRD §5.5).
// Administrator only. One audit line is logged (timestamp, session display id, row count);
// no visitor data is ever logged.
import { formatIst } from "../../lib/admin-queries.js";
import { buildCsv, EXPORT_COLUMNS } from "../../lib/csv-core.js";
import { getPool } from "../../lib/db.js";
import { json, securityHeaders } from "../../lib/http.js";
import { requireAdmin } from "../../lib/require-admin.js";

const PATH = "/api/admin/export.csv";

export default async function handler(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "GET") return json({ ok: false, error: "Method not allowed." }, { status: 405, path: PATH, headers: { allow: "GET" } });
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { rows } = await getPool().query(
    "select name, email, category, batch_year, department, department_other, organisation, mobile, consent_at, created_at, last_seen_at, visit_count from visitors order by created_at, id",
  );
  const records = rows.map((r) => ({
    name: r.name, email: r.email, category: r.category, batch_year: r.batch_year, department: r.department, department_other: r.department_other,
    organisation: r.organisation, mobile: r.mobile, consent_at: formatIst(r.consent_at), registered_at: formatIst(r.created_at), last_seen_at: formatIst(r.last_seen_at), visit_count: r.visit_count,
  }));
  const csv = buildCsv(EXPORT_COLUMNS, records);
  const today = new Date().toISOString().slice(0, 10);
  console.log(`csv export ${new Date().toISOString()} session=${auth.tokenHash.slice(0, 8)} rows=${records.length}`);
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="becaa-2026-visitors-${today}.csv"`,
      ...securityHeaders(PATH),
    },
  });
}
