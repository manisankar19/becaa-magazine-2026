# Reproduction — V5_REVIEW_01

Built with Node 22.23.2 at git commit `b7ab7d1`. All commands run from `05_WEBSITE/`.

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
RELEASE_VERSION=V5_REVIEW_01 node scripts/release.mjs     # = npm run release:v5
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
npm run qa:pdf-compare:v5
npm run test:e2e:cover
npm run test:e2e:poem
npm run qa:pdf:v2-items
npm run qa:ad-backgrounds
npm run qa:art006
npm run qa:contact
npm run qa:v5-pages
npm run test:e2e:print-ads
npm run test:e2e:web-ads
npm run test:e2e:nav
npm run test:e2e:hero
npm run test:v4-advertisements
npm run test:v4-committee-corrections
npm run test:v5-updates
npm run test:e2e:welcome
npm run test:e2e:admin
npm run e2e:app
npm run check:secrets
npm run check:sql
npm audit --json   # gate: high/critical only if allow-listed in scripts/audit-allowlist.json
```

and then copies `_site/`, `qa-output/`, the validation and audit reports and the operational documents into `06_FINAL_OUTPUT/V5_REVIEW_01/` (refusing to overwrite an existing folder). `qa:pdf-compare:v5` compares the PDF with `06_FINAL_OUTPUT/V4_REVIEW_02` and fails on any unexplained page difference. Run the pipeline in the foreground: on a small host, background runs can be stopped for low memory.

## Rebuilding the v5 content changes from the V4_REVIEW_02 state

Only needed to replay the Sprint v5 content migration; the repository already contains the results. Each command is idempotent; run them in this order (the extraction writes the message verbatim and the corrections step re-applies the recorded owner corrections).

```sh
npm run extract:v5-president-desk
npm run corrections:apply-v5
npm run tracker:apply-v5
```

Deployment is a separate, approved step — see `DEPLOYMENT.md`.
