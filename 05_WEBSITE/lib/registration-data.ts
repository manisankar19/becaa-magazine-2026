// Editorial registration lists (Sprint v3). Mirrors src/_data/registration.json, which Eleventy reads for
// the templates; tests/unit/validate-registration.test.mjs asserts the two stay identical. Kept as plain
// TypeScript because Vercel's edge bundler (middleware) rejects JSON import attributes.
export const registration = {
  "departments": [
    "Civil Engineering",
    "Mechanical Engineering",
    "Electrical Engineering",
    "Electronics & Telecommunication Engineering",
    "Computer Science & Technology",
    "Information Technology",
    "Metallurgy & Materials Engineering",
    "Mining Engineering",
    "Architecture",
    "Aerospace Engineering & Applied Mechanics",
    "Other"
  ],
  "batchYearMin": 1950,
  "privacyVersion": 1,
  "retentionDate": "31 December 2027",
  "contactEmail": "becaa.maharashtra@gmail.com"
} as const;
