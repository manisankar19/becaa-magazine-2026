# Sprint v3 — Preview deployment (Task 35)

Status: **Preview deployed and verified on the new project `becaa-magazine-2026-portal`.** Updated 2026-09-15 — see *Incident 2026-09-15* below: the project's first CLI deployment was registered by Vercel as its Production deployment. The rehearsal record that preceded it is kept below unchanged.

## Result (2026-09-14)

| Field | Value |
|---|---|
| Vercel project | `becaa-magazine-2026-portal` (team **Mani** `mani125slm`, framework *Other*, root `.` = `05_WEBSITE/`, Node 24.x) |
| Preview URL | `https://becaa-magazine-2026-portal-bu5zjgbsm-mani125slm.vercel.app` (target `preview`, behind Vercel Deployment Protection). Same code as `…-jt4s92ag7-…` (kept, verified 00:20 UTC) but redeployed at 00:50 UTC so the replaced `ADMIN_PASSWORD_HASH` takes effect — Vercel fixes variables into a deployment at build time |
| Build | `06_FINAL_OUTPUT/V3_REVIEW_02` content; current preview deployed from commit `b403465` with `vercel deploy` (no `--prod`) |
| Neon | Marketplace resource `becaa-magazine-2026-preview`, plan **Free** (`free_v3`, no payment method required, region iad1), connected to this project's **Preview** environment only; `DATABASE_URL` / `DATABASE_URL_UNPOOLED` injected by the integration |
| Migration | `db:status` against the preview database: Applied 1, Pending none |
| Preview variables | `DATABASE_URL`, `SESSION_SECRET`, `IP_HASH_SALT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `REGISTRATION_ENABLED`, `BATCH_YEAR_MIN` — Preview only; the Production and Development environments hold **no** variables |
| Administrator | `becaa-admin`. Temporary preview-only password replaced on 2026-09-15 (new argon2id hash in Vercel Preview only; Production and Development hold none). The plaintext lived in a mode-600 scratch file for the automated tests and was shredded after the 00:52 UTC run — nobody holds it; set a real credential before production |
| `e2e:app --base-url` | 2026-09-15 00:52 UTC on `…-bu5zjgbsm-…`: **PASS — 22 steps** (desktop 12, mobile 10): welcome gate, field errors, platform-error notice, alumni/sponsor/guest registration with cookie flags, protected artwork/gallery/PDF/print refusal, administrator login and totals, search, CSV export (12 approved columns), deletion, logout revocation (stats 401 afterwards). Earlier: 00:20 UTC `--public-only` 14 steps on `…-jt4s92ag7-…`; 2026-09-14 16:31 UTC 20 steps on `…-4qn4qi73u-…` |
| Security probes | direct content URLs, print page and PDF refused without a session (pages rewritten to `/welcome/`, PDF/artwork 403); forged session cookie treated as no session; admin APIs 401 without login; cross-origin POSTs 403; wrong method 405, oversized body 413, non-JSON 415, wrong admin password 401; CSP / nosniff / referrer-policy / HSTS present, `/admin/` carries `X-Frame-Options: DENY` and `no-store` |
| Old project | The previous `becaa-magazine-2026` project was deleted by the owner from the dashboard on 2026-09-14 (15:53 UTC); `https://becaa-magazine-2026.vercel.app` now returns 404 `DEPLOYMENT_NOT_FOUND`. The V1 site is therefore no longer online |
| Production | None. Vercel had recorded the project's first CLI deployment (`…-buhch1als-…`, 2026-09-14 15:58 UTC, commit `2218f18`) as target `production` although it was made without `--prod` (see incident below). On the owner's instruction it was removed with `vercel remove` on 2026-09-15 00:48 UTC; the project's production target is now empty and `https://becaa-magazine-2026-portal.vercel.app` returns 404. Nothing has been promoted |

### Incident 2026-09-15 — registration showed `[object Object]`

- **Symptom.** Submitting the registration form on `https://becaa-magazine-2026-portal.vercel.app` showed the notice `[object Object]`.
- **Cause (from runtime logs).** That hostname is the project's production domain and serves the first deployment (`…-buhch1als-…`), built from commit `2218f18` when the API modules still used a default export. Vercel's Node runtime treats a default export as `(req, res)`, so the handler received a Node request: `TypeError: request.headers.get is not a function at requestHost (lib/http.ts:47)`. The function crashed (`FUNCTION_INVOCATION_FAILED`) and, because the page sends `Accept: application/json`, the platform replied with `{"error":{"code":"500","message":"A server error has occurred"}}`. `welcome.js` showed `body.error`, an object, hence `[object Object]`.
- **Why that deployment is production.** The Vercel activity log records the 15:58 deployment as "deployed … to production (via Vercel CLI)" although it was made without `--prod`; the two later deployments (16:06 and 00:16 UTC next day) are `preview`. Nothing was promoted, aliased or deployed with `--prod`.
- **Fix (commit `be6297b`).** `welcome.js` renders only strings: a string `error` is shown as-is; an object with a `message` is shown with the status (e.g. "The server had a problem saving your registration (error 500: A server error has occurred). Please try again in a moment."); 429 gets the rate-limit text; field messages fall back to fixed text. Every `api/` module is wrapped in `guarded()` (`lib/http.ts`), so an unexpected exception returns `{ ok: false, error: "<string>" }` with the security headers and logs the message only. Tests: unit `http-guarded.test.mjs`, E2E step that mocks the platform payload (desktop and mobile), `--public-only` mode for runs without an administrator credential.
- **Verification.** New preview `…-jt4s92ag7-…`: `/api/health` ok/db true; alumni, sponsor and guest registration succeed from a real browser (see the E2E line above); GET on `/api/register` → 405 JSON; timing failure → 422 JSON; the old production-target deployment returned the platform 500 until it was removed.

Fixes needed to make the build run on Vercel (all committed): `.js` import specifiers and `moduleResolution: bundler`; the registration lists as a TypeScript data module (the edge bundler rejects JSON import attributes); `trailingSlash` removed from `vercel.json` (it 308-redirected `/api/*`); the print PDF shipped as a static release asset; the `api/` modules export a Web-standard `fetch` handler (a default export is treated as the Node `(req, res)` signature and its `Response` is discarded); the E2E suite authenticates to the protected preview with the project's Protection Bypass for Automation secret.

Notes for the next run: registration is rate-limited to 5 per 10 minutes per IP, so the remote suite cannot be repeated within ten minutes; the preview database keeps the `e2e-*` rows the suite did not delete (a few test rows from the runs on 2026-09-14) — purge with `npm run db:purge` against the preview `DATABASE_URL` if a clean slate is wanted.

---

# Rehearsal record (superseded)

Status at the time: **Not deployed — stopped before creating any resource.** Recorded 2026-09-14.

## What was checked

- `vercel whoami` on this host succeeds (logged in as the personal account `manisankar19-1173`); one team is also available: **Mani** (`mani125slm`), which already holds the earlier `mani-slm-*` projects.
- No Vercel project is linked to `05_WEBSITE/` (no `.vercel/` directory).
- **Correction (found during the Stream B walkthrough, 2026-09-14):** a project named **`becaa-magazine-2026` already exists in the Mani team** (`mani125slm`, id `prj_UXFnROuxB6DSckbMQJT3oa0zRji0`), created 02 August 2026 with one **Production** deployment that is still live at `https://becaa-magazine-2026.vercel.app`. It serves the V1-era magazine (title "একই শিকড়", "Version 1 local review", 40 items) **without any gate**, and its advertisement artwork is directly reachable. It predates Sprints v2 and v3 and is not recorded in `CHANGELOG.md` or any sprint document; nothing in this sprint touched it. Its settings are Node 24.x, root directory `.`, output directory `public`/`.` — different from what `vercel.json` in `05_WEBSITE/` declares, so link with the root directory set to `05_WEBSITE` (or create a fresh project) and re-check the settings before any deploy. **Any `vercel deploy --prod` against it replaces that live site.**
- `vercel link` can run non-interactively (`--yes --project <name> [--team <slug>]`), but the **team choice is Decision O's outstanding value** and was never supplied.
- `vercel integration add neon` requires a billing plan id (`--plan`) and accepts the marketplace terms on the account — a new paid-service/billing decision that INSTRUCTION.md §19 reserves for you, even on a free tier.
- Nothing else in Task 35 can proceed without those two answers, so no project, integration, environment variable or deployment was created. Production was never a target.

## What you need to decide

1. **Which project**: link `05_WEBSITE/` to the existing team project `mani125slm/becaa-magazine-2026` (then fix its Root Directory to `05_WEBSITE` in the dashboard, or leave root `.` and rely on `vercel.json`), or create a new project on the personal account (`manisankar19-1173`) and later retire the old one. Decide also what should happen to the **currently public, ungated V1 site** at `https://becaa-magazine-2026.vercel.app` until V3 is approved (leave, or pause the project with `vercel project pause` / the dashboard).
2. **Project name** if creating a new one (e.g. `becaa-magazine-2026-v3`).
3. **Neon plan**: run `vercel integration add neon --help` to list plan ids, choose the free tier, and accept the marketplace terms yourself.
4. **Administrator username** (Decision N) and a password of at least 12 characters — hashed locally with `npm run admin:hash`.

## Exact commands to run (from `05_WEBSITE/`, in this order)

```sh
# 1a. Link the EXISTING team project (preview deploys do not touch its production deployment) …
vercel link --yes --team mani125slm --project becaa-magazine-2026
# 1b. … or create a new project on the personal account instead
# vercel link --yes --project becaa-magazine-2026-v3

# 2. Provision Neon for Preview only and let it inject DATABASE_URL (choose the plan id from --help)
vercel integration add neon --environment preview --plan <FREE_PLAN_ID> --name becaa-magazine-2026-preview

# 3. Secrets for Preview (each command prompts for the value; paste, never store in a file)
openssl rand -base64 32 | vercel env add SESSION_SECRET preview
openssl rand -base64 24 | vercel env add IP_HASH_SALT preview
printf '%s' '<your admin username>' | vercel env add ADMIN_USERNAME preview
npm run admin:hash            # masked prompt; copy the printed hash
vercel env add ADMIN_PASSWORD_HASH preview        # paste the hash when prompted
printf 'true' | vercel env add REGISTRATION_ENABLED preview
printf '1950' | vercel env add BATCH_YEAR_MIN preview

# 4. Apply the schema to the preview database (owner connection string from the Neon console or `vercel env pull`)
vercel env pull .env.preview.local --environment preview   # git-ignored (.env.*)
DATABASE_URL="$(grep '^DATABASE_URL=' .env.preview.local | cut -d= -f2- | tr -d '"')" npm run db:migrate
DATABASE_URL="$(grep '^DATABASE_URL=' .env.preview.local | cut -d= -f2- | tr -d '"')" npm run db:status   # expect Applied: 1

# 5. Build locally exactly as Vercel will, then deploy a preview
npm run build && vercel deploy        # prints https://becaa-magazine-2026-<hash>-<scope>.vercel.app

# 6. Verify the preview with the live-browser suite (credentials exported for this shell only)
E2E_ADMIN_USERNAME='<your admin username>' E2E_ADMIN_PASSWORD='<the password you hashed>' \
  npm run e2e:app -- --base-url https://<preview-url>

# 7. Record the result here: preview URL, git commit (`git rev-parse --short HEAD`), date, and the e2e:app summary line.
```

Notes:
- Steps 1–3 create the project, the Neon resource and the Preview variables; nothing touches Production.
- If the preview URL is protected by Vercel Deployment Protection, run the suite with a bypass token or open the URL once in a logged-in browser first (see the `vercel:access-protected-vercel-deployment` guidance).
- `.env.preview.local` is covered by the `.env.*` ignore rule; delete it after use.

## Result

| Field | Value |
|---|---|
| Preview URL | — (not deployed) |
| Commit | — |
| Date | — |
| `e2e:app` result | — |
