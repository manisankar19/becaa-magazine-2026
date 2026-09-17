# Reproduction — V4_REVIEW_02

Built with Node 22.23.2 at git commit `ac05427`. All commands run from `05_WEBSITE/`.

## Prerequisites (once per machine)

```sh
npm install
npx playwright install chromium          # browser for tests, visual QA and the PDF (not installed by npm install)
# unzip, and poppler-utils for pdftotext/pdftoppm (PDF text checks, page renders, PDF comparison)
npm run db:local:start                    # PostgreSQL 16 cluster in .pgdata/ (needs pg_ctl/initdb on PATH); creates becaa_dev + becaa_test
cp .env.example .env.local                # then fill in DATABASE_URL(_TEST), SESSION_SECRET, IP_HASH_SALT (never commit it)
```

## Rebuild the release from the current repository state

```sh
RELEASE_VERSION=V4_REVIEW_02 node scripts/release.mjs     # = npm run release:v4
```

which runs, in this order:

```sh
npm run tracker:validate
npm run validate
npm run typecheck
npm run test:unit
npm run build
npm run pdf
npm run test
npm run test:integration
npm run qa
npm run qa:v2-items
npm run qa:pdf
npm run qa:pdf-compare
npm run test:e2e:cover
npm run test:e2e:poem
npm run qa:pdf:v2-items
npm run qa:ad-backgrounds
npm run qa:art006
npm run qa:contact
npm run qa:v4-pages
npm run test:e2e:print-ads
npm run test:e2e:web-ads
npm run test:e2e:nav
npm run test:v4-advertisements
npm run test:v4-committee-corrections
npm run test:e2e:welcome
npm run test:e2e:admin
npm run e2e:app
npm run check:secrets
npm run check:sql
npm audit --json   # gate: high/critical only if allow-listed in scripts/audit-allowlist.json
```

and then copies `_site/`, `qa-output/`, the validation and audit reports and the operational documents into `06_FINAL_OUTPUT/V4_REVIEW_02/` (refusing to overwrite an existing folder). `qa:pdf-compare` compares the PDF with `06_FINAL_OUTPUT/V3_REVIEW_02` and fails on any unexplained page difference.

## Rebuilding the v4 content changes from the V3_REVIEW_02 state

Only needed to replay the Sprint v4 content migration; the repository already contains the results. Each command is idempotent.

```sh
npm run extract:v4-golap
npm run normalize:v4-memorial-image
npm run manifest:apply-v4-updates
npm run tracker:apply-v4-updates
npm run corrections:apply-v4
npm run tracker:apply-v4-corrections
```

Deployment is a separate, approved step — see `DEPLOYMENT.md`.
