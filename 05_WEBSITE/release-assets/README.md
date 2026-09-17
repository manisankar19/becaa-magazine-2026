# release-assets

Static files that are part of the deployed site but cannot be generated on Vercel's build machines.

- `print/BECAA-2026-complete-review.pdf` — the print edition from `06_FINAL_OUTPUT/V4_REVIEW_02/` (72 pages; replaced 2026-09-17, previously V3_REVIEW_02) (built locally by
  `npm run pdf`, which needs Playwright's Chromium). Eleventy passthrough-copies it to `_site/print/`; a local
  `npm run pdf` regenerates the same file in place. Replace it only from an approved release folder.
