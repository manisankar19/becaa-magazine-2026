# Sprint v5 — Preview and Production deployment of `V5_REVIEW_01` (Tasks 20–21)

- **Owner approval:** 2026-09-26, `/dev task 19 to 21` in the Sprint v5 session (Tasks 20 and 21 in `sprints/v5/TASKS.md`: Preview, then Production).
- **Source:** review release `06_FINAL_OUTPUT/V5_REVIEW_01/`, built at `b7ab7d1`. The deployments were made from commit `c7c9643`. Its `05_WEBSITE/` tree is the build commit's, plus two changes:
  - the deployable PDF (`release-assets/print/`, byte-identical to the release PDF);
  - the `’`-escape fix in `v5-corrections.mjs` (same string value; a build-time data file that the site does not use).
- **Tooling:** Vercel CLI 59.11.7, run from `05_WEBSITE/`, linked to `mani125slm/becaa-magazine-2026-portal`. The Vercel project has no Git integration, so deployments happen only through the CLI; the pushes to GitHub triggered none.
- **Secrets handling:**
  - The Preview environment and a fresh development OIDC token were pulled into a private (mode 700) scratch folder outside the repository. No value was printed.
  - The protected Preview was reached by sending that token as `x-vercel-trusted-oidc-idp-token`.
  - No environment variable, credential or protection setting was changed.

## Preview (Task 20)

| Field | Value |
|---|---|
| Deployment | `https://becaa-magazine-2026-portal-1wxfioxpc-mani125slm.vercel.app` (`dpl_8SUCuYZZUSfU7XA6pHrxveh2QnKP`), target preview (`vercel deploy`, no `--prod`), 2026-09-26 14:04 UTC, behind Vercel Deployment Protection |
| Migrations | `db-migrate.mjs status` on the Preview database: Applied 1, Pending none. Sprint v5 has no schema change, so nothing was run |
| Database before (14:04 UTC) | visitors 3, visits 3, admin_sessions 0, rate_limits 0, test-pattern visitors 0 |
| Unauthenticated probes | 12/12 as expected (table below) |
| Public files vs the `V5_REVIEW_01` build | `site.css`, `print.css`, `site.js`, `/welcome/`, `/admin/`: byte-identical |
| Content check (one registration) | See below |
| Browser suite | `e2e:app --base-url <preview> --public-only`: **PASS, 14 steps**, desktop and mobile. It covered the welcome gate, server field errors, the readable platform-error notice, alumni, sponsor and guest registration opening the magazine with correct cookie flags, and protected artwork, gallery, PDF and print refused without a session. The suite skips mobile registrations on remote targets because of the per-IP limit of 5 registrations per 10 minutes, so it ran after that window had cleared from the content check |
| Administrator flow | **Not run on Preview** (`--public-only`). Running it would need a new temporary Preview `ADMIN_PASSWORD_HASH`, which is a configuration change, and nobody holds the current Preview password (it was shredded in Sprint v4). No application code changed since v4: `git diff 75688c9..HEAD` on `api/`, `lib/`, `middleware.ts`, `db/` and `vercel.json` is empty. The full admin flow (login, totals, search, CSV, delete, logout) passed locally in this release's `e2e:app` (24 steps) and `test:e2e:admin`. Checked on Preview: the login page, 401 without a session, 401 for a wrong password |
| Test records removed | One transaction: `e2e-*` visitors **4** (1 from the content check, 3 from the suite; their visits cascade), rate-limit windows started since 14:04:07 UTC **3**, admin sessions **0**. No genuine registration arrived during the check |
| Database after | visitors 3, visits 3, admin_sessions 0, rate_limits 0, test-pattern visitors 0 — identical to before |

**Content check** (one registered guest session, 1440 px). Every item passed:
- the served front page (`/`) is byte-identical to `V5_REVIEW_01/website/index.html`;
- 47 items;
- `MSG-001`:
  - it opens "From the President’s Desk" and shows the new English message;
  - the four charity items are a list;
  - the signature reads `Manik Barman` / `CE ’87` / `President, BECAA Maharashtra`;
  - no text of the old Bengali message remains;
- the `ART-011` byline reads "Palash Biswas, Mechanical, 2006 Batch";
- the front-page hero tagline is present;
- the PDF is served with a session and is byte-identical to the release PDF (SHA-256 `d982f11e6b7c…`).

## Unauthenticated probe results

| Check | Preview |
|---|---|
| `/` | 200, the welcome page (no magazine markup) |
| `/api/health` | 200 `{"ok":true,"db":true}` |
| PDF and artwork without a session | 403, 403 |
| `/print/` without a session | welcome page |
| Forged session cookie | treated as no session (welcome page) |
| `/api/admin/stats` without login | 401 |
| Administrator login with a wrong password | 401 |
| Cross-origin `POST /api/register` | 403 |
| `GET /api/register` | 405 |
| `/admin/` | 200 login form, `X-Frame-Options: DENY`, `Cache-Control: no-store` |
| Security headers on `/welcome/` | Content-Security-Policy, `nosniff`, `strict-origin-when-cross-origin`, HSTS |

## Test-record cleanup rule (unchanged from Sprint v4)

Only verification data is removed, in one transaction per database:
- visitors whose e-mail starts with `e2e-` (their visits cascade);
- admin sessions created since the verification start time;
- rate-limit windows started since the verification start time.

Registrations that do not match the test pattern are kept and reported.
