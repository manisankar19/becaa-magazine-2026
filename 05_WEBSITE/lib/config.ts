// Application configuration for the registration feature (Sprint v3, Decisions I, J, L).
// Editorial lists live here (not in the database) so they are reviewable in a diff.

// Editorial lists shared with the Eleventy templates: lib/registration-data.ts mirrors src/_data/registration.json
// (a unit test keeps them identical). No JSON import attribute — the edge bundler does not support them.
import { registration } from "./registration-data.js";

export const DEPARTMENTS = registration.departments as readonly string[];

export type Department = string;

export const CATEGORIES = ["alumni", "sponsor", "guest"] as const;
export type Category = (typeof CATEGORIES)[number];

export const BATCH_YEAR_MIN = Number(process.env.BATCH_YEAR_MIN ?? registration.batchYearMin);
export function batchYearMax(): number {
  return new Date().getFullYear();
}

// Bump when the privacy-notice wording changes so consent can be attributed to a version.
export const PRIVACY_VERSION = registration.privacyVersion;
export const RETENTION_DATE = registration.retentionDate;

export const LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 254 },
  organisation: { min: 2, max: 160 },
  departmentOther: { min: 2, max: 80 },
} as const;

export const VISITOR_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const ADMIN_SESSION_ABSOLUTE_SECONDS = 12 * 60 * 60;      // 12 hours
export const ADMIN_SESSION_IDLE_SECONDS = 60 * 60;                // 60 minutes

export const RATE_LIMITS = {
  register: { limit: 5, windowSeconds: 10 * 60 },
  adminLogin: { limit: 5, windowSeconds: 15 * 60, lockoutAfter: 10, lockoutSeconds: 15 * 60 },
} as const;

export const MIN_FORM_FILL_MS = 2000;
export const MAX_BODY_BYTES = 8 * 1024;
