// Administrator read/delete queries (Sprint v3 Task 29, PRD §5.5). Every statement is
// parameterised; the only fields ever returned are the approved visitor fields plus the id
// needed to address a row. Hashes, IP hashes, user agents and session data never leave here.
import type { Queryable } from "./admin-session.js";

export const PER_PAGE = 50;
export const MAX_QUERY_LENGTH = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const istFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export function formatIst(date: Date | string | null): string | null {
  if (!date) return null;
  const parts = Object.fromEntries(istFormatter.formatToParts(new Date(date)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} IST`;
}

export interface Stats {
  visitors_total: number;
  visits_total: number;
  by_category: { alumni: number; sponsor: number; guest: number };
  by_batch_year: Array<{ batch_year: number; count: number }>;
  by_department: Array<{ department: string; count: number }>;
  latest: Array<{ id: string; name: string; email: string; category: string; registered_at: string | null }>;
}

export async function stats(db: Queryable): Promise<Stats> {
  const [visitors, visits, categories, batches, departments, latest] = await Promise.all([
    db.query("select count(*)::int as n from visitors"),
    db.query("select count(*)::int as n from visits"),
    db.query("select category, count(*)::int as n from visitors group by category"),
    db.query("select batch_year, count(*)::int as n from visitors where category = 'alumni' and batch_year is not null group by batch_year order by batch_year"),
    db.query("select department, count(*)::int as n from visitors where category = 'alumni' and department is not null group by department order by n desc, department"),
    db.query("select id, name, email, category, created_at from visitors order by created_at desc, id limit 10"),
  ]);
  const by_category = { alumni: 0, sponsor: 0, guest: 0 };
  for (const row of categories.rows as Array<{ category: keyof typeof by_category; n: number }>) by_category[row.category] = row.n;
  return {
    visitors_total: (visitors.rows[0] as { n: number }).n,
    visits_total: (visits.rows[0] as { n: number }).n,
    by_category,
    by_batch_year: (batches.rows as Array<{ batch_year: number; n: number }>).map((r) => ({ batch_year: r.batch_year, count: r.n })),
    by_department: (departments.rows as Array<{ department: string; n: number }>).map((r) => ({ department: r.department, count: r.n })),
    latest: (latest.rows as Array<{ id: string; name: string; email: string; category: string; created_at: Date }>).map((r) => ({ id: r.id, name: r.name, email: r.email, category: r.category, registered_at: formatIst(r.created_at) })),
  };
}

export interface VisitorRow {
  id: string; name: string; email: string; category: string; batch_year: number | null; department: string | null; department_other: string | null;
  organisation: string | null; mobile: string | null; registered_at: string | null; last_seen_at: string | null; visit_count: number;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function searchVisitors(db: Queryable, { q = "", page = 1 }: { q?: string; page?: number }): Promise<{ page: number; per_page: number; total: number; rows: VisitorRow[] }> {
  const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
  const pattern = q.trim() ? `%${escapeLike(q.trim())}%` : null;
  const where = pattern ? "where name ilike $1 escape '\\' or email ilike $1 escape '\\' or organisation ilike $1 escape '\\'" : "";
  const params: unknown[] = pattern ? [pattern] : [];
  const total = (await db.query(`select count(*)::int as n from visitors ${where}`, params)).rows[0] as { n: number }; // check-sql: allow where-fragment (fixed fragment, see below)
  // check-sql: allow — `where` is one of two fixed fragments defined above (never user input) and `$${n}` only
  // numbers the positional placeholders; every user value still travels in `params`.
  const rows = await db.query(
    `select id, name, email, category, batch_year, department, department_other, organisation, mobile, created_at, last_seen_at, visit_count
     from visitors ${where} order by created_at desc, id limit $${params.length + 1} offset $${params.length + 2}`, // check-sql: allow where-fragment
    [...params, PER_PAGE, (safePage - 1) * PER_PAGE],
  );
  return {
    page: safePage,
    per_page: PER_PAGE,
    total: total.n,
    rows: (rows.rows as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string, name: r.name as string, email: r.email as string, category: r.category as string, batch_year: (r.batch_year as number | null) ?? null,
      department: (r.department as string | null) ?? null, department_other: (r.department_other as string | null) ?? null, organisation: (r.organisation as string | null) ?? null,
      mobile: (r.mobile as string | null) ?? null, registered_at: formatIst(r.created_at as Date), last_seen_at: formatIst(r.last_seen_at as Date), visit_count: Number(r.visit_count),
    })),
  };
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export async function deleteVisitor(db: Queryable, id: string): Promise<number> {
  if (!isUuid(id)) return 0;
  const { rowCount } = await db.query("delete from visitors where id = $1", [id]);
  return rowCount ?? 0;
}
