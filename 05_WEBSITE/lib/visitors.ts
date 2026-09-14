// Visitor persistence (Sprint v3 Task 23, PRD §5.3–5.4). One parameterised upsert keyed on
// lower(email): a returning visitor keeps one row, editable fields are refreshed, and
// visit_count / last_seen_at advance. A visits row records each session start with a salted
// IP hash and a truncated user agent — never a raw IP.
import type { Queryable } from "./admin-session";
import type { Registration } from "./validate-registration";

export interface UpsertResult {
  id: string;
  isNew: boolean;
  visitCount: number;
}

const UPSERT = `
  insert into visitors (name, email, category, batch_year, department, department_other, organisation, mobile, consent_at, privacy_version)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  on conflict (lower(email)) do update set
    name = excluded.name,
    category = excluded.category,
    batch_year = excluded.batch_year,
    department = excluded.department,
    department_other = excluded.department_other,
    organisation = excluded.organisation,
    mobile = excluded.mobile,
    consent_at = excluded.consent_at,
    privacy_version = excluded.privacy_version,
    visit_count = visitors.visit_count + 1,
    updated_at = now(),
    last_seen_at = now()
  returning id, visit_count, (xmax = 0) as is_new`;

export async function upsertVisitor(db: Queryable, reg: Registration, { privacyVersion, now = new Date() }: { privacyVersion: number; now?: Date }): Promise<UpsertResult> {
  const { rows } = await db.query(UPSERT, [reg.name, reg.email, reg.category, reg.batch_year, reg.department, reg.department_other, reg.organisation, reg.mobile, now.toISOString(), privacyVersion]);
  const row = rows[0] as { id: string; visit_count: number; is_new: boolean };
  return { id: row.id, isNew: Boolean(row.is_new), visitCount: Number(row.visit_count) };
}

export async function recordVisit(db: Queryable, visitorId: string, { ipHash, userAgent }: { ipHash: string | null; userAgent: string | null }): Promise<void> {
  await db.query("insert into visits (visitor_id, ip_hash, user_agent) values ($1, $2, $3)", [visitorId, ipHash, userAgent ? userAgent.slice(0, 255) : null]);
}
