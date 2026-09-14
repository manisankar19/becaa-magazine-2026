-- Sprint v3 Task 19 — initial schema (sprints/v3/PRD.md §5.4). Additive only.
-- Email case-insensitivity is provided by a unique index on lower(email) rather than the
-- citext extension (not available on every PostgreSQL install; the application also
-- lower-cases emails on write). No extensions are required.

create table visitors (
  id               uuid primary key default gen_random_uuid(),
  name             varchar(120) not null,
  email            text not null,
  category         text not null check (category in ('alumni','sponsor','guest')),
  batch_year       smallint check (batch_year between 1900 and 2100),
  department       varchar(80),          -- longest approved name is 42 chars (found by the register test)
  department_other varchar(80),
  organisation     varchar(160),
  mobile           char(10) check (mobile ~ '^[6-9][0-9]{9}$'),
  consent_at       timestamptz not null,
  privacy_version  smallint not null,
  visit_count      integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now()
);
create unique index visitors_email_lower_key on visitors (lower(email));
create index visitors_created_at_idx on visitors (created_at desc);
create index visitors_category_idx on visitors (category);

create table visits (
  id          bigserial primary key,
  visitor_id  uuid not null references visitors(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ip_hash     char(64),               -- sha256(ip + IP_HASH_SALT); cleared after 30 days by db:purge
  user_agent  varchar(255)
);
create index visits_started_at_idx on visits (started_at desc);

create table admin_sessions (
  token_hash   char(64) primary key,   -- sha256(token); the raw token exists only in the cookie
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  ip_hash      char(64)
);

create table rate_limits (
  bucket       varchar(160) primary key, -- e.g. 'register:<ip_hash>' / 'login:<username>'
  window_start timestamptz not null,
  count        integer not null default 0
);
