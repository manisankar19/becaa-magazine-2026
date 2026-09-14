# Sprint v3 — Preview deployment (Task 35)

Status: **Preview deployed and verified on the new project `becaa-magazine-2026-portal`; nothing deployed to Production.** Updated 2026-09-14. The rehearsal record that preceded it is kept below unchanged.

## Result (2026-09-14)

| Field | Value |
|---|---|
| Vercel project | `becaa-magazine-2026-portal` (team **Mani** `mani125slm`, framework *Other*, root `.` = `05_WEBSITE/`, Node 24.x) |
| Preview URL | `https://becaa-magazine-2026-portal-4qn4qi73u-mani125slm.vercel.app` (target `preview`, behind Vercel Deployment Protection) |
| Build | `06_FINAL_OUTPUT/V3_REVIEW_02` content; deployed from commit `c00b163` with `vercel deploy` (no `--prod`); later commits (`37e976a`, `65b3218`, `5274425`) change only the test harness, docs and ignore rules |
| Neon | Marketplace resource `becaa-magazine-2026-preview`, plan **Free** (`free_v3`, no payment method required, region iad1), connected to this project's **Preview** environment only; `DATABASE_URL` / `DATABASE_URL_UNPOOLED` injected by the integration |
| Migration | `db:status` against the preview database: Applied 1, Pending none |
| Preview variables | `DATABASE_URL`, `SESSION_SECRET`, `IP_HASH_SALT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `REGISTRATION_ENABLED`, `BATCH_YEAR_MIN` — Preview only; the Production and Development environments hold **no** variables |
| Administrator | `becaa-admin` with a temporary preview-only password (hash in Vercel Preview only); the plaintext lived in a mode-600 scratch file for the automated tests and was deleted after verification |
| `e2e:app --base-url` | **PASS — 20 steps** (desktop 1440×1000: 11 steps; mobile 390×1200: 9 steps, registrations skipped because of the per-IP limit) at 16:31 UTC; covers welcome gate, validation errors, alumni/sponsor/guest registration with cookie flags, protected artwork/gallery/PDF/print refusal, admin login and totals, search, CSV export (12 approved columns, no IP hash/token/user-agent), deletion, logout revocation. Screenshots in `05_WEBSITE/qa-output/app/` |
| Security probes | direct content URLs, print page and PDF refused without a session (pages rewritten to `/welcome/`, PDF/artwork 403); forged session cookie treated as no session; admin APIs 401 without login; cross-origin POSTs 403; wrong method 405, oversized body 413, non-JSON 415, wrong admin password 401; CSP / nosniff / referrer-policy / HSTS present, `/admin/` carries `X-Frame-Options: DENY` and `no-store` |
| Old project | The previous `becaa-magazine-2026` project was deleted by the owner from the dashboard on 2026-09-14 (15:53 UTC); `https://becaa-magazine-2026.vercel.app` now returns 404 `DEPLOYMENT_NOT_FOUND`. The V1 site is therefore no longer online |
| Production | Not deployed. Promote only with an explicit instruction (`vercel deploy --prod` from `05_WEBSITE/` after setting Production variables and a production database) |

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
