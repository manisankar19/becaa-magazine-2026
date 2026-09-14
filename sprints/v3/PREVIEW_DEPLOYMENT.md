# Sprint v3 — Preview deployment rehearsal (Task 35)

Status: **Not deployed — stopped before creating any resource.** Recorded 2026-09-14.

## What was checked

- `vercel whoami` on this host succeeds (logged in as the personal account `manisankar19-1173`); one team is also available: **Mani** (`mani125slm`), which already holds the earlier `mani-slm-*` projects.
- No Vercel project is linked to `05_WEBSITE/` and none named for this magazine exists yet.
- `vercel link` can run non-interactively (`--yes --project <name> [--team <slug>]`), but the **team choice is Decision O's outstanding value** and was never supplied.
- `vercel integration add neon` requires a billing plan id (`--plan`) and accepts the marketplace terms on the account — a new paid-service/billing decision that INSTRUCTION.md §19 reserves for you, even on a free tier.
- Nothing else in Task 35 can proceed without those two answers, so no project, integration, environment variable or deployment was created. Production was never a target.

## What you need to decide

1. **Team or personal account** for the new project: personal (`manisankar19-1173`) or team **Mani** (`mani125slm`).
2. **Project name** (suggested: `becaa-magazine-2026`).
3. **Neon plan**: run `vercel integration add neon --help` to list plan ids, choose the free tier, and accept the marketplace terms yourself.
4. **Administrator username** (Decision N) and a password of at least 12 characters — hashed locally with `npm run admin:hash`.

## Exact commands to run (from `05_WEBSITE/`, in this order)

```sh
# 1. Link a new project (add --team mani125slm to use the Mani team; omit for the personal account)
vercel link --yes --project becaa-magazine-2026

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
