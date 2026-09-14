# BECAA Magazine 2026 — Sprint v3 Change Summary

## Baseline

- Project: `/home/ec2-user/research/projects/becaa-magazine-2026`
- Protected baseline: `06_FINAL_OUTPUT/V2_REVIEW_01/`
- Sprint planning location: `sprints/v3/`
- Proposed first output: `06_FINAL_OUTPUT/V3_REVIEW_01/`
- Preserve all V0, V1 and V2 outputs unchanged.

## Confirmed content changes

### 1. Replace Secretary's Desk

- Revised source: `02_INCOMING_CONTENT/secretary desk.docx`
- Identify the existing Secretary's Desk content ID and replace its published body with the revised document.
- Preserve the earlier source and record the replacement in the tracker and changelog.
- Compare the old and revised files before import so that the correct message is replaced rather than duplicated.

### 2. Publish the approved Siddhartha Mukhopadhyay story

- Source: `02_INCOMING_CONTENT/v2-incoming/Siddhartha Mukhopadhyay story.docx`
- This item was previously pending approval and is now approved.
- Reconcile it with its existing tracker/addendum row and content ID.
- Include it in both the website and print/PDF unless the tracker explicitly identifies a different destination.
- Do not create a duplicate tracker row if a pending row already exists.

## Advertisement presentation changes

### 3. Use advertisement-matched page backgrounds

Some advertisement artwork does not fill the printable page, leaving excessive white space. The surrounding advertisement page should use a restrained background colour sampled from or visually matched to that advertisement.

Requirements:

- Apply the colour to the advertisement page container only, not to the source artwork.
- Preserve the advertisement image's aspect ratio and complete contents.
- Do not crop, stretch, recolour or edit the supplied advertisement.
- Choose a suitable background independently for each advertisement, using a dominant edge/background colour or an explicitly configured colour.
- Maintain enough contrast for the advertisement heading, acknowledgement text and page number.
- Avoid bright automatic colours when they reduce readability. Permit a manually configured override per advertisement.
- For the shown Eframe example, a matching yellow background is appropriate.
- Apply equivalent presentation on the website and in the print/PDF where practical.
- Visually inspect every advertisement page after generation.

### 4. Revise the Eframe heading

Replace the public-facing heading:

`Eframe Advertisement`

with:

`With best compliments from Eframe`

Use this wording consistently in the website, PDF, manifest and tracker display title where appropriate. Preserve the original advertisement artwork and source filename.

## Viewer registration and administration portal

### 5. Add controlled viewer access

The website should collect basic viewer information before allowing access to the magazine. This converts the current static Eleventy deployment into an application with persistent data and therefore requires a server-side database and authenticated administrative functions.

Do not store registrations in a publicly downloadable static file or browser-only storage. Do not expose administrator credentials, database credentials or the full viewer list in client-side JavaScript.

### Visitor entry flow

Before accessing the magazine, ask for:

- Name
- Email address
- Visitor category:
  - BE College/IIEST alumni
  - Sponsor/company representative
  - Other guest

For alumni, additionally collect:

- Pass-out year/batch
- Department/branch

For sponsor/company representatives or other guests, collect as applicable:

- Company/organisation name
- Ten-digit Indian mobile number

The exact need for a visitor-created password should be reconsidered during PRD preparation. If the purpose is only to count and identify viewers, a registration gate with a secure session is preferable to collecting and storing visitor passwords. If persistent user accounts are approved, passwords must be salted and hashed using a standard server-side authentication library and must never be stored or exported in plain text.

### Validation

- Name must not be empty and should have sensible length limits.
- Email must use browser validation plus server-side validation. Do not rely only on the presence of `@` or `.com`, because valid addresses may use other domains.
- Pass-out year must be a four-digit plausible year within an approved range.
- Department should use an approved dropdown plus `Other`, rather than uncontrolled spelling variants.
- Indian mobile number must contain exactly 10 digits after removing permitted spaces or country prefix formatting.
- Validate and sanitize every value again on the server.
- Rate-limit submissions and prevent automated abuse.

### Administrator portal

Provide a separate protected administrator login with:

- Administrator username
- Password entered through a masked password field
- Server-side authentication
- Secure session expiry and logout

The administrator dashboard should show:

- Total registered viewers
- Total visits where reliably measurable
- Alumni, sponsor and other-guest counts
- Batch-wise counts
- Department-wise counts
- Registration date/time
- Searchable viewer records
- CSV download of approved fields

Passwords, password hashes, session tokens and internal security fields must never be included in the CSV export.

### Privacy and data handling

- Display a short privacy notice explaining why the information is collected and who can access it.
- Collect only data needed for viewer statistics and association follow-up.
- Obtain explicit consent before submission.
- Define retention and deletion rules.
- Restrict the CSV download to authenticated administrators.
- Use HTTPS and secure cookies in production.
- Keep secrets in deployment environment variables, never in source files.
- Create backup and recovery provisions for the database.

### Recommended architecture

- Retain Eleventy for generating the magazine pages if practical.
- Add server-side API endpoints and a managed relational database for registrations and sessions.
- Vercel Postgres/Neon or another managed PostgreSQL service is suitable.
- Use a mature authentication solution or carefully reviewed server-side authentication rather than a custom plaintext credential system.
- The PRD must decide whether the entire magazine is protected or whether the cover/landing page remains public and content is protected after registration.

## Sprint v3 planning requirements

Create:

- `sprints/v3/PRD.md`
- `sprints/v3/TASKS.md`
- `sprints/v3/WALKTHROUGH.md`

The PRD should separate the work into two coordinated groups:

1. Publication updates: revised Secretary's Desk, approved Siddhartha Mukhopadhyay story, Eframe wording and advertisement-page backgrounds.
2. Application feature: visitor registration, database, access control, administrator dashboard and CSV export.

The PRD must include schema design, validation rules, privacy requirements, threat checks, migration/deployment steps, rollback, automated tests and live browser verification. `/prd` should convert the approved PRD into atomic tasks. `/dev` should run only after TASKS.md approval. `/walkthrough` should verify the completed V3 release before public deployment.

## Decisions required during PRD preparation

1. Should the public see the cover and introduction before registration, or only a login/registration page?
2. Is a visitor-created password genuinely required, or is one-time registration plus a session sufficient?
3. Which departments/branches should appear in the alumni dropdown?
4. What is the permitted batch-year range?
5. Is the mobile number mandatory for sponsor/guest visitors or optional?
6. What privacy-notice wording and data-retention period are approved?
7. Which managed database and authentication approach will be used on Vercel?
8. Confirm the final administrator username. The password must be supplied through a secure environment variable, not written in PRD.md or TASKS.md.

## Recommended immediate sequence

1. Inspect the current repository and recover the completed Sprint v2 state after the EC2 reboot.
2. Verify that `V2_REVIEW_01`, its PDF and `sprints/v2/WALKTHROUGH.md` are intact.
3. Inventory the two revised/approved DOCX files and match them to existing tracker IDs.
4. Prepare `sprints/v3/PRD.md` using this change summary.
5. Resolve the eight decisions above.
6. Run `/prd`, review TASKS.md, then authorize `/dev`.
7. Generate `V3_REVIEW_01`, run `/walkthrough`, and deploy only after approval.
