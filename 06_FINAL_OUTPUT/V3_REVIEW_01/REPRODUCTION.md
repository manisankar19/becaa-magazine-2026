# Reproduction — V3_REVIEW_01

Built with Node 22.23.2 at git commit `8c797f2`. All commands run from `05_WEBSITE/`.

## Prerequisites (once per machine)

```sh
npm install
npx playwright install chromium          # browser for tests, visual QA and the PDF (not installed by npm install)
npm run db:local:start                    # PostgreSQL 16 cluster in .pgdata/ (needs pg_ctl/initdb on PATH); creates becaa_dev + becaa_test
cp .env.example .env.local                # then fill in DATABASE_URL(_TEST), SESSION_SECRET, IP_HASH_SALT (never commit it)
```

## Rebuild the release from the current repository state

```sh
RELEASE_VERSION=V3_REVIEW_01 node scripts/release.mjs     # = npm run release:v3
```

which runs, in this order:

```sh
npm run tracker:validate
npm run validate
npm run typecheck
npm run test:unit
npm run build
npm run test
npm run test:integration
npm run qa
npm run qa:v2-items
npm run pdf
npm run qa:pdf
npm run qa:pdf:v2-items
npm run qa:ad-backgrounds
npm run qa:art006
npm run qa:contact
npm run test:e2e:print-ads
npm run test:e2e:web-ads
npm run test:e2e:welcome
npm run test:e2e:admin
npm run e2e:app
npm run check:secrets
npm run check:sql
npm audit --json   # gate: high/critical only if allow-listed in scripts/audit-allowlist.json
```

and then copies `_site/`, `qa-output/`, the validation and audit reports and the operational documents into `06_FINAL_OUTPUT/V3_REVIEW_01/` (refusing to overwrite an existing folder).

## Rebuilding the v3 content changes from the pre-sprint state

Only needed to replay the Sprint v3 content migration on a tracker/manifest as they were before the sprint; the repository already contains the results.

```sh
npm run extract:v3-secretary-desk
npm run extract:v3-siddhartha-story
npm run manifest:apply-v3-updates
npm run retitle:advertisements
npm run tracker:apply-v3-updates
npm run sample:ad-backgrounds
npm run manifest:apply-v3-ad-overrides
```

Deployment is a separate, approved step — see `DEPLOYMENT.md`.
