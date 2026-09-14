// Unit test for lib/validate-registration.ts + lib/config.ts — Sprint v3 Task 20. Hermetic.
// Run with: node --import tsx tests/unit/validate-registration.test.mjs
import assert from "node:assert/strict";
import { DEPARTMENTS, BATCH_YEAR_MIN, PRIVACY_VERSION, batchYearMax } from "../../lib/config.ts";
import { validateRegistration, normaliseMobile, normaliseEmail } from "../../lib/validate-registration.ts";

const year = new Date().getFullYear();
assert.equal(BATCH_YEAR_MIN, 1950);
assert.equal(PRIVACY_VERSION, 1);
assert.equal(batchYearMax(), year);
assert.deepEqual(DEPARTMENTS, ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Electronics & Telecommunication Engineering", "Computer Science & Technology", "Information Technology", "Metallurgy & Materials Engineering", "Mining Engineering", "Architecture", "Aerospace Engineering & Applied Mechanics", "Other"]);

const alumni = { name: "Abir Banerjee", email: "Abir@Example.co.in", category: "alumni", batch_year: "1992", department: "Electronics & Telecommunication Engineering", consent: true };
const sponsor = { name: "Priya", email: "priya@eframe.in", category: "sponsor", organisation: "Eframe Infomedia", mobile: "+91 98360 63677", consent: "on" };
const guest = { name: "Guest One", email: "g@x.org", category: "guest", consent: true };
const bengaliName = "সিদ্ধার্থ মুখোপাধ্যায়"; // সিদ্ধার্থ মুখোপাধ্যায়
const ok = (input) => { const r = validateRegistration(input); assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`); return r.value; };
const bad = (input, field) => {
  const r = validateRegistration(input);
  assert.equal(r.ok, false, `expected error on ${field}, got ok ${JSON.stringify(r)}`);
  assert.ok(r.errors[field], `expected error on "${field}", got ${JSON.stringify(r.errors)}`);
  const raw = String(input[field] ?? "");
  if (raw.length >= 3) assert.ok(!JSON.stringify(r.errors).includes(raw), "error message must not echo the raw input");
  return r.errors;
};
let n = 0; const t = (label, fn) => { fn(); n += 1; };

// --- happy paths ---
t("alumni ok", () => { const v = ok(alumni); assert.deepEqual(v, { name: "Abir Banerjee", email: "abir@example.co.in", category: "alumni", batch_year: 1992, department: "Electronics & Telecommunication Engineering", department_other: null, organisation: null, mobile: null, consent: true }); });
t("sponsor ok", () => { const v = ok(sponsor); assert.equal(v.mobile, "9836063677"); assert.equal(v.organisation, "Eframe Infomedia"); assert.equal(v.batch_year, null); assert.equal(v.department, null); });
t("guest ok minimal", () => { const v = ok(guest); assert.equal(v.organisation, null); assert.equal(v.mobile, null); });
t("guest with optional fields", () => { const v = ok({ ...guest, organisation: "Rotary", mobile: "0 98360-63677" }); assert.equal(v.mobile, "9836063677"); });
t("alumni Other department with free text", () => { const v = ok({ ...alumni, department: "Other", department_other: "Naval Architecture" }); assert.equal(v.department, "Other"); assert.equal(v.department_other, "Naval Architecture"); });
t("non-.com domains accepted", () => { ok({ ...guest, email: "user@example.co.in" }); ok({ ...guest, email: "a.b+tag@sub.example.museum" }); });
t("name whitespace collapsed", () => { assert.equal(ok({ ...guest, name: "  Rana   Roy  " }).name, "Rana Roy"); });
t("Bengali name accepted", () => { assert.equal(ok({ ...guest, name: bengaliName }).name, bengaliName); });
t("consent 'on' / 'true' / true accepted", () => { ok({ ...guest, consent: "on" }); ok({ ...guest, consent: "true" }); ok({ ...guest, consent: true }); });
t("batch year as number or string", () => { assert.equal(ok({ ...alumni, batch_year: 2006 }).batch_year, 2006); assert.equal(ok({ ...alumni, batch_year: " 2006 " }).batch_year, 2006); });
t("unknown fields dropped (mass assignment)", () => { const v = ok({ ...guest, role: "admin", visit_count: 999, id: "x" }); assert.ok(!("role" in v) && !("visit_count" in v) && !("id" in v)); });
t("department_other ignored unless Other", () => { assert.equal(ok({ ...alumni, department_other: "junk" }).department_other, null); });
t("alumni ignore sponsor fields", () => { const v = ok({ ...alumni, organisation: "X", mobile: "9836063677" }); assert.equal(v.organisation, null); assert.equal(v.mobile, null); });

// --- name ---
t("name required", () => bad({ ...guest, name: "" }, "name"));
t("name too short", () => bad({ ...guest, name: "A" }, "name"));
t("name too long", () => bad({ ...guest, name: "x".repeat(121) }, "name"));
t("name control chars", () => bad({ ...guest, name: "Bad" + String.fromCharCode(7) + "Name" }, "name"));
// --- email ---
t("email required", () => bad({ ...guest, email: "" }, "email"));
t("email a@b (no dot in domain)", () => bad({ ...guest, email: "a@b" }, "email"));
t("email missing @", () => bad({ ...guest, email: "abc.example.com" }, "email"));
t("email two @", () => bad({ ...guest, email: "a@@b.com" }, "email"));
t("email spaces", () => bad({ ...guest, email: "a b@c.com" }, "email"));
t("email too long", () => bad({ ...guest, email: `${"a".repeat(250)}@b.co` }, "email"));
t("email bad TLD", () => bad({ ...guest, email: "a@b.c0m-" }, "email"));
// --- category ---
t("category required", () => bad({ ...guest, category: "" }, "category"));
t("category enum", () => bad({ ...guest, category: "robot" }, "category"));
// --- alumni ---
t("alumni batch year required", () => bad({ ...alumni, batch_year: "" }, "batch_year"));
t("alumni batch year 1949 below min", () => bad({ ...alumni, batch_year: "1949" }, "batch_year"));
t("alumni batch year in the future", () => bad({ ...alumni, batch_year: String(year + 1) }, "batch_year"));
t("alumni batch year not 4 digits", () => bad({ ...alumni, batch_year: "92" }, "batch_year"));
t("alumni department required", () => bad({ ...alumni, department: "" }, "department"));
t("alumni department not in list", () => bad({ ...alumni, department: "Civil" }, "department"));
t("alumni Other needs free text", () => bad({ ...alumni, department: "Other", department_other: " " }, "department_other"));
t("alumni Other free text too long", () => bad({ ...alumni, department: "Other", department_other: "x".repeat(81) }, "department_other"));
// --- sponsor / guest ---
t("sponsor organisation required", () => bad({ ...sponsor, organisation: "" }, "organisation"));
t("sponsor mobile required", () => bad({ ...sponsor, mobile: "" }, "mobile"));
t("mobile 9 digits", () => bad({ ...sponsor, mobile: "983606367" }, "mobile"));
t("mobile 11 digits", () => bad({ ...sponsor, mobile: "98360636771" }, "mobile"));
t("mobile starts with 5", () => bad({ ...sponsor, mobile: "5836063677" }, "mobile"));
t("mobile letters", () => bad({ ...sponsor, mobile: "98360abcde" }, "mobile"));
t("guest bad optional mobile still rejected", () => bad({ ...guest, mobile: "123" }, "mobile"));
t("organisation too long", () => bad({ ...guest, organisation: "x".repeat(161) }, "organisation"));
// --- consent ---
t("consent required", () => bad({ ...guest, consent: false }, "consent"));
t("consent 'off'", () => bad({ ...guest, consent: "off" }, "consent"));
t("multiple errors reported together", () => { const e = bad({ name: "", email: "nope", category: "alumni", consent: false }, "name"); assert.ok(e.email && e.category === undefined && e.batch_year && e.department && e.consent); });
t("non-object input", () => { assert.equal(validateRegistration(null).ok, false); assert.equal(validateRegistration("x").ok, false); });

// --- helpers ---
assert.equal(normaliseMobile("+91 98360 63677"), "9836063677");
assert.equal(normaliseMobile("+91-9836063677"), "9836063677");
assert.equal(normaliseMobile("09836063677"), "9836063677");
assert.equal(normaliseMobile("9836063677"), "9836063677");
assert.equal(normaliseMobile("91 98360 63677"), "9836063677");
assert.equal(normaliseEmail("  Abir@Example.CO.IN "), "abir@example.co.in");
assert.ok(n >= 25, `at least 25 cases, ran ${n}`);
console.log(`All validate-registration unit tests passed (${n} cases + helpers).`);
