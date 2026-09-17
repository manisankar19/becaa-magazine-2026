# Sprint v4 — Preview and production deployment of `V4_REVIEW_02` (Tasks 45–46)

Status: **Released to Production on 2026-09-17.**

- **Production URL:** `https://becaa-magazine-2026-portal.vercel.app`
- **Owner approval:** 2026-09-17, in the Sprint v4 session: "deploy it to Preview. If Preview passes, deploy it to Production and replace the existing production deployment … Do not delete the Vercel project or Neon database."
- **Source:** review release `06_FINAL_OUTPUT/V4_REVIEW_02/`, built at `ac05427`. The deployments were made from commit `d0cc14c`, whose `05_WEBSITE/` tree adds only the deployable PDF (`release-assets/print/`, byte-identical to the release PDF) to the build commit. Deployed with the Vercel CLI 59.11.7 from `05_WEBSITE/`, linked to `mani125slm/becaa-magazine-2026-portal`.

## Production

| Field | Value |
|---|---|
| Deployment | `https://becaa-magazine-2026-portal-l8beok45l-mani125slm.vercel.app` (`dpl_7bSSKjNYU7fSRXundDy6BnDGrkbP`), target `production`, `vercel deploy --prod`, 2026-09-17 ≈01:25 UTC; aliased to `https://becaa-magazine-2026-portal.vercel.app` |
| Replaced | `…-c846gz3qp-…` (Sprint v3, commit `d707355`, 2026-09-15). **Not deleted**: it remains in the project's deployment list and is available for Instant Rollback. The Vercel project and both Neon resources were not deleted or reconfigured |
| Environment variables | Production variables unchanged (no secret, credential or database setting was added, removed or rotated) |
| Migrations | `db-migrate.mjs status` against the production database: Applied 1, Pending none. `db-migrate.mjs migrate` → "No pending migrations." (Sprint v4 has no schema change) |
| Database before (01:24 UTC) | visitors **1** (alumni), visits **1**, admin_sessions **0**, rate_limits **3**, test-pattern visitors **0** |
| Unauthenticated probes | See the results table below — all as expected |
| Browser suite | `e2e:app --base-url https://becaa-magazine-2026-portal.vercel.app --public-only`: **PASS, 14 steps** (desktop + mobile): welcome gate, server field errors, readable platform-error notice, alumni/sponsor/guest registration opens the magazine with correct cookie flags, protected artwork/gallery/PDF/print refused without a session |
| Content check | After the rate-limit window (01:37 UTC), one registered guest session showed: 47 items; the 8 navigation links; ADV-027/028/029 with no visible heading and named by `aria-label`, ADV-028 sentence once, old Balajee wording absent; MSG-001 `BECAA-র পরিচয়`; MSG-002 "Vice President Desk"; ART-004/ART-005 byline "Late Biswajit Sengupta, Civil, 1971 Batch" and author line `প্রয়াত বিশ্বজিৎ সেনগুপ্ত`; ART-009 "in a meeting he scheduled", no U+000C; `scroll-padding-top` 80px and the Advertisements jump at 80px below a 68px header; PDF 200, **byte-identical to the `V4_REVIEW_02` release PDF** |
| Administrator | Login page served with `X-Frame-Options: DENY` and `no-store`; `/api/admin/stats` 401 without a session; a wrong password 401. The full dashboard flow (login → totals → search → CSV → delete → logout) needs the owner's production password, which only the owner holds and which was not changed; the identical code passed that flow end to end on the Preview deployment (below) |
| Test records removed | Since 01:24:14 UTC: `e2e-*` visitors **4** (3 from the browser suite, 1 from the content check; visits cascade), rate-limit windows **4**, admin sessions **0**. Note: a genuine visitor registered at 01:35:25 UTC during verification (alumni, not a test address); that registration is **kept**, but its rate-limit counter row fell inside the cleanup window and was removed, which only resets that visitor's attempt counter |
| Database after | visitors **2** (both alumni: the registration from 2026-09-15 and the genuine one from 01:35:25 UTC), visits **2**, admin_sessions **0**, rate_limits **3** (the pre-existing rows), test-pattern visitors **0** |

## Preview

| Field | Value |
|---|---|
| Deployment | `https://becaa-magazine-2026-portal-f5t4vm7ss-mani125slm.vercel.app` (`dpl_2zJAPYBJgRTBdS2AUu4Y8z3bc95q`), target preview (`vercel deploy`, no `--prod`), 2026-09-17 ≈01:08 UTC; behind Vercel Deployment Protection |
| Access for automation | The local development OIDC token sent as `x-vercel-trusted-oidc-idp-token` (Trusted Sources, same project); protection settings unchanged; the token was never printed or stored in the repository |
| Administrator credential | Nobody held the previous preview-only password (shredded in Sprint v3). A new random 32-character preview-only password was generated in a mode-600 scratch file, hashed with `npm run admin:hash` (argon2id) and stored as the Preview `ADMIN_PASSWORD_HASH` (sensitive; the old Preview value removed first). The plaintext was shredded after the run, so again nobody holds it. Production credentials were not touched |
| Migrations | Applied 1, Pending none (no change) |
| Database before | visitors 12 (9 `e2e-*` rows left by Sprint v3 runs), visits 12, admin_sessions 0, rate_limits 2 |
| Unauthenticated probes | All as expected (same checks as production, see below) |
| Browser suite | `e2e:app --base-url <preview>` with the temporary administrator credential: **PASS, 22 steps** (desktop 12, mobile 10): welcome gate, field errors, platform-error notice, alumni/sponsor/guest registration, protected assets refused, **administrator login and dashboard counts, search, CSV export, deletion with refreshed counts, logout revoking the session**. Mobile registrations are skipped by the suite on remote targets (per-IP limit of 5 registrations per 10 minutes) |
| Content check (after the rate-limit window) | 47 items; navigation Contents, Messages, Articles, Gallery, Advertisements, Cultural Programmes, Connect, With Thanks; ADV-027/028/029 no visible heading, named by `aria-label`, ADV-028 sentence shown once, old Balajee wording absent; MSG-001 `BECAA-র পরিচয়`; MSG-002 "Vice President Desk"; ART-004/ART-005 byline "Late Biswajit Sengupta, Civil, 1971 Batch" and author line `প্রয়াত বিশ্বজিৎ সেনগুপ্ত`; ART-009 "in a meeting he scheduled" with no U+000C; `scroll-padding-top` 80px at 1440px and the Advertisements jump landing at 80px below a 68px header; PDF 200, **byte-identical to the `V4_REVIEW_02` release PDF** (21,167,886 bytes) |
| Test records removed | `e2e-*` visitors deleted: 11 (the 9 from Sprint v3 plus this run's; visits cascade), rate-limit windows started since 01:07:14 UTC: 2, admin sessions: 0 |
| Database after | visitors 3 (1 alumni, 1 guest, 1 sponsor — pre-existing rows that are not test-pattern registrations, left untouched), visits 3, admin_sessions 0, rate_limits 0 |

## Unauthenticated probe results (identical on Preview and Production)

| Check | Result |
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

## Test-record cleanup rule

Only verification data is removed, in one transaction per database:

- visitors whose e-mail starts with `e2e-` (the suite's and the content check's registrations; their visits cascade);
- admin sessions created since the verification start time;
- rate-limit windows started since the verification start time.

Registrations that existed before and do not match the test pattern are kept and reported.

## Rollback

Vercel → project `becaa-magazine-2026-portal` → Deployments → `…-c846gz3qp-…` → Instant Rollback (or `vercel rollback`). No database change needs reverting (no migration was applied).
