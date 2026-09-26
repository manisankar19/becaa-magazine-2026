# Sprint v5 — Preview and Production deployment of `V5_REVIEW_01` (Tasks 20–21)

Status: **`V5_REVIEW_02` released to Production on 2026-09-26** (15:41 UTC; `V5_REVIEW_01` was released at 14:21 UTC and is superseded). Production URL: `https://becaa-magazine-2026-portal.vercel.app`.

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

## Production (Task 21)

The owner chose the verification scope on 2026-09-26. The first Production step of the Sprint v4 procedure, pulling the Production environment to read the Production database, was blocked by the session's permission policy ("Production Reads"). The owner then chose **"Deploy with checks that leave nothing behind"**. So there was no Production environment pull, no Production database access and no test registration.

| Field | Value |
|---|---|
| Deployment | `https://becaa-magazine-2026-portal-efkqodur5-mani125slm.vercel.app` (`dpl_3rDCrfTKqGFLinh4BYpEE6bw5imR`), target `production`, `vercel deploy --prod` from `c7c9643`'s `05_WEBSITE/` tree (clean tree at `0ff7e60`, whose only later changes are sprint documents), 2026-09-26 14:21 UTC; aliased to `https://becaa-magazine-2026-portal.vercel.app` |
| Replaced | `…-3rbvgbgd5-…` (`V4_REVIEW_02` + front-page hero, commit `79ae6d0`). **Not deleted**: still in the deployment list and available for Instant Rollback. The Vercel project and Neon resources were not deleted or reconfigured |
| Environment variables | Not read and not changed |
| Migrations | Not checked on Production (that needs the Production database URL). Safe without it, because Sprint v5 changes no schema or database code: `git diff 75688c9..HEAD` on `db/`, `api/`, `lib/`, `middleware.ts` and `vercel.json` is empty. The Preview database of the same project reports Applied 1, Pending none |
| Unauthenticated probes | 11/11 as expected: the Preview table above, except the wrong-password login, which was deliberately skipped so the owner's live admin login counter was not touched (it passed on Preview with the same code) |
| Public files vs the `V5_REVIEW_01` build | `site.css`, `print.css`, `site.js`, `/welcome/`, `/admin/`: byte-identical |
| Content behind the gate | Not opened on Production (no registration). The evidence that Production serves the new message is indirect but strong. Production is the same `05_WEBSITE/` tree as the Preview deployment, where the served front page and PDF were byte-identical to `V5_REVIEW_01` and every content check passed. The five public files served by Production are byte-identical to that build |
| Database writes by the verification | None. The probes that reach the API return before any database access (405 for `GET /api/register`, 403 for the cross-origin POST, per the order documented in `api/register.ts`); `/api/health` runs only `select 1`; `/api/admin/stats` refuses with 401 without a session |
| Browser suite | Not run on Production: it creates registrations, which could not be removed without database access |

**Owner follow-up (optional):** open `https://becaa-magazine-2026-portal.vercel.app` and register (or use an existing session). Check that the President Desk shows the new English message with the four bullet points, and that ART-011 reads "Palash Biswas, Mechanical, 2006 Batch". Any registration you make is a real record in the Production database.

## Rollback

Vercel → project `becaa-magazine-2026-portal` → Deployments → `…-3rbvgbgd5-…` → Instant Rollback (or `vercel rollback`). No database change needs reverting, because no migration was applied.

## Addendum — `V5_REVIEW_02` (Tasks 29–30)

**Why:** `V5_REVIEW_01` in Production hid every gallery and advertisement image from visitors using an ad blocker, and never showed the card tints (PRD §11). `V5_REVIEW_02` fixes both. Approval: the owner's `/dev task 29 to 30`, 2026-09-26.

**Source:** release `06_FINAL_OUTPUT/V5_REVIEW_02/`, built at `fa83b7d`. Deployed from the clean tree at `76b39df`, whose `05_WEBSITE/` equals the build commit plus the deployable PDF (byte-identical to the release PDF, `d274c154…`).

### Preview (Task 29)

| Field | Value |
|---|---|
| Deployment | `https://becaa-magazine-2026-portal-k5q4b6721-mani125slm.vercel.app` (`dpl_E5F59cTnDPMG7mSk6nPKwgWJ1cxx`), target preview, 2026-09-26 15:26 UTC. Vercel's build wrote 5 files (the new `ad-tints.css` included) |
| Migrations | Applied 1, Pending none — nothing run |
| Database before (15:26 UTC) | visitors 3, visits 3, admin_sessions 0, rate_limits 0, test-pattern visitors 0 |
| Unauthenticated probes | 12/12, as in the table above (wrong-password login included) |
| Public files vs the `V5_REVIEW_02` build | `site.css`, **`ad-tints.css`**, `print.css`, `site.js`, `/welcome/`, `/admin/`: byte-identical |
| Content check (one registration, Chromium, deployed CSP enforced) | See below |
| Browser suite | `e2e:app --public-only`: **PASS, 14 steps**, run after the registration window had cleared (15:39 UTC) |
| Administrator flow | Not run on Preview (as in Task 20: it would need a Preview credential change, and the admin code is unchanged) |
| Test records removed | `e2e-*` visitors 4, rate-limit windows 3, admin sessions 0; no genuine registration arrived meanwhile |
| Database after | visitors 3, visits 3, admin_sessions 0, rate_limits 0 — identical to before |

**Content check**, one registered guest session at 1440 px under the deployed CSP. Every item passed:
- the served front page is byte-identical to `V5_REVIEW_02`'s `index.html`, with 47 items;
- **all 30 publication images loaded and visible**;
- **all 25 advertisement cards show their manifest tint**, now from `ad-tints.css`;
- the ART-006 numeric column is right-aligned;
- **0 CSP errors**; no `.ad-frame`/`.ad-link` element;
- the PDF is byte-identical to `V5_REVIEW_02` (`d274c154…`);
- **the same session at 390 px with all 13,078 EasyList generic hide rules injected: 30/30 images still visible.**

The rendered ADV-001 card (tint and Skylark artwork) was inspected by eye.

### Production (Task 30)

Same owner-chosen scope as Task 21: checks that leave nothing behind, with no Production environment pull, no database access and no registration.

| Field | Value |
|---|---|
| Deployment | `https://becaa-magazine-2026-portal-acdyrs0h7-mani125slm.vercel.app` (`dpl_Yy9VsSJ5VoSZ9LF9ewsfswsdR4hS`), target `production`, `vercel deploy --prod` from the same `05_WEBSITE/` tree as the Preview (`76b39df`; `git diff 76b39df HEAD -- 05_WEBSITE` empty), 2026-09-26 15:41 UTC; aliased to `https://becaa-magazine-2026-portal.vercel.app` |
| Replaced | `…-efkqodur5-…` (`V5_REVIEW_01`). Not deleted; it and `…-3rbvgbgd5-…` (`V4_REVIEW_02` + hero) remain available for Instant Rollback |
| Unauthenticated probes | 11/11 as expected (the wrong-password login was skipped so the owner's live login counter was not touched) |
| Public files vs the `V5_REVIEW_02` build | `site.css`, **`ad-tints.css`**, `print.css`, `site.js`, `/welcome/`, `/admin/`: byte-identical |
| Content behind the gate | Not opened on Production (no registration). The Preview of the identical tree passed every content, image, tint, CSP and ad-blocker check above, and the six public files served by Production match that build |
| Database writes by the verification | None (the same no-write probes as Task 21) |

**Incident, recorded:** two throwaway verification scripts (`.v5-content2.mjs`, `.v5-counts.mjs`; untracked, uncommitted) were in `05_WEBSITE/` during this deploy, and `.v5-counts.mjs` during the Preview deploy too. `.vercelignore` does not exclude them, so they were uploaded with the deployment source. Their exposure is limited:
- they contain no secrets (they read environment variables only at run time);
- they are not part of the built site, and `GET` for each returns 404 on Production;
- they are visible only in the deployment's source listing in the Vercel dashboard, to project members.

They were deleted afterwards. Follow-up: add `.*.mjs` to `.vercelignore`, or keep throwaway drivers outside `05_WEBSITE/` (see the walkthrough).

**Rollback:** Instant Rollback to `…-efkqodur5-…` (`V5_REVIEW_01`) or `…-3rbvgbgd5-…` (Sprint v4). No database change to revert.

## Unauthenticated probe results

| Check | Preview | Production |
|---|---|---|
| `/` | 200, the welcome page (no magazine markup) | same |
| `/api/health` | 200 `{"ok":true,"db":true}` | same |
| PDF and artwork without a session | 403, 403 | same |
| `/print/` without a session | welcome page | same |
| Forged session cookie | treated as no session (welcome page) | same |
| `/api/admin/stats` without login | 401 | same |
| Administrator login with a wrong password | 401 | skipped (owner’s live login counter) |
| Cross-origin `POST /api/register` | 403 | same |
| `GET /api/register` | 405 | same |
| `/admin/` | 200 login form, `X-Frame-Options: DENY`, `Cache-Control: no-store` | same |
| Security headers on `/welcome/` | Content-Security-Policy, `nosniff`, `strict-origin-when-cross-origin`, HSTS | same |

## Test-record cleanup rule (unchanged from Sprint v4)

Only verification data is removed, in one transaction per database:
- visitors whose e-mail starts with `e2e-` (their visits cascade);
- admin sessions created since the verification start time;
- rate-limit windows started since the verification start time.

Registrations that do not match the test pattern are kept and reported.
